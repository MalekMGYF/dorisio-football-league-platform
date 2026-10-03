import { NextRequest } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { players, teams, matches } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ApiError, jsonError, ok, optionalString, readJson, requiredString, requireUuid } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const leagueId = request.nextUrl.searchParams.get("leagueId");
    const teamRows = leagueId
      ? await db.select().from(teams).where(eq(teams.leagueId, leagueId)).orderBy(asc(teams.name))
      : await db.select().from(teams).orderBy(asc(teams.name));
    const ids = teamRows.map((t) => t.id);
    const squad = ids.length ? await db.select().from(players).where(inArray(players.teamId, ids)) : [];
    return ok({
      teams: teamRows.map((team) => ({
        ...team,
        players: squad.filter((p) => p.teamId === team.id),
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
    const leagueId = requireUuid(body.leagueId, "الدوري");
    const name = requiredString(body.name, "اسم الفريق", 120);

    const inserted = await db
      .insert(teams)
      .values({
        leagueId,
        name,
        shortName: optionalString(body.shortName, "الاسم المختصر", 12),
        logoUrl: optionalString(body.logoUrl, "الشعار", 1000),
        primaryColor: optionalString(body.primaryColor, "اللون الأساسي", 20) ?? "#0F7A46",
        secondaryColor: optionalString(body.secondaryColor, "اللون الثانوي", 20) ?? "#E8C766",
      })
      .returning();

    void admin;
    return ok({ ok: true, team: inserted[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<Record<string, unknown>>(request);
    const id = requireUuid(body.id, "الفريق");
    const patch: Partial<typeof teams.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = requiredString(body.name, "اسم الفريق", 120);
    if (body.shortName !== undefined) patch.shortName = optionalString(body.shortName, "الاسم المختصر", 12);
    if (body.logoUrl !== undefined) patch.logoUrl = optionalString(body.logoUrl, "الشعار", 1000);
    if (body.primaryColor !== undefined)
      patch.primaryColor = optionalString(body.primaryColor, "اللون الأساسي", 20) ?? "#0F7A46";
    if (body.secondaryColor !== undefined)
      patch.secondaryColor = optionalString(body.secondaryColor, "اللون الثانوي", 20) ?? "#E8C766";
    if (body.captainId !== undefined) patch.captainId = optionalString(body.captainId, "القائد", 60);

    const updated = await db.update(teams).set(patch).where(eq(teams.id, id)).returning();
    if (!updated[0]) throw new ApiError("الفريق غير موجود.", "not_found", 404);
    return ok({ ok: true, team: updated[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError("المعرّف مطلوب.", "invalid_field");
    const used = await db.select().from(matches).where(eq(matches.homeTeamId, id)).limit(1);
    if (used.length) {
      throw new ApiError(
        "لا يمكن حذف فريق لديه مباريات مسجّلة. احذف مبارياته أولاً أو احتفظ بالسجل التاريخي.",
        "team_in_use",
        409,
      );
    }
    await db.delete(players).where(eq(players.teamId, id));
    await db.delete(teams).where(eq(teams.id, id));
    return ok({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
