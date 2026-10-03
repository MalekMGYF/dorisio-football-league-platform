import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  leagues,
  matches,
  matchEvents,
  players,
  teams,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { recomputeMatch } from "@/lib/match";
import { generateRoundRobin } from "@/lib/league";
import { jsonError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

const TEAM_SEED = [
  { name: "نسور المدرسة", short: "نسور", primary: "#0F7A46", secondary: "#E8C766" },
  { name: "صقور الحي", short: "صقور", primary: "#123B6D", secondary: "#F5F8F4" },
  { name: "أبطال الشاطئ", short: "شاطئ", primary: "#B3261E", secondary: "#E8C766" },
  { name: "رعد الشرق", short: "رعد", primary: "#1B2320", secondary: "#23C16B" },
  { name: "فرسان الغرب", short: "فرسان", primary: "#7A2E0F", secondary: "#E8C766" },
];

const FIRST_NAMES = [
  "محمد",
  "أحمد",
  "علي",
  "يوسف",
  "خالد",
  "عمر",
  "سالم",
  "طارق",
  "بدر",
  "فيصل",
  "ماجد",
  "ريان",
];
const LAST_NAMES = ["العتيبي", "الزهراني", "القحطاني", "الحربي", "الشمري", "المالكي", "الغامدي"];

/**
 * Development seed. Requires an authenticated admin AND explicit confirmation,
 * so it can never be triggered accidentally against production data.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await readJson<{ confirm?: unknown }>(request);
    if (body.confirm !== "SEED-DEV-ONLY") {
      return ok({
        ok: false,
        message:
          "التأكد مطلوب: أرسل { " + '"confirm": "SEED-DEV-ONLY"' + " } لتأكيد أنك تعمل على بيئة تطوير.",
      });
    }

    const existingLeagues = await db.select().from(leagues);
    const league =
      existingLeagues[0] ??
      (
        await db
          .insert(leagues)
          .values({
            name: "دوريسيو المدرسي",
            season: "2025 / 2026",
            description: "دوري المدارس والأصدقاء — نموذج بيانات تطوير.",
            venue: "الملعب البلدي",
            matchDuration: 30,
            status: "active",
            isCurrent: true,
            startDate: new Date().toISOString().slice(0, 10),
            createdBy: admin.id,
          })
          .returning()
      )[0];

    const existingTeams = await db.select().from(teams).where(eq(teams.leagueId, league.id));
    let teamRows = existingTeams;
    if (teamRows.length === 0) {
      teamRows = await db
        .insert(teams)
        .values(
          TEAM_SEED.map((t) => ({
            leagueId: league.id,
            name: t.name,
            shortName: t.short,
            primaryColor: t.primary,
            secondaryColor: t.secondary,
          })),
        )
        .returning();
    }

    const existingPlayers = await db.select().from(players).where(eq(players.leagueId, league.id));
    if (existingPlayers.length === 0) {
      const positions = ["GK", "DEF", "MID", "MID", "FWD", "FWD", "DEF", "MID", "FWD", "GK", "DEF"];
      const values = teamRows.flatMap((team, teamIndex) =>
        positions.map((position, index) => ({
          leagueId: league.id,
          teamId: team.id,
          name: `${FIRST_NAMES[(teamIndex * 3 + index) % FIRST_NAMES.length]} ${
            LAST_NAMES[(teamIndex + index) % LAST_NAMES.length]
          }`,
          shirtNumber: index + 1,
          position,
          isCaptain: index === 2,
        })),
      );
      await db.insert(players).values(values);
    }

    const existingMatches = await db.select().from(matches).where(eq(matches.leagueId, league.id));
    let createdMatches = existingMatches;
    if (createdMatches.length === 0) {
      const fixtures = generateRoundRobin(teamRows.map((t) => t.id));
      const start = new Date();
      createdMatches = await db
        .insert(matches)
        .values(
          fixtures.map((fixture, index) => ({
            leagueId: league.id,
            homeTeamId: fixture.home,
            awayTeamId: fixture.away,
            round: fixture.round,
            kickoffAt: new Date(start.getTime() + index * 3 * 24 * 3600 * 1000),
            venue: league.venue,
            status: "scheduled",
            createdBy: admin.id,
          })),
        )
        .returning();
    }

    // Play out the first two fixtures with sample events so the live centre,
    // standings and player stats all have real data to render.
    const played = createdMatches.slice(0, 2);
    for (const [index, match] of played.entries()) {
      const existingEvents = await db
        .select()
        .from(matchEvents)
        .where(eq(matchEvents.matchId, match.id));
      if (existingEvents.length > 0) continue;
      const squad = await db.select().from(players).where(eq(players.leagueId, league.id));
      const home = squad.filter((p) => p.teamId === match.homeTeamId);
      const away = squad.filter((p) => p.teamId === match.awayTeamId);
      const events = [
        {
          id: crypto.randomUUID(),
          matchId: match.id,
          minute: 3,
          type: "kickoff",
          teamId: match.homeTeamId,
          clientAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          matchId: match.id,
          minute: 7,
          type: "goal",
          teamId: match.homeTeamId,
          playerId: home[4]?.id ?? home[0]?.id,
          assistPlayerId: home[3]?.id ?? null,
          clientAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          matchId: match.id,
          minute: 12,
          type: "yellow",
          teamId: match.awayTeamId,
          playerId: away[1]?.id ?? away[0]?.id,
          clientAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          matchId: match.id,
          minute: 18,
          type: "goal",
          teamId: match.awayTeamId,
          playerId: away[5]?.id ?? away[1]?.id,
          assistPlayerId: away[4]?.id ?? null,
          clientAt: new Date(),
        },
      ];
      if (index === 0) {
        events.push({
          id: crypto.randomUUID(),
          matchId: match.id,
          minute: 26,
          type: "goal",
          teamId: match.homeTeamId,
          playerId: home[5]?.id ?? home[1]?.id,
          assistPlayerId: home[2]?.id ?? null,
          clientAt: new Date(),
        } as never);
      }
      await db.insert(matchEvents).values(events.filter((e) => e.playerId));
      await db
        .update(matches)
        .set({
          status: index === 0 ? "live" : "ft",
          phase: index === 0 ? "2H" : "FT",
          minute: index === 0 ? 26 : 30,
          timerRunning: index === 0,
          timerStartedAt: index === 0 ? new Date() : null,
          timerElapsedMs: index === 0 ? 26 * 60000 : 30 * 60000,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, match.id));
      await recomputeMatch(match.id);
    }

    await db.insert(announcements).values({
      title: "انطلاق دوريسيو المدرسي",
      body: "استعداداً لانطلاق الجولة الأولى، تم إصدار جدول المباريات وتسجيل الفرق المشاركة.",
      tag: "مباراة اليوم",
    });

    return ok({ ok: true, message: "تم تجهيز بيانات التطوير بنجاح." });
  } catch (error) {
    return jsonError(error);
  }
}
