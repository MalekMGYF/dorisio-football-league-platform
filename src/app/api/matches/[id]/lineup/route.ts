import { NextRequest } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matches, matchLineups, players, teams } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { POSITIONS } from "@/lib/domain";
import { ApiError, jsonError, ok, readJson, requireUuid } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const rows = await db
      .select({
        id: matchLineups.id,
        matchId: matchLineups.matchId,
        teamId: matchLineups.teamId,
        playerId: matchLineups.playerId,
        isStarting: matchLineups.isStarting,
        position: matchLineups.position,
        sortIndex: matchLineups.sortIndex,
        player: players,
        team: teams,
      })
      .from(matchLineups)
      .leftJoin(players, eq(players.id, matchLineups.playerId))
      .leftJoin(teams, eq(teams.id, matchLineups.teamId))
      .where(eq(matchLineups.matchId, id))
      .orderBy(asc(matchLineups.sortIndex));
    return ok({ lineups: rows });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Replaces a team's lineup for a match.
 * Each team has exactly four starters: GK, DEF, MID and FWD.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await readJson<{
      teamId?: unknown;
      formation?: unknown;
      entries?: unknown;
    }>(request);

    const teamId = requireUuid(body.teamId, "الفريق");
    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!match) throw new ApiError("المباراة غير موجودة.", "not_found", 404);
    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      throw new ApiError("الفريق ليس طرفاً في هذه المباراة.", "invalid_team");
    }
    if (!Array.isArray(body.entries)) {
      throw new ApiError("قائمة التشكيلة غير صحيحة.", "invalid_field");
    }

    const entries = body.entries as {
      playerId?: unknown;
      isStarting?: unknown;
      position?: unknown;
      sortIndex?: unknown;
    }[];
    const playerIds = entries.map((e) => String(e.playerId));
    if (new Set(playerIds).size !== playerIds.length) {
      throw new ApiError("لا يمكن تكرار اللاعب نفسه في التشكيلة.", "duplicate_player");
    }
    const starters = entries.filter((e) => e.isStarting !== false);
    if (entries.length !== 4 || starters.length !== 4) {
      throw new ApiError(
        "التشكيلة يجب أن تضم 4 لاعبين فقط: حارس ومدافع ووسط ومهاجم.",
        "invalid_lineup",
      );
    }
    const squad = playerIds.length
      ? await db.select().from(players).where(inArray(players.id, playerIds))
      : [];
    if (squad.length !== playerIds.length) {
      throw new ApiError("أحد اللاعبين المحددين غير موجود.", "not_found");
    }
    const invalid = squad.filter((p) => p.teamId !== teamId);
    if (invalid.length) {
      throw new ApiError(
        `اللاعب «${invalid[0].name}» لا ينتمي إلى هذا الفريق.`,
        "invalid_player",
      );
    }

    const positions = starters.map((entry) => String(entry.position ?? "").toUpperCase());
    const requiredPositions = ["GK", "DEF", "MID", "FWD"];
    if (
      requiredPositions.some(
        (position) => positions.filter((item) => item === position).length !== 1,
      )
    ) {
      throw new ApiError(
        "يجب اختيار لاعب واحد في كل مركز: حارس ومدافع ووسط ومهاجم.",
        "invalid_lineup",
      );
    }

    await db.delete(matchLineups).where(
      and(eq(matchLineups.matchId, id), eq(matchLineups.teamId, teamId)),
    );

    if (entries.length) {
      await db.insert(matchLineups).values(
        entries.map((entry, index) => {
          const position = String(entry.position ?? "MID").toUpperCase();
          return {
            matchId: id,
            teamId,
            playerId: String(entry.playerId),
            isStarting: entry.isStarting !== false,
            position: POSITIONS.includes(position as (typeof POSITIONS)[number])
              ? position
              : "MID",
            sortIndex: typeof entry.sortIndex === "number" ? entry.sortIndex : index,
          };
        }),
      );
    }

    const formation = "1-1-1-1";
    if (formation) {
      await db
        .update(matches)
        .set(
          teamId === match.homeTeamId
            ? { homeFormation: formation, updatedAt: new Date() }
            : { awayFormation: formation, updatedAt: new Date() },
        )
        .where(eq(matches.id, id));
    }

    return ok({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
