import crypto from "crypto";
import { getZitadelConfig } from "./config";

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

export function generatePkcePair(): PkcePair {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest();
  const codeChallenge = Buffer.from(challenge).toString("base64url");
  return { codeVerifier, codeChallenge };
}

export async function discoverOidc(issuer: string): Promise<{
  authorization_endpoint: string;
  token_endpoint: string;
  issuer: string;
}> {
  const wellKnown = issuer.endsWith("/") ? issuer + ".well-known/openid-configuration" : issuer + "/.well-known/openid-configuration";
  const res = await fetch(wellKnown);
  if (!res.ok) {
    throw new Error(`Failed OIDC discovery: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json as {
    authorization_endpoint: string;
    token_endpoint: string;
    issuer: string;
  };
}

/**
 * Create the authorization URL for OIDC Authorization Code + PKCE.
 * If you have established a headless password session via ZITADEL's Authentication Service,
 * adding `prompt=none` will leverage that session and not show the hosted UI.
 */
export async function buildAuthorizeUrl(params: {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  codeChallenge: string;
  organization?: string;
  prompt?: string;
}): Promise<string> {
  const { authorization_endpoint } = await discoverOidc(params.issuer);
  const scope = params.scope || "openid profile email offline_access";
  const url = new URL(authorization_endpoint);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (params.prompt) {
    url.searchParams.set("prompt", params.prompt);
  }
  if (params.organization) {
    url.searchParams.set("organization", params.organization);
  }
  return url.toString();
}

export async function exchangeCodeForTokens(args: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId?: string;
}) {
  const { issuer, clientId: defaultClientId, clientSecret } = await getZitadelConfig();
  const { token_endpoint } = await discoverOidc(issuer);
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("code", args.code);
  form.set("redirect_uri", args.redirectUri);
  form.set("client_id", args.clientId || defaultClientId);
  form.set("code_verifier", args.codeVerifier);

  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(clientSecret ? { Authorization: `Basic ${Buffer.from(`${args.clientId || defaultClientId}:${clientSecret}`).toString("base64")}` } : {}),
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    id_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  }>;
}

export async function refreshTokens(args: { refreshToken: string; clientId?: string }) {
  const { issuer, clientId: defaultClientId, clientSecret } = await getZitadelConfig();
  const { token_endpoint } = await discoverOidc(issuer);
  const form = new URLSearchParams();
  form.set("grant_type", "refresh_token");
  form.set("refresh_token", args.refreshToken);
  form.set("client_id", args.clientId || defaultClientId);

  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(clientSecret ? { Authorization: `Basic ${Buffer.from(`${args.clientId || defaultClientId}:${clientSecret}`).toString("base64")}` } : {}),
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    id_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  }>;
}


