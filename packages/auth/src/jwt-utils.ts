import { jwtVerify, createRemoteJWKSet } from "jose";
import { DecodedToken } from "./types";

/**
 * Verify and decode a Cognito JWT token
 */
export async function verifyJwtToken(
  token: string,
  userPoolId: string,
  region: string,
  tokenUse: "access" | "id" = "id"
): Promise<DecodedToken> {
  try {
    // Create JWKS endpoint URL
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));

    // Verify the JWT
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      audience: tokenUse === "access" ? undefined : "string", // Access tokens don't have audience
    });

    // Validate token use
    if (payload.token_use !== tokenUse) {
      throw new Error(`Expected ${tokenUse} token, got ${payload.token_use}`);
    }

    return payload as unknown as DecodedToken;
  } catch (error) {
    throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Verify and decode a Google ID token
 */
export async function verifyGoogleIdToken(
  token: string,
  clientId: string
): Promise<DecodedToken> {
  try {
    // Google's JWKS endpoint
    const jwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));

    // Verify the JWT
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });

    // Convert Google token format to our DecodedToken format
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      email_verified: payload.email_verified as boolean,
      given_name: payload.given_name as string,
      family_name: payload.family_name as string,
      aud: payload.aud as string,
      exp: payload.exp as number,
      iat: payload.iat as number,
      iss: payload.iss as string,
      // Google tokens don't have these Cognito-specific fields
      token_use: "id",
      username: payload.email as string,
    } as DecodedToken;
  } catch (error) {
    throw new Error(`Google JWT verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Universal JWT token verification that works with both Cognito and Google tokens
 */
export async function verifyUniversalJwtToken(
  token: string,
  options: {
    provider: "cognito" | "google";
    userPoolId?: string;
    region?: string;
    clientId?: string;
    tokenUse?: "access" | "id";
  }
): Promise<DecodedToken> {
  if (options.provider === "google") {
    if (!options.clientId) {
      throw new Error("clientId is required for Google token verification");
    }
    return verifyGoogleIdToken(token, options.clientId);
  } else {
    if (!options.userPoolId || !options.region) {
      throw new Error("userPoolId and region are required for Cognito token verification");
    }
    return verifyJwtToken(token, options.userPoolId, options.region, options.tokenUse);
  }
}

/**
 * Decode JWT token without verification (for development/debugging only)
 */
export function decodeJwtToken(token: string): DecodedToken {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return payload as unknown as DecodedToken;
  } catch (error) {
    throw new Error(`JWT decode failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJwtToken(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true; // Treat invalid tokens as expired
  }
}

/**
 * Get the expiration time of a JWT token
 */
export function getTokenExpiration(token: string): Date {
  const decoded = decodeJwtToken(token);
  return new Date(decoded.exp * 1000);
}

/**
 * Extract user information from an ID token
 */
export function extractUserFromIdToken(idToken: string): Partial<DecodedToken> {
  const decoded = decodeJwtToken(idToken);

  return {
    sub: decoded.sub,
    email: decoded.email,
    email_verified: decoded.email_verified,
    given_name: decoded.given_name,
    family_name: decoded.family_name,
    "custom:tenantId": decoded["custom:tenantId"],
    "custom:role": decoded["custom:role"],
  };
}
