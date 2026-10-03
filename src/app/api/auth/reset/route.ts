import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications, passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { ApiError, jsonError, ok, readJson, requiredString } from "@/lib/http";
import { findUserByEmail } from "@/lib/users";

/**
 * Password reset without an SMTP dependency:
 * a single-use, expiring token is created and delivered as an in-app
 * notification (visible in «حسابي»). When SMTP_URL is configured the same link
 * can be mailed by your infrastructure — see SETUP.md.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ mode?: unknown; email?: unknown; token?: unknown; password?: unknown }>(
      request,
    );
    const mode = body.mode === "confirm" ? "confirm" : "request";

    if (mode === "request") {
      const email = requiredString(body.email, "البريد الإلكتروني", 160).toLowerCase();
      const user = await findUserByEmail(email);
      if (!user) {
        // Do not leak which emails exist.
        return ok({ ok: true, message: "إذا كان البريد مسجلاً فستصلك رسالة الاستعادة." });
      }
      const token = randomBytes(24).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
      await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });
      await db.insert(notifications).values({
        userId: user.id,
        type: "security",
        title: "استعادة كلمة المرور",
        body: `اضغط على الرابط لإعادة تعيين كلمة المرور خلال ساعة: /auth?reset=${token}`,
        linkUrl: `/auth?reset=${token}`,
      });
      return ok({ ok: true, message: "إذا كان البريد مسجلاً فستصلك رسالة الاستعادة." });
    }

    const token = requiredString(body.token, "رمز الاستعادة", 200);
    const password = requiredString(body.password, "كلمة المرور الجديدة", 128);
    if (password.length < 8) {
      throw new ApiError("كلمة المرور يجب ألا تقل عن 8 أحرف.", "weak_password");
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt),
        ),
      )
      .limit(1);
    const record = rows[0];
    if (!record) {
      throw new ApiError("رمز الاستعادة غير صالح أو منتهي الصلاحية.", "invalid_token", 400);
    }

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));
    await db
      .update(users)
      .set({ passwordHash: hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, record.userId));

    return ok({ ok: true, message: "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن." });
  } catch (error) {
    return jsonError(error);
  }
}
