import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues, matches, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ApiError, jsonError, ok, optionalString, readJson, requiredString } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(leagues).orderBy(desc(leagues.createdAt));
    const teamRows = await db.select().from(teams);
    const matchRows = await db.select().from(matches);
    return ok({
      leagues: rows.map((league) => ({
        ...league,
        teamCount: teamRows.filter((t) => t.leagueId === league.id).length,
        matchCount: matchRows.filter((m) => m.leagueId === league.id).length,
        champion:
          teamRows.find((t) => t.id === league.championTeamId)?.name ?? null,
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
    const name = requiredString(body.name, "اسم الدوري", 120);
    const season = requiredString(body.season, "الموسم", 40);

    if (body.isCurrent !== false) {
      await db.update(leagues).set({ isCurrent: false }).where(eq(leagues.isCurrent, true));
    }

    const inserted = await db
      .insert(leagues)
      .values({
        name,
        season,
        description: optionalString(body.description, "الوصف", 1000),
        logoUrl: optionalString(body.logoUrl, "الشعار", 1000),
        startDate: optionalString(body.startDate, "تاريخ البداية", 20),
        endDate: optionalString(body.endDate, "تاريخ النهاية", 20),
        matchDuration:
          typeof body.matchDuration === "number" && body.matchDuration > 0
            ? Math.round(body.matchDuration)
            : 30,
        venue: optionalString(body.venue, "الملعب", 160),
        status: typeof body.status === "string" ? body.status : "upcoming",
        isCurrent: body.isCurrent !== false,
        createdBy: admin.id,
      })
      .returning();

    return ok({ ok: true, league: inserted[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<Record<string, unknown>>(request);
    const id = requiredString(body.id, "المعرّف", 60);
    const patch: Partial<typeof leagues.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = requiredString(body.name, "اسم الدوري", 120);
    if (body.season !== undefined) patch.season = requiredString(body.season, "الموسم", 40);
    if (body.description !== undefined)
      patch.description = optionalString(body.description, "الوصف", 1000);
    if (body.status !== undefined) patch.status = requiredString(body.status, "الحالة", 20);
    if (body.championTeamId !== undefined)
      patch.championTeamId = optionalString(body.championTeamId, "الفريق البطل", 60);
    if (body.venue !== undefined) patch.venue = optionalString(body.venue, "الملعب", 160);
    if (body.matchDuration !== undefined && typeof body.matchDuration === "number") {
      patch.matchDuration = Math.round(body.matchDuration);
    }
    const updated = await db.update(leagues).set(patch).where(eq(leagues.id, id)).returning();
    if (!updated[0]) throw new ApiError("الدوري غير موجود.", "not_found", 404);
    return ok({ ok: true, league: updated[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError("المعرّف مطلوب.", "invalid_field");
    await db.delete(leagues).where(eq(leagues.id, id));
    return ok({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
