import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, matchEvents, players, ratings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ApiError, jsonError, ok, readJson, requireUuid } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Ratings are open only after a match is FINAL, only for players who actually
 * took part in that match, one rating per (user, match, player), upsertable
 * within the same window but never deletable by another user.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const rows = await db.select().from(ratings).where(eq(ratings.matchId, id));
    const aggregates = new Map<string, { total: number; count: number }>();
    for (const row of rows) {
      const current = aggregates.get(row.playerId) ?? { total: 0, count: 0 };
      current.total += row.value;
      current.count += 1;
      aggregates.set(row.playerId, current);
    }
    return ok({
      ratings: Array.from(aggregates.entries()).map(([playerId, value]) => ({
        playerId,
        average: value.total / value.count,
        count: value.count,
        myValue: rows.find((r) => r.playerId === playerId && r.userId === user.id)?.value ?? null,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id: matchId } = await context.params;
    const body = await readJson<{ playerId?: unknown; value?: unknown }>(request);
    const playerId = requireUuid(body.playerId, "اللاعب");
    const value = Number(body.value);
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      throw new ApiError("التقييم يجب أن يكون رقماً صحيحاً بين 1 و 10.", "invalid_field");
    }

    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) throw new ApiError("المباراة غير موجودة.", "not_found", 404);
    if (match.status !== "ft") {
      throw new ApiError("التقييم متاح فقط بعد انتهاء المباراة.", "match_not_final");
    }

    const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
    if (!player) throw new ApiError("اللاعب غير موجود.", "not_found", 404);
    if (player.teamId !== match.homeTeamId && player.teamId !== match.awayTeamId) {
      throw new ApiError("هذا اللاعب لم يشارك في هذه المباراة.", "ineligible_player");
    }

    const participation = await db
      .select()
      .from(matchEvents)
      .where(and(eq(matchEvents.matchId, matchId), eq(matchEvents.playerId, playerId)))
      .limit(1);
    const inLineup = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);
    if (participation.length === 0 && inLineup.length === 0) {
      throw new ApiError("هذا اللاعب غير مؤهل للتقييم في هذه المباراة.", "ineligible_player");
    }

    const existing = await db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.matchId, matchId),
          eq(ratings.playerId, playerId),
          eq(ratings.userId, user.id),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(ratings)
        .set({ value, updatedAt: new Date() })
        .where(eq(ratings.id, existing[0].id));
    } else {
      await db.insert(ratings).values({ matchId, playerId, userId: user.id, value });
    }

    const rows = await db.select().from(ratings).where(eq(ratings.matchId, matchId));
    const forPlayer = rows.filter((r) => r.playerId === playerId);
    return ok({
      ok: true,
      updated: Boolean(existing[0]),
      rating: {
        playerId,
        average: forPlayer.reduce((a, b) => a + b.value, 0) / forPlayer.length,
        count: forPlayer.length,
        myValue: value,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
