import { NextRequest } from "next/server";
import { desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications, pushSubscriptions } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { ApiError, jsonError, ok, optionalString, readJson, requiredString } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(notifications)
      .where(or(eq(notifications.userId, user.id), isNull(notifications.userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(30);
    return ok({ notifications: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<Record<string, unknown>>(request);
    const action = typeof body.action === "string" ? body.action : "read";

    if (action === "read") {
      const id = optionalString(body.id, "المعرّف", 60);
      if (id) {
        await db
          .update(notifications)
          .set({ read: true })
          .where(eq(notifications.id, id));
      } else {
        await db
          .update(notifications)
          .set({ read: true })
          .where(eq(notifications.userId, user.id));
      }
      return ok({ ok: true });
    }

    if (action === "subscribe") {
      const endpoint = requiredString(body.endpoint, "endpoint", 1000);
      const keys = body.keys as { p256dh?: unknown; auth?: unknown } | undefined;
      const p256dh = requiredString(keys?.p256dh, "p256dh", 300);
      const auth = requiredString(keys?.auth, "auth", 300);
      await db
        .insert(pushSubscriptions)
        .values({ userId: user.id, endpoint, p256dh, auth })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: { p256dh, auth, userId: user.id },
        });
      return ok({ ok: true });
    }

    if (action === "unsubscribe") {
      const endpoint = optionalString(body.endpoint, "endpoint", 1000);
      if (endpoint) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      }
      return ok({ ok: true });
    }

    throw new ApiError("إجراء غير معروف.", "invalid_field");
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await readJson<Record<string, unknown>>(request);
    const inserted = await db
      .insert(notifications)
      .values({
        userId: optionalString(body.userId, "المستخدم", 60),
        title: requiredString(body.title, "العنوان", 160),
        body: requiredString(body.body, "النص", 600),
        type: optionalString(body.type, "النوع", 30) ?? "info",
        linkUrl: optionalString(body.linkUrl, "الرابط", 300),
      })
      .returning();
    void admin;
    return ok({ ok: true, notification: inserted[0] });
  } catch (error) {
    return jsonError(error);
  }
}
