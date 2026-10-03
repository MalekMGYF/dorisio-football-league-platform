import { NextRequest } from "next/server";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leagues, matches, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { generateRoundRobin } from "@/lib/league";
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

function parseKickoff(value: unknown): Date {
  const raw = typeof value === "string" ? value : "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError("موعد المباراة غير صالح.", "invalid_field");
  }
  return date;
}

export async function GET(request: NextRequest) {
  try {
    const leagueId = request.nextUrl.searchParams.get("leagueId");
    const teamId = request.nextUrl.searchParams.get("teamId");
    const status = request.nextUrl.searchParams.get("status");
    const conditions = [];
    if (leagueId) conditions.push(eq(matches.leagueId, leagueId));
    if (status) conditions.push(eq(matches.status, status));
    const rows = await db
      .select()
      .from(matches)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(matches.kickoffAt));

    const filtered = teamId ? rows.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId) : rows;
    const teamIds = Array.from(new Set(filtered.flatMap((m) => [m.homeTeamId, m.awayTeamId])));
    const teamRows = teamIds.length ? await db.select().from(teams).where(inArray(teams.id, teamIds)) : [];
    const byId = new Map(teamRows.map((t) => [t.id, t]));

    return ok({
      matches: filtered.map((match) => ({
        ...match,
        homeTeam: byId.get(match.homeTeamId) ?? null,
        awayTeam: byId.get(match.awayTeamId) ?? null,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await readJson<Record<string, unknown>>(request);
    const mode = body.mode === "generate" ? "generate" : "manual";
    const leagueId = requireUuid(body.leagueId, "الدوري");
    const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
    if (!league) throw new ApiError("الدوري غير موجود.", "not_found", 404);

    if (mode === "manual") {
      const homeTeamId = requireUuid(body.homeTeamId, "الفريق المضيف");
      const awayTeamId = requireUuid(body.awayTeamId, "الفريق الضيف");
      if (homeTeamId === awayTeamId) {
        throw new ApiError("لا يمكن أن يلعب الفريق ضد نفسه.", "invalid_field");
      }
      const inserted = await db
        .insert(matches)
        .values({
          leagueId,
          homeTeamId,
          awayTeamId,
          kickoffAt: parseKickoff(body.kickoffAt),
          venue: optionalString(body.venue, "الملعب", 160) ?? league.venue,
          round: optionalInt(body.round, "الجولة", 1, 60) ?? 1,
          status: "scheduled",
          createdBy: admin.id,
        })
        .returning();
      return ok({ ok: true, match: inserted[0] });
    }

    // Automatic round-robin generation (supports odd counts with byes).
    const teamRows = await db.select().from(teams).where(eq(teams.leagueId, leagueId));
    if (teamRows.length < 2) {
      throw new ApiError("أضف فريقين على الأقل قبل توليد جدول المباريات.", "not_enough_teams");
    }
    const existing = await db.select().from(matches).where(eq(matches.leagueId, leagueId));
    const played = existing.some((m) => m.status === "ft" || m.status === "live");
    if (existing.length > 0 && body.replace !== true) {
      throw new ApiError(
        "يوجد جدول مباريات محفوظ لهذا الدوري. فعّل «استبدال الجدول» للمتابعة.",
        "fixtures_exist",
        409,
      );
    }
    if (played && body.replace === true) {
      throw new ApiError(
        "لا يمكن استبدال جدول لُعبت منه مباريات، حفاظاً على السجل التاريخي.",
        "fixtures_locked",
        409,
      );
    }
    if (existing.length > 0) {
      await db.delete(matches).where(eq(matches.leagueId, leagueId));
    }

    const baseDate = body.startDate ? parseKickoff(body.startDate) : new Date();
    const kickoffTime = typeof body.time === "string" ? body.time : "18:00";
    const [hours, minutes] = kickoffTime.split(":").map((n) => Number(n) || 0);
    const gapDays = optionalInt(body.gapDays, "الفترة بين الجولات", 2, 60) ?? 7;

    const fixtures = generateRoundRobin(teamRows.map((t) => t.id));
    const byId = new Map(teamRows.map((t) => [t.id, t]));
    const values = fixtures.map((fixture) => {
      const kickoff = new Date(baseDate);
      kickoff.setDate(kickoff.getDate() + (fixture.round - 1) * gapDays);
      kickoff.setHours(hours, minutes, 0, 0);
      return {
        leagueId,
        homeTeamId: fixture.home,
        awayTeamId: fixture.away,
        kickoffAt: kickoff,
        venue: optionalString(body.venue, "الملعب", 160) ?? league.venue,
        round: fixture.round,
        status: "scheduled",
        createdBy: admin.id,
      };
    });

    const inserted = values.length ? await db.insert(matches).values(values).returning() : [];
    return ok({
      ok: true,
      count: inserted.length,
      rounds: new Set(inserted.map((m) => m.round)).size,
      teams: byId.size,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const leagueId = request.nextUrl.searchParams.get("leagueId");
    if (!leagueId) throw new ApiError("المعرّف مطلوب.", "invalid_field");
    const played = await db
      .select()
      .from(matches)
      .where(and(eq(matches.leagueId, leagueId), gt(matches.revision, 0)))
      .limit(1);
    if (played.length) {
      throw new ApiError("لا يمكن حذف جدول لُعبت منه مباريات.", "fixtures_locked", 409);
    }
    await db.delete(matches).where(eq(matches.leagueId, leagueId));
    return ok({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
