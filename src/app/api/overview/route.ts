import { NextRequest } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { announcements, awards, players as playersTable, ratings, teams } from "@/db/schema";
import { computeStandings } from "@/lib/league";
import { jsonError, ok } from "@/lib/http";
import {
  buildTeamStats,
  decoratePlayers,
  loadCompetition,
  loadEvents,
} from "@/lib/match";
import type { MatchCardData, OverviewPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const leagueId = request.nextUrl.searchParams.get("leagueId") ?? undefined;
    const { league, leagues: leagueRows, teams: teamRows, matches: matchRows, players: playerRows } =
      await loadCompetition(leagueId);

    const eventRows = await loadEvents(league?.id ?? null);
    const matchIds = matchRows.map((m) => m.id);
    const ratingRows = matchIds.length
      ? await db
          .select({ playerId: ratings.playerId, value: ratings.value })
          .from(ratings)
          .where(inArray(ratings.matchId, matchIds))
      : [];

    const decoratedPlayers = await decoratePlayers(
      playerRows,
      eventRows,
      matchRows,
      ratingRows,
      teamRows,
      league?.name ?? null,
    );

    const teamById = new Map(teamRows.map((t) => [t.id, t]));
    const decoratedMatches: MatchCardData[] = matchRows
      .map((match) => ({
        ...match,
        homeTeam: teamById.get(match.homeTeamId) ?? null,
        awayTeam: teamById.get(match.awayTeamId) ?? null,
        events: eventRows.filter((e) => e.matchId === match.id),
      }))
      .sort((a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime());

    const now = Date.now();
    const liveMatch =
      decoratedMatches.find((m) => m.status === "live" || m.status === "ht") ?? null;
    const nextMatch =
      decoratedMatches
        .filter((m) => m.status === "scheduled" && m.kickoffAt.getTime() >= now)
        .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())[0] ?? null;

    const standings = computeStandings(teamRows, matchRows);
    const scorerBoard = decoratedPlayers
      .filter((p) => p.stats.goals > 0)
      .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists)
      .slice(0, 8);
    const assistBoard = decoratedPlayers
      .filter((p) => p.stats.assists > 0)
      .sort((a, b) => b.stats.assists - a.stats.assists || b.stats.goals - a.stats.goals)
      .slice(0, 8);

    const awardRows = league
      ? await db
          .select()
          .from(awards)
          .where(eq(awards.leagueId, league.id))
          .orderBy(desc(awards.createdAt))
          .limit(40)
      : [];
    const awardPlayerIds = awardRows.map((a) => a.playerId).filter(Boolean) as string[];
    const awardTeamIds = awardRows.map((a) => a.teamId).filter(Boolean) as string[];
    const awardPlayers = awardPlayerIds.length
      ? await db.select().from(playersTable).where(inArray(playersTable.id, awardPlayerIds))
      : [];
    const awardTeams = awardTeamIds.length
      ? await db.select().from(teams).where(inArray(teams.id, awardTeamIds))
      : [];

    const decoratedAwards = awardRows.map((award) => ({
      ...award,
      player: awardPlayers.find((p) => p.id === award.playerId) ?? null,
      team: awardTeams.find((t) => t.id === award.teamId) ?? null,
    }));

    const playerOfWeek =
      decoratedAwards.find((a) => a.type === "player_of_week") ?? decoratedAwards[0] ?? null;

    const announcementRows = await db
      .select()
      .from(announcements)
      .where(eq(announcements.published, true))
      .orderBy(desc(announcements.createdAt))
      .limit(6);

    const payload: OverviewPayload = {
      league,
      leagues: leagueRows,
      teams: buildTeamStats(teamRows, matchRows, playerRows),
      players: decoratedPlayers,
      matches: decoratedMatches,
      liveMatch,
      nextMatch,
      standings,
      topScorers: scorerBoard,
      topAssists: assistBoard,
      playerOfWeek,
      awards: decoratedAwards,
      announcements: announcementRows.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        imageUrl: a.imageUrl,
        tag: a.tag,
        createdAt: a.createdAt.toISOString(),
      })),
      serverTime: new Date().toISOString(),
    };

    return ok(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
