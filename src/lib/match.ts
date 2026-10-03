import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leagues,
  matches,
  matchEvents,
  matchLineups,
  players,
  ratings,
  teams,
  type Match,
  type MatchEvent,
  type Player,
  type Team,
} from "@/db/schema";
import { computePlayerStats, computeStandings, teamForm, type PlayerStat } from "@/lib/league";
import type { MatchBundle, PlayerWithStats, TeamWithStats } from "@/lib/types";

/**
 * Recomputes a match score from its authoritative event list.
 * Goals are never incremented in place, so deleting/correcting an event can
 * never leave a stale or negative score. Idempotent by construction.
 */
export async function recomputeMatch(matchId: string): Promise<void> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) return;
  const events = await db.select().from(matchEvents).where(eq(matchEvents.matchId, matchId));

  let homeScore = 0;
  let awayScore = 0;
  for (const event of events) {
    if (event.type === "goal") {
      if (event.teamId === match.homeTeamId) homeScore += 1;
      else if (event.teamId === match.awayTeamId) awayScore += 1;
    } else if (event.type === "own_goal") {
      // the own goal is credited to the opponent of the event team
      if (event.teamId === match.homeTeamId) awayScore += 1;
      else if (event.teamId === match.awayTeamId) homeScore += 1;
    }
  }

  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      revision: match.revision + 1,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

export async function bumpRevision(matchId: string): Promise<void> {
  await db
    .update(matches)
    .set({ revision: sql`${matches.revision} + 1`, updatedAt: new Date() })
    .where(eq(matches.id, matchId));
}

export async function loadCompetition(leagueId?: string | null) {
  const leagueRows = leagueId
    ? await db.select().from(leagues).where(eq(leagues.id, leagueId))
    : await db.select().from(leagues).orderBy(desc(leagues.isCurrent), desc(leagues.createdAt));
  const league = leagueRows[0] ?? null;

  const teamRows = league
    ? await db.select().from(teams).where(eq(teams.leagueId, league.id)).orderBy(asc(teams.name))
    : [];
  const matchRows = league
    ? await db
        .select()
        .from(matches)
        .where(eq(matches.leagueId, league.id))
        .orderBy(asc(matches.kickoffAt))
    : [];
  const playerRows = league
    ? await db.select().from(players).where(eq(players.leagueId, league.id))
    : [];

  return { league, leagues: leagueRows, teams: teamRows, matches: matchRows, players: playerRows };
}

export function buildTeamStats(
  teamRows: Team[],
  matchRows: Match[],
  playerRows: Player[],
): TeamWithStats[] {
  const standings = computeStandings(teamRows, matchRows);
  return teamRows.map((team) => ({
    ...team,
    stats: standings.find((s) => s.teamId === team.id) ?? null,
    form: teamForm(matchRows, team.id),
    squadCount: playerRows.filter((p) => p.teamId === team.id).length,
  }));
}

export function buildPlayerStats(
  playerRows: Player[],
  eventRows: MatchEvent[],
  matchRows: Match[],
  ratingRows: { playerId: string; value: number }[],
): Map<string, PlayerStat> {
  return computePlayerStats(playerRows, eventRows, matchRows, ratingRows as never);
}

export async function loadEvents(leagueId: string | null): Promise<MatchEvent[]> {
  if (!leagueId) return [];
  const matchRows = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.leagueId, leagueId));
  const ids = matchRows.map((m) => m.id);
  if (ids.length === 0) return [];
  return db.select().from(matchEvents).where(inArray(matchEvents.matchId, ids));
}

export async function decoratePlayers(
  playerRows: Player[],
  eventRows: MatchEvent[],
  matchRows: Match[],
  ratingRows: { playerId: string; value: number }[],
  teamRows: Team[],
  leagueName: string | null,
): Promise<PlayerWithStats[]> {
  const stats = buildPlayerStats(playerRows, eventRows, matchRows, ratingRows);
  return playerRows.map((player) => {
    const team = teamRows.find((t) => t.id === player.teamId) ?? null;
    return {
      ...player,
      stats:
        stats.get(player.id) ??
        {
          playerId: player.id,
          goals: 0,
          ownGoals: 0,
          assists: 0,
          yellow: 0,
          red: 0,
          appearances: 0,
          minutes: 0,
          motm: 0,
          ratingCount: 0,
          ratingAvg: null,
        },
      teamName: team?.name ?? null,
      teamShortName: team?.shortName ?? null,
      teamPrimaryColor: team?.primaryColor ?? null,
      teamSecondaryColor: team?.secondaryColor ?? null,
      leagueName,
    };
  });
}

