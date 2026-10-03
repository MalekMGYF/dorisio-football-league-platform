import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { jsonError, ok, readJson, requiredString } from "@/lib/http";
import { ApiError } from "@/lib/http";
import { promoteToAdmin } from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * First-admin bootstrap (trusted server-side logic).
 *
 * Requires the one-time shared secret `ADMIN_SETUP_TOKEN` from the server
 * environment. Registration never allows choosing a role — the only way to
 * become an administrator is this endpoint (or a direct DB write by an
 * operator). Disable it in production by unsetting ADMIN_SETUP_TOKEN.
 */
function secretMatches(provided: string): boolean {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ email?: unknown; token?: unknown }>(request);
    const email = requiredString(body.email, "البريد الإلكتروني", 160).toLowerCase();
    const token = requiredString(body.token, "رمز التهيئة", 200);

    if (!process.env.ADMIN_SETUP_TOKEN) {
      throw new ApiError(
        "تهيئة المدير غير مفعّلة. أضف ADMIN_SETUP_TOKEN إلى متغيّرات البيئة (راجع SETUP.md).",
        "not_configured",
        503,
      );
    }
    if (!secretMatches(token)) {
      throw new ApiError("رمز التهيئة غير صحيح.", "forbidden", 403);
    }

    const promoted = await promoteToAdmin(email);
    if (!promoted) {
      throw new ApiError("لا يوجد حساب بهذا البريد الإلكتروني.", "not_found", 404);
    }

    return ok({
      ok: true,
      user: { id: promoted.id, email: promoted.email, role: promoted.role },
      message: "تمت ترقية الحساب إلى مدير الدوري.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
