import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ApiError, jsonError, ok, optionalInt, optionalString, readJson, requiredString } from "@/lib/http";
import { POSITIONS } from "@/lib/domain";

export async function GET() {
  try {
    const user = await requireUser();
    const inbox = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(notifications.createdAt)
      .limit(20);
    return ok({ user, notifications: inbox.reverse() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<Record<string, unknown>>(request);

    const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

    if (body.name !== undefined) patch.name = requiredString(body.name, "الاسم", 80);
    if (body.phone !== undefined) patch.phone = optionalString(body.phone, "رقم الهاتف", 30);
    if (body.photoUrl !== undefined) patch.photoUrl = optionalString(body.photoUrl, "الصورة", 1000);
    if (body.shirtNumber !== undefined) {
      patch.shirtNumber = optionalInt(body.shirtNumber, "رقم القميص", 1, 99);
    }
    if (body.position !== undefined) {
      const position = optionalString(body.position, "المركز", 10);
      if (position && !POSITIONS.includes(position as (typeof POSITIONS)[number])) {
        throw new ApiError("المركز المختار غير صحيح.", "invalid_field");
      }
      patch.position = position;
    }
    if (body.teamId !== undefined) {
      patch.teamId = optionalString(body.teamId, "الفريق", 60) ?? null;
    }
    if (Object.keys(patch).length <= 1) {
      throw new ApiError("لا توجد بيانات للتحديث.", "empty_patch");
    }

    // Role, email and provider are intentionally never accepted from the client.
    const updated = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, user.id))
      .returning({ id: users.id, name: users.name, photoUrl: users.photoUrl });

    return ok({ ok: true, user: updated[0] });
  } catch (error) {
    return jsonError(error);
  }
}
