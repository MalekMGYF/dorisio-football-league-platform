import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { ApiError, jsonError, ok, optionalString, readJson, requiredString } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const all = request.nextUrl.searchParams.get("all") === "true";
    if (all) await requireUser();
    const rows = all
      ? await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(50)
      : await db
          .select()
          .from(announcements)
          .where(eq(announcements.published, true))
          .orderBy(desc(announcements.createdAt))
          .limit(50);
    return ok({ announcements: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await readJson<Record<string, unknown>>(request);
    const inserted = await db
      .insert(announcements)
      .values({
        title: requiredString(body.title, "العنوان", 160),
        body: requiredString(body.body, "النص", 2000),
        imageUrl: optionalString(body.imageUrl, "الصورة", 1000),
        tag: optionalString(body.tag, "التصنيف", 40) ?? "خبر",
        published: body.published !== false,
        createdById: admin.id,
      })
      .returning();
    return ok({ ok: true, announcement: inserted[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<Record<string, unknown>>(request);
    const id = requiredString(body.id, "المعرّف", 60);
    const patch: Partial<typeof announcements.$inferInsert> = { updatedAt: new Date() };
    if (body.title !== undefined) patch.title = requiredString(body.title, "العنوان", 160);
    if (body.body !== undefined) patch.body = requiredString(body.body, "النص", 2000);
    if (body.tag !== undefined) patch.tag = optionalString(body.tag, "التصنيف", 40);
    if (body.published !== undefined) patch.published = body.published === true;
    const updated = await db
      .update(announcements)
      .set(patch)
      .where(eq(announcements.id, id))
      .returning();
    if (!updated[0]) throw new ApiError("الإعلان غير موجود.", "not_found", 404);
    return ok({ ok: true, announcement: updated[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError("المعرّف مطلوب.", "invalid_field");
    await db.delete(announcements).where(eq(announcements.id, id));
    return ok({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
