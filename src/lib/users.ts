import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { oauthAccounts, users } from "@/db/schema";
import type { OAuthProfile } from "@/lib/oauth";

/**
 * Resolves an OAuth profile to a Dorisio user account.
 * - links to an existing account when the provider account is already known
 * - links to an existing account with the same verified email
 * - otherwise creates a new user (always role "user"; admins are promoted only
 *   by trusted server-side logic — never chosen at registration)
 */
export async function resolveOAuthUser(
  provider: string,
  profile: OAuthProfile,
): Promise<string> {
  const linked = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, profile.providerAccountId),
      ),
    )
    .limit(1);

  const now = new Date();
  if (linked[0]) {
    await db
      .update(users)
      .set({ lastLoginAt: now, updatedAt: now, photoUrl: profile.photoUrl ?? undefined })
      .where(eq(users.id, linked[0].userId));
    return linked[0].userId;
  }

  let userId: string | null = null;
  if (profile.email) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, profile.email.toLowerCase()))
      .limit(1);
    userId = existing[0]?.id ?? null;
  }

  if (!userId) {
    const inserted = await db
      .insert(users)
      .values({
        email: (profile.email ?? `${provider}-${profile.providerAccountId}@dorisio.app`).toLowerCase(),
        name: profile.name,
        photoUrl: profile.photoUrl,
        provider,
        lastLoginAt: now,
      })
      .returning({ id: users.id });
    userId = inserted[0].id;
  } else {
    await db
      .update(users)
      .set({ lastLoginAt: now, updatedAt: now })
      .where(eq(users.id, userId));
  }

  await db
    .insert(oauthAccounts)
    .values({ userId, provider, providerAccountId: profile.providerAccountId, email: profile.email })
    .onConflictDoNothing();

  return userId;
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Used by the first-admin script: promotes a user exactly once. */
export async function promoteToAdmin(email: string) {
  const rows = await db
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(users.email, email.toLowerCase()))
    .returning({ id: users.id, email: users.email, role: users.role });
  return rows[0] ?? null;
}
