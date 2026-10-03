import { NextRequest } from "next/server";
import { ApiError, jsonError } from "@/lib/http";
import { exchangeCode, fetchProfile, isProviderConfigured, providerConfig, redirectUri } from "@/lib/oauth";
import { createSession } from "@/lib/auth";
import { resolveOAuthUser } from "@/lib/users";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params;
    const config = providerConfig(provider);
    if (!config) throw new ApiError("مزود تسجيل الدخول غير مدعوم.", "unknown_provider", 404);
    if (!isProviderConfigured(config)) {
      throw new ApiError(
        `تسجيل الدخول عبر ${config.label} غير مفعّل. راجع SETUP.md.`,
        "oauth_not_configured",
        503,
      );
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get("dorisio_oauth_state")?.value;
    if (!code || !state || !storedState || state !== storedState) {
      throw new ApiError("فشل التحقق من جلسة تسجيل الدخول. حاول مرة أخرى.", "invalid_state", 400);
    }

    const tokens = await exchangeCode(config, {
      code,
      redirectUri: redirectUri(config.id, request.nextUrl.origin),
      clientId: process.env[config.clientIdEnv]!,
      clientSecret: process.env[config.clientSecretEnv]!,
    });

    const profile = await fetchProfile(config, tokens.accessToken, tokens.idToken);
    if (!profile.providerAccountId) {
      throw new ApiError("تعذّر قراءة بيانات الحساب من المزوّد.", "oauth_profile_failed", 502);
    }

    const userId = await resolveOAuthUser(config.id, profile);
    await createSession(userId);

    const response = Response.redirect(`${request.nextUrl.origin}/profile`, 302);
    response.headers.set(
      "Set-Cookie",
      "dorisio_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.redirect(
        `${request.nextUrl.origin}/auth?error=${encodeURIComponent(error.code)}`,
        302,
      );
    }
    return jsonError(error);
  }
}
