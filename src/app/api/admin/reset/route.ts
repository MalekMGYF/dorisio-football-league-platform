import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  announcements,
  awards,
  leagues,
  matchEvents,
  matchLineups,
  matches,
  notifications,
  players,
  ratings,
  teams,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ApiError, jsonError, ok, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Reset competition content while preserving user accounts and admin access. */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<{ confirm?: unknown }>(request);
    if (body.confirm !== "RESET-DORISIO") {
      throw new ApiError(
        'للتأكيد أرسل العبارة RESET-DORISIO. سيتم حذف بيانات الدوري فقط مع إبقاء الحسابات.',
        "reset_confirmation_required",
        400,
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(matchEvents);
      await tx.delete(matchLineups);
      await tx.delete(ratings);
      await tx.delete(matches);
      await tx.delete(awards);
      await tx.delete(announcements);
      await tx.delete(notifications);
      await tx.delete(players);
      await tx.delete(teams);
      await tx.delete(leagues);
      await tx.update(users).set({ teamId: null, leagueId: null, updatedAt: new Date() });
    });

    return ok({
      ok: true,
      message: "تم تصفير بيانات الدوري بالكامل مع الاحتفاظ بحسابات المستخدمين.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
