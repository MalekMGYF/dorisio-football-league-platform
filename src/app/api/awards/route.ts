import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { awards, players, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { AWARD_TYPES } from "@/lib/domain";
import { ApiError, jsonError, ok, optionalString, readJson, requireUuid, requiredString } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const leagueId = request.nextUrl.searchParams.get("leagueId");
    const rows = leagueId
      ? await db
          .select()
          .from(awards)
          .where(eq(awards.leagueId, leagueId))
          .orderBy(desc(awards.createdAt))
      : await db.select().from(awards).orderBy(desc(awards.createdAt));

    const playerIds = rows.map((r) => r.playerId).filter(Boolean) as string[];
    const teamIds = rows.map((r) => r.teamId).filter(Boolean) as string[];
    const playerRows = playerIds.length ? await db.select().from(players) : [];
    const teamRows = teamIds.length ? await db.select().from(teams) : [];

    return ok({
      awards: rows.map((award) => ({
        ...award,
        player: playerRows.find((p) => p.id === award.playerId) ?? null,
        team: teamRows.find((t) => t.id === award.teamId) ?? null,
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
    const type = requiredString(body.type, "نوع الجائزة", 40);
    if (!AWARD_TYPES.some((a) => a.value === type)) {
      throw new ApiError("نوع الجائزة غير صحيح.", "invalid_field");
    }
    const inserted = await db
      .insert(awards)
      .values({
        leagueId: requireUuid(body.leagueId, "الدوري"),
        season: requiredString(body.season, "الموسم", 40),
        type,
        playerId: optionalString(body.playerId, "اللاعب", 60),
        teamId: optionalString(body.teamId, "الفريق", 60),
        label: optionalString(body.label, "العنوان", 120),
        reason: optionalString(body.reason, "السبب", 300),
        weekLabel: optionalString(body.weekLabel, "الجولة", 60),
        createdBy: admin.id,
      })
      .returning();
    return ok({ ok: true, award: inserted[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError("المعرّف مطلوب.", "invalid_field");
    await db.delete(awards).where(eq(awards.id, id));
    return ok({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
