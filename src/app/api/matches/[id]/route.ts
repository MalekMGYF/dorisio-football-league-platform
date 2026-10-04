import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, matchEvents, matchLineups, ratings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getMatchBundle, recomputeMatch } from "@/lib/match";
import { ApiError, jsonError, ok, optionalInt, optionalString, readJson, requireUuid } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const bundle = await getMatchBundle(id);
    return ok(bundle, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "match_not_found") {
      return jsonError(new ApiError("المباراة غير موجودة.", "not_found", 404));
    }
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    const [current] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!current) throw new ApiError("المباراة غير موجودة.", "not_found", 404);

    const patch: Partial<typeof matches.$inferInsert> = { updatedAt: new Date() };
    let scoresChanged = false;

    if (body.homeTeamId !== undefined) {
      patch.homeTeamId = requireUuid(body.homeTeamId, "الفريق المضيف");
      scoresChanged = true;
    }
    if (body.awayTeamId !== undefined) {
      patch.awayTeamId = requireUuid(body.awayTeamId, "الفريق الضيف");
      scoresChanged = true;
    }
    if (body.kickoffAt !== undefined) {
      const date = new Date(String(body.kickoffAt));
      if (Number.isNaN(date.getTime())) throw new ApiError("موعد المباراة غير صالح.", "invalid_field");
      patch.kickoffAt = date;
    }
    if (body.venue !== undefined) patch.venue = optionalString(body.venue, "الملعب", 160);
    if (body.round !== undefined) patch.round = optionalInt(body.round, "الجولة", 1, 60) ?? 1;
    if (body.motmPlayerId !== undefined)
      patch.motmPlayerId = optionalString(body.motmPlayerId, "رجل المباراة", 60);
    if (body.homeFormation !== undefined)
      patch.homeFormation = optionalString(body.homeFormation, "الخطة", 20);
    if (body.awayFormation !== undefined)
      patch.awayFormation = optionalString(body.awayFormation, "الخطة", 20);

    // Status + timer transitions are computed from server time, never trusted
    // from the client clock beyond "which action was requested".
    const action = typeof body.action === "string" ? body.action : null;
    const now = new Date();
    if (action === "start") {
      patch.status = "live";
      patch.phase = "1H";
      patch.timerRunning = true;
      patch.timerStartedAt = now;
      patch.timerElapsedMs = 0;
    } else if (action === "pause") {
      patch.timerRunning = false;
      patch.timerElapsedMs =
        current.timerElapsedMs +
        (current.timerRunning && current.timerStartedAt
          ? now.getTime() - current.timerStartedAt.getTime()
          : 0);
    } else if (action === "resume") {
      patch.timerRunning = true;
      patch.timerStartedAt = now;
    } else if (action === "half") {
      patch.status = "ht";
      patch.phase = "HT";
      patch.timerRunning = false;
      patch.timerElapsedMs =
        current.timerElapsedMs +
        (current.timerRunning && current.timerStartedAt
          ? now.getTime() - current.timerStartedAt.getTime()
          : 0);
    } else if (action === "second_half") {
      patch.status = "live";
      patch.phase = "2H";
      patch.timerRunning = true;
      patch.timerStartedAt = now;
    } else if (action === "finish") {
      patch.status = "ft";
      patch.phase = "FT";
      patch.timerRunning = false;
      patch.timerElapsedMs =
        current.timerElapsedMs +
        (current.timerRunning && current.timerStartedAt
          ? now.getTime() - current.timerStartedAt.getTime()
          : 0);
    } else if (body.status !== undefined) {
      patch.status = String(body.status);
    }

    const updated = await db
      .update(matches)
      .set(patch)
      .where(eq(matches.id, id))
      .returning();

    if (scoresChanged) await recomputeMatch(id);

    return ok({ ok: true, match: updated[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const [current] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!current) throw new ApiError("المباراة غير موجودة.", "not_found", 404);
    if (current.status !== "scheduled" || current.revision > 0) {
      throw new ApiError(
        "لا يمكن حذف مباراة بدأت أو انتهت. الحذف متاح للمباراة القادمة فقط.",
        "match_locked",
        409,
      );
    }
    await db.delete(matchLineups).where(eq(matchLineups.matchId, id));
    await db.delete(matchEvents).where(eq(matchEvents.matchId, id));
    await db.delete(ratings).where(eq(ratings.matchId, id));
    await db.delete(matches).where(eq(matches.id, id));
    return ok({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
