import { DecodedToken } from "./types";
/**
 * Verify and decode a Cognito JWT token
 */
export declare function verifyJwtToken(token: string, userPoolId: string, region: string, tokenUse?: "access" | "id"): Promise<DecodedToken>;
/**
 * Verify and decode a Google ID token
 */
export declare function verifyGoogleIdToken(token: string, clientId: string): Promise<DecodedToken>;
/**
 * Universal JWT token verification that works with both Cognito and Google tokens
 */
export declare function verifyUniversalJwtToken(token: string, options: {
    provider: "cognito" | "google";
    userPoolId?: string;
    region?: string;
    clientId?: string;
    tokenUse?: "access" | "id";
}): Promise<DecodedToken>;
/**
 * Decode JWT token without verification (for development/debugging only)
 */
export declare function decodeJwtToken(token: string): DecodedToken;
/**
 * Check if a JWT token is expired
 */
export declare function isTokenExpired(token: string): boolean;
/**
 * Get the expiration time of a JWT token
 */
export declare function getTokenExpiration(token: string): Date;
/**
 * Extract user information from an ID token
 */
export declare function extractUserFromIdToken(idToken: string): Partial<DecodedToken>;
//# sourceMappingURL=jwt-utils.d.ts.map