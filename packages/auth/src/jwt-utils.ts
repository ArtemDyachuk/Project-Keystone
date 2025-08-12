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