export async function getMatchBundle(matchId: string, userId?: string | null): Promise<MatchBundle> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) throw new Error("match_not_found");

  const [homeTeam] = await db.select().from(teams).where(eq(teams.id, match.homeTeamId)).limit(1);
  const [awayTeam] = await db.select().from(teams).where(eq(teams.id, match.awayTeamId)).limit(1);
  const [league] = await db.select().from(leagues).where(eq(leagues.id, match.leagueId)).limit(1);

  const eventRows = await db
    .select()
    .from(matchEvents)
    .where(eq(matchEvents.matchId, matchId))
    .orderBy(desc(matchEvents.minute), desc(matchEvents.createdAt));

  const lineupRows = await db
    .select({
      id: matchLineups.id,
      matchId: matchLineups.matchId,
      teamId: matchLineups.teamId,
      playerId: matchLineups.playerId,
      isStarting: matchLineups.isStarting,
      position: matchLineups.position,
      sortIndex: matchLineups.sortIndex,
      player: players,
    })
    .from(matchLineups)
    .leftJoin(players, eq(players.id, matchLineups.playerId))
    .where(eq(matchLineups.matchId, matchId))
    .orderBy(asc(matchLineups.sortIndex));

  const squad = await db
    .select()
    .from(players)
    .where(
      inArray(players.teamId, [match.homeTeamId, match.awayTeamId].filter(Boolean) as string[]),
    );

  const matchRatings = await db
    .select({
      playerId: ratings.playerId,
      value: ratings.value,
      userId: ratings.userId,
    })
    .from(ratings)
    .where(eq(ratings.matchId, matchId));

  const aggregates = new Map<string, { total: number; count: number }>();
  for (const row of matchRatings) {
    const current = aggregates.get(row.playerId) ?? { total: 0, count: 0 };
    current.total += row.value;
    current.count += 1;
    aggregates.set(row.playerId, current);
  }
  const ratingSummary = Array.from(aggregates.entries()).map(([playerId, value]) => ({
    playerId,
    average: value.total / value.count,
    count: value.count,
    myValue:
      (userId ? matchRatings.find((r) => r.playerId === playerId && r.userId === userId)?.value : null) ??
      null,
  }));

  const events = await loadEvents(match.leagueId);
  const matchRows = await db.select().from(matches).where(eq(matches.leagueId, match.leagueId));
  const decorated = await decoratePlayers(
    squad,
    events,
    matchRows,
    matchRatings,
    [homeTeam, awayTeam].filter(Boolean) as Team[],
    league?.name ?? null,
  );

  return {
    match,
    homeTeam: homeTeam ?? null,
    awayTeam: awayTeam ?? null,
    events: eventRows,
    lineups: lineupRows.map((row) => ({
      id: row.id,
      matchId: row.matchId,
      teamId: row.teamId,
      playerId: row.playerId,
      isStarting: row.isStarting,
      position: row.position,
      sortIndex: row.sortIndex,
      player: row.player,
    })),
    players: decorated,
    league: league ?? null,
    ratings: ratingSummary,
    serverTime: new Date().toISOString(),
  };
}

export const EVENT_MUTATION_GUARD = {
  /** Events cannot be added once a match is finished unless corrected by admin. */
  allowedStatuses: ["scheduled", "live", "ht"] as const,
};

export async function assertMatchOpen(match: Match): Promise<void> {
  if (match.status === "ft") {
    const error = new Error("match_closed") as Error & { code: string };
    error.code = "match_closed";
    throw error;
  }
}

export async function listMatchIdsForLeague(leagueId: string): Promise<string[]> {
  const rows = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.leagueId, leagueId));
  return rows.map((r) => r.id);
}

export async function getTeamPair(homeTeamId: string, awayTeamId: string) {
  const rows = await db
    .select()
    .from(teams)
    .where(and(inArray(teams.id, [homeTeamId, awayTeamId])));
  return rows;
}
