import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, matchEvents, players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { recomputeMatch } from "@/lib/match";
import { ApiError, jsonError, ok, optionalInt, optionalString, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

async function load(matchId: string, eventId: string) {
  const [event] = await db
    .select()
    .from(matchEvents)
    .where(and(eq(matchEvents.id, eventId), eq(matchEvents.matchId, matchId)))
    .limit(1);
  return event ?? null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    await requireAdmin();
    const { id, eventId } = await context.params;
    const existing = await load(id, eventId);
    if (!existing) throw new ApiError("الحدث غير موجود.", "not_found", 404);

    const body = await readJson<Record<string, unknown>>(request);
    const patch: Partial<typeof matchEvents.$inferInsert> = { updatedAt: new Date() };
    if (body.minute !== undefined) patch.minute = optionalInt(body.minute, "الدقيقة", 0, 130) ?? 0;
    if (body.note !== undefined) patch.note = optionalString(body.note, "ملاحظة", 200);
    if (body.playerId !== undefined) patch.playerId = optionalString(body.playerId, "اللاعب", 60);
    if (body.assistPlayerId !== undefined)
      patch.assistPlayerId = optionalString(body.assistPlayerId, "صانع الهدف", 60);
    if (body.teamId !== undefined) patch.teamId = optionalString(body.teamId, "الفريق", 60);

    const updated = await db
      .update(matchEvents)
      .set(patch)
      .where(eq(matchEvents.id, eventId))
      .returning();

    await recomputeMatch(id);
    const events = await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, id))
      .orderBy(desc(matchEvents.minute), desc(matchEvents.createdAt));
    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);

    return ok({ ok: true, event: updated[0], events, match });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    await requireAdmin();
    const { id, eventId } = await context.params;
    const existing = await load(id, eventId);
    if (!existing) throw new ApiError("الحدث غير موجود.", "not_found", 404);

    await db.delete(matchEvents).where(eq(matchEvents.id, eventId));
    await recomputeMatch(id);

    const events = await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, id))
      .orderBy(desc(matchEvents.minute), desc(matchEvents.createdAt));
    const [match] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);

    return ok({
      ok: true,
      message: "تم حذف الحدث وإعادة احتساب النتيجة والإحصائيات.",
      events,
      match,
    });
  } catch (error) {
    return jsonError(error);
  }
}

