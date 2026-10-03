import { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { players, type Player } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { POSITIONS } from "@/lib/domain";
import {
  ApiError,
  jsonError,
  ok,
  optionalInt,
  optionalString,
  readJson,
  requireUuid,
  requiredString,
} from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const leagueId = request.nextUrl.searchParams.get("leagueId");
    const teamId = request.nextUrl.searchParams.get("teamId");
    const conditions = [];
    if (leagueId) conditions.push(eq(players.leagueId, leagueId));
    if (teamId) conditions.push(eq(players.teamId, teamId));
    const rows = await db
      .select()
      .from(players)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(players.shirtNumber));
    return ok({ players: rows });
  } catch (error) {
    return jsonError(error);
  }
}

function normalizePosition(value: unknown): string {
  const position = typeof value === "string" ? value.toUpperCase() : "MID";
  if (!POSITIONS.includes(position as (typeof POSITIONS)[number])) {
    throw new ApiError("المركز المختار غير صحيح (GK / DEF / MID / FWD).", "invalid_field");
  }
  return position;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<Record<string, unknown>>(request);
    const values: typeof players.$inferInsert = {
      leagueId: requireUuid(body.leagueId, "الدوري"),
      teamId: requireUuid(body.teamId, "الفريق"),
      name: requiredString(body.name, "اسم اللاعب", 120),
      position: normalizePosition(body.position),
      photoUrl: optionalString(body.photoUrl, "الصورة", 1000),
      shirtNumber: optionalInt(body.shirtNumber, "رقم القميص", 1, 99),
      isCaptain: body.isCaptain === true,
      userId: optionalString(body.userId, "المستخدم", 60),
    };
    const inserted = await db.insert(players).values(values).returning();
    return ok({ ok: true, player: inserted[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<Record<string, unknown>>(request);
    const id = requireUuid(body.id, "اللاعب");
    const patch: Partial<Player> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = requiredString(body.name, "اسم اللاعب", 120);
    if (body.position !== undefined) patch.position = normalizePosition(body.position);
    if (body.photoUrl !== undefined) patch.photoUrl = optionalString(body.photoUrl, "الصورة", 1000);
    if (body.shirtNumber !== undefined)
      patch.shirtNumber = optionalInt(body.shirtNumber, "رقم القميص", 1, 99);
    if (body.isCaptain !== undefined) patch.isCaptain = body.isCaptain === true;
    if (body.teamId !== undefined) patch.teamId = requireUuid(body.teamId, "الفريق");

    const updated = await db.update(players).set(patch).where(eq(players.id, id)).returning();
    if (!updated[0]) throw new ApiError("اللاعب غير موجود.", "not_found", 404);
    return ok({ ok: true, player: updated[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError("المعرّف مطلوب.", "invalid_field");
    await db.delete(players).where(eq(players.id, id));
    return ok({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
