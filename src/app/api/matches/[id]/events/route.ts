import { NextRequest } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, matchEvents, players } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { EVENT_TYPE_AR } from "@/lib/domain";
import { recomputeMatch } from "@/lib/match";
import {
  ApiError,
  jsonError,
  ok,
  optionalInt,
  optionalString,
  readJson,
  requireUuid,
} from "@/lib/http";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set([
  "goal",
  "own_goal",
  "assist",
  "yellow",
  "red",
  "substitution",
  "kickoff",
  "ht",
  "ft",
  "note",
]);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const events = await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, id))
      .orderBy(desc(matchEvents.minute), desc(matchEvents.createdAt));
    return ok({ events });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Creates a match event.
 * `id` is client-generated so retries / offline sync are idempotent:
 * the insert is a no-op when the id already exists (ON CONFLICT DO NOTHING),
 * and scores are always *recomputed* from the event list rather than incremented.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id: matchId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);

    const eventId = typeof body.id === "string" && body.id.length >= 8 ? body.id : crypto.randomUUID();
    const type = typeof body.type === "string" ? body.type : "";
    if (!VALID_TYPES.has(type)) {
      throw new ApiError("نوع الحدث غير صحيح.", "invalid_event_type");
    }

    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) throw new ApiError("المباراة غير موجودة.", "not_found", 404);

    const clientAt = body.clientAt ? new Date(String(body.clientAt)) : new Date();
    const minute = optionalInt(body.minute, "الدقيقة", 0, 130) ?? match.minute ?? 0;

    const teamId = optionalString(body.teamId, "الفريق", 60);
    const playerId = optionalString(body.playerId, "اللاعب", 60);
    const assistPlayerId = optionalString(body.assistPlayerId, "صانع الهدف", 60);
    const playerInId = optionalString(body.playerInId, "اللاعب الداخل", 60);
    const playerOutId = optionalString(body.playerOutId, "اللاعب الخارج", 60);

    const resolvedTeamId =
      teamId || playerId ? await resolveTeam(playerId, teamId, match) : null;

    // Player/team consistency: the player must belong to one of the two teams.
    if (playerId) await assertPlayerInMatch(playerId, match);
    if (assistPlayerId) await assertPlayerInMatch(assistPlayerId, match);
    if (playerInId) await assertPlayerInMatch(playerInId, match);
    if (playerOutId) await assertPlayerInMatch(playerOutId, match);

    const inserted = await db
      .insert(matchEvents)
      .values({
        id: eventId,
        matchId,
        minute,
        type,
        teamId: resolvedTeamId,
        playerId,
        assistPlayerId,
        playerInId,
        playerOutId,
        note: optionalString(body.note, "ملاحظة", 200),
        clientAt: Number.isNaN(clientAt.getTime()) ? new Date() : clientAt,
        createdById: admin.id,
      })
      .onConflictDoNothing()
      .returning();

    const duplicated = inserted.length === 0;
    if (!duplicated && (type === "goal" || type === "own_goal")) {
      await recomputeMatch(matchId);
    } else {
      await db
        .update(matches)
        .set({ revision: sql`${matches.revision} + 1`, updatedAt: new Date() })
        .where(eq(matches.id, matchId));
    }

    const events = await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, matchId))
      .orderBy(desc(matchEvents.minute), desc(matchEvents.createdAt));
    const [fresh] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);

    return ok(
      {
        ok: true,
        duplicated,
        event: inserted[0] ?? events.find((e) => e.id === eventId) ?? null,
        events,
        match: fresh,
        message: duplicated
          ? "هذا الحدث مسجّل مسبقاً — تم تجاهل الطلب لمنع التكرار."
          : `تم تسجيل: ${EVENT_TYPE_AR[type] ?? type}`,
      },
      { status: duplicated ? 200 : 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

async function resolveTeam(
  playerId: string | null,
  teamId: string | null,
  match: { homeTeamId: string; awayTeamId: string },
): Promise<string | null> {
  if (teamId) {
    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      throw new ApiError("الفريق المختار ليس طرفاً في هذه المباراة.", "invalid_team");
    }
    return teamId;
  }
  if (!playerId) return null;
  const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  if (!player) throw new ApiError("اللاعب غير موجود.", "not_found", 404);
  if (player.teamId !== match.homeTeamId && player.teamId !== match.awayTeamId) {
    throw new ApiError("اللاعب ليس في قائمة الفريقين المشاركين في المباراة.", "invalid_player");
  }
  return player.teamId;
}

async function assertPlayerInMatch(
  playerId: string,
  match: { homeTeamId: string; awayTeamId: string },
): Promise<void> {
  const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  if (!player) throw new ApiError("اللاعب غير موجود.", "not_found", 404);
  if (player.teamId !== match.homeTeamId && player.teamId !== match.awayTeamId) {
    throw new ApiError("اللاعب ليس في قائمة الفريقين المشاركين في المباراة.", "invalid_player");
  }
}
