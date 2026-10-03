import { createHash, randomBytes } from "node:crypto";

export interface OAuthProviderConfig {
  id: "google" | "github" | "facebook";
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  extraAuthorize?: Record<string, string>;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    id: "google",
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extraAuthorize: { access_type: "online", prompt: "select_account" },
  },
  github: {
    id: "github",
    label: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userinfoUrl: "https://api.github.com/user",
    scope: "read:user user:email",
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    userinfoUrl: "https://graph.facebook.com/v19.0/me",
    scope: "email,public_profile",
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
    extraAuthorize: { fields: "id,name,email,picture" },
  },
};

export function providerConfig(provider: string): OAuthProviderConfig | null {
  return OAUTH_PROVIDERS[provider] ?? null;
}

export function isProviderConfigured(config: OAuthProviderConfig): boolean {
  return Boolean(process.env[config.clientIdEnv] && process.env[config.clientSecretEnv]);
}

export function redirectUri(provider: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/oauth/callback/${provider}`;
}

export function newState(): string {
  return randomBytes(24).toString("base64url");
}

export function stateHash(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  name: string;
  photoUrl: string | null;
}

export async function exchangeCode(
  config: OAuthProviderConfig,
  params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
  },
): Promise<{ accessToken: string; idToken?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`oauth_token_exchange_failed_${response.status}`);
  }
  return response.json();
}

export async function fetchProfile(
  config: OAuthProviderConfig,
  accessToken: string,
  idToken?: string,
): Promise<OAuthProfile> {
  if (config.id === "google") {
    const decoded = idToken ? decodeJwtPayload(idToken) : null;
    const response = await fetch(config.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const data = await response.json();
    return {
      providerAccountId: String(data.sub ?? decoded?.sub ?? ""),
      email: data.email ?? decoded?.email ?? null,
      name: data.name ?? decoded?.name ?? "مستخدم دوريسيو",
      photoUrl: data.picture ?? null,
    };
  }

  if (config.id === "github") {
    const response = await fetch(config.userinfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Dorisio",
      },
      cache: "no-store",
    });
    const data = await response.json();
    let email = data.email ?? null;
    if (!email) {
      const emails = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Dorisio",
        },
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : []));
      const primary = Array.isArray(emails)
        ? emails.find((e: { primary: boolean; verified: boolean }) => e.primary && e.verified) ??
          emails[0]
        : null;
      email = primary?.email ?? null;
    }
    return {
      providerAccountId: String(data.id ?? ""),
      email,
      name: data.name ?? data.login ?? "مستخدم دوريسيو",
      photoUrl: data.avatar_url ?? null,
    };
  }

  // Facebook
  const url = new URL(config.userinfoUrl);
  url.searchParams.set("fields", "id,name,email,picture");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  return {
    providerAccountId: String(data.id ?? ""),
    email: data.email ?? null,
    name: data.name ?? "مستخدم دوريسيو",
    photoUrl: data.picture?.data?.url ?? null,
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}
