import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { ApiError } from "@/lib/http";

export const SESSION_COOKIE = "dorisio_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `s2:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, derived] = stored.split(":");
  if (scheme !== "s2" || !salt || !derived) return false;

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(derived, "hex");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const sessionId = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // يوجد Session واحدة فقط لكل مستخدم.
  // عند تسجيل الدخول مرة أخرى نحدّث الجلسة القديمة بدل إنشاء جلسة ثانية.
  await db
    .insert(sessions)
    .values({
      id: sessionId,
      userId,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: sessions.userId,
      set: {
        id: sessionId,
        expiresAt,
        lastSeenAt: new Date(),
      },
    });

  const jar = await cookies();

  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    await db
      .delete(sessions)
      .where(eq(sessions.id, hashToken(token)))
      .catch(() => undefined);

    jar.delete(SESSION_COOKIE);
  }
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const id = hashToken(token);

  const rows = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, id),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];

  if (!row) return null;

  return {
    ...row.user,
    passwordHash: undefined,
    role: row.user.role as "user" | "admin",
  };
}

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSessionUser>>
>;

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    throw new ApiError(
      "يجب تسجيل الدخول للقيام بهذا الإجراء.",
      "unauthenticated",
      401,
    );
  }

  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();

  if (user.role !== "admin") {
    throw new ApiError(
      "هذه العملية متاحة لمدير الدوري فقط.",
      "forbidden",
      403,
    );
  }

  return user;
}

export function isAdmin(
  user: { role: string } | null | undefined,
): boolean {
  return user?.role === "admin";
}
