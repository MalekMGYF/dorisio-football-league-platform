import { NextRequest } from "next/server";
import { ApiError, jsonError } from "@/lib/http";
import {
  isProviderConfigured,
  newState,
  providerConfig,
  redirectUri,
} from "@/lib/oauth";

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
        `تسجيل الدخول عبر ${config.label} غير مفعّل بعد. أضف ${config.clientIdEnv} و ${config.clientSecretEnv} في متغيّرات البيئة (راجع SETUP.md).`,
        "oauth_not_configured",
        503,
      );
    }

    const origin = request.nextUrl.origin;
    const state = newState();
    const url = new URL(config.authorizeUrl);
    url.searchParams.set("client_id", process.env[config.clientIdEnv]!);
    url.searchParams.set("redirect_uri", redirectUri(config.id, origin));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scope);
    url.searchParams.set("state", state);
    for (const [key, value] of Object.entries(config.extraAuthorize ?? {})) {
      url.searchParams.set(key, value);
    }

    const response = Response.redirect(url.toString(), 302);
    response.headers.set(
      "Set-Cookie",
      `dorisio_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
