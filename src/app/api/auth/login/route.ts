import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";
import { ApiError, jsonError, ok, readJson, requiredString } from "@/lib/http";
import { findUserByEmail } from "@/lib/users";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ email?: unknown; password?: unknown }>(request);
    const email = requiredString(body.email, "البريد الإلكتروني", 160).toLowerCase();
    const password = requiredString(body.password, "كلمة المرور", 128);

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new ApiError("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "invalid_credentials", 401);
    }

    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await createSession(user.id);
    return ok({ ok: true, userId: user.id, role: user.role });
  } catch (error) {
    return jsonError(error);
  }
}
