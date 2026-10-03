import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { ApiError, jsonError, ok, readJson, requiredString } from "@/lib/http";
import { findUserByEmail } from "@/lib/users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{
      name?: unknown;
      email?: unknown;
      password?: unknown;
      shirtNumber?: unknown;
      position?: unknown;
    }>(request);

    const name = requiredString(body.name, "الاسم", 80);
    const email = requiredString(body.email, "البريد الإلكتروني", 160).toLowerCase();
    const password = requiredString(body.password, "كلمة المرور", 128);

    if (!EMAIL_RE.test(email)) {
      throw new ApiError("صيغة البريد الإلكتروني غير صحيحة.", "invalid_email");
    }
    if (password.length < 8) {
      throw new ApiError("كلمة المرور يجب ألا تقل عن 8 أحرف.", "weak_password");
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      throw new ApiError(
        "هذا البريد الإلكتروني مسجّل مسبقاً. جرّب تسجيل الدخول.",
        "email_taken",
        409,
      );
    }

    const { hashPassword } = await import("@/lib/auth");
    const inserted = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hashPassword(password),
        provider: "credentials",
        shirtNumber: typeof body.shirtNumber === "number" ? body.shirtNumber : null,
        position: typeof body.position === "string" ? body.position : null,
        lastLoginAt: new Date(),
      })
      .returning({ id: users.id });

    await createSession(inserted[0].id);
    return ok({ ok: true, userId: inserted[0].id });
  } catch (error) {
    return jsonError(error);
  }
}
