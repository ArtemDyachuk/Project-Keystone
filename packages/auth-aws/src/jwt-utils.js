"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwtToken = verifyJwtToken;
exports.verifyGoogleIdToken = verifyGoogleIdToken;
exports.verifyUniversalJwtToken = verifyUniversalJwtToken;
exports.decodeJwtToken = decodeJwtToken;
exports.isTokenExpired = isTokenExpired;
exports.getTokenExpiration = getTokenExpiration;
exports.extractUserFromIdToken = extractUserFromIdToken;
const jose_1 = require("jose");
/**
 * Verify and decode a Cognito JWT token
 */
async function verifyJwtToken(token, userPoolId, region, tokenUse = "id") {
    try {
        // Create JWKS endpoint URL
        const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
        const JWKS = (0, jose_1.createRemoteJWKSet)(new URL(jwksUrl));
        // Verify the JWT
        const { payload } = await (0, jose_1.jwtVerify)(token, JWKS, {
            issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
            audience: tokenUse === "access" ? undefined : "string", // Access tokens don't have audience
        });
        // Validate token use
        if (payload.token_use !== tokenUse) {
            throw new Error(`Expected ${tokenUse} token, got ${payload.token_use}`);
        }
        return payload;
    }
    catch (error) {
        throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
/**
 * Verify and decode a Google ID token
 */
async function verifyGoogleIdToken(token, clientId) {
    try {
        // Google's JWKS endpoint
        const jwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
        const JWKS = (0, jose_1.createRemoteJWKSet)(new URL(jwksUrl));
        // Verify the JWT
        const { payload } = await (0, jose_1.jwtVerify)(token, JWKS, {
            issuer: ["https://accounts.google.com", "accounts.google.com"],
            audience: clientId,
        });
        // Convert Google token format to our DecodedToken format
        return {
            sub: payload.sub,
            email: payload.email,
            email_verified: payload.email_verified,
            given_name: payload.given_name,
            family_name: payload.family_name,
            aud: payload.aud,
            exp: payload.exp,
            iat: payload.iat,
            iss: payload.iss,
            // Google tokens don't have these Cognito-specific fields
            token_use: "id",
            username: payload.email,
        };
    }
    catch (error) {
        throw new Error(`Google JWT verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
/**
 * Universal JWT token verification that works with both Cognito and Google tokens
 */
async function verifyUniversalJwtToken(token, options) {
    if (options.provider === "google") {
        if (!options.clientId) {
            throw new Error("clientId is required for Google token verification");
        }
        return verifyGoogleIdToken(token, options.clientId);
    }
    else {
        if (!options.userPoolId || !options.region) {
            throw new Error("userPoolId and region are required for Cognito token verification");
        }
        return verifyJwtToken(token, options.userPoolId, options.region, options.tokenUse);
    }
}
/**
 * Decode JWT token without verification (for development/debugging only)
 */
function decodeJwtToken(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) {
            throw new Error("Invalid JWT format");
        }
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        return payload;
    }
    catch (error) {
        throw new Error(`JWT decode failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
/**
 * Check if a JWT token is expired
 */
function isTokenExpired(token) {
    try {
        const decoded = decodeJwtToken(token);
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    }
    catch {
        return true; // Treat invalid tokens as expired
    }
}
/**
 * Get the expiration time of a JWT token
 */
function getTokenExpiration(token) {
    const decoded = decodeJwtToken(token);
    return new Date(decoded.exp * 1000);
}
/**
 * Extract user information from an ID token
 */
function extractUserFromIdToken(idToken) {
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
//# sourceMappingURL=jwt-utils.js.map