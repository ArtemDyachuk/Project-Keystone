// Types
export * from "./types";

// Configuration
export { getCognitoConfig, getCognitoUrls, getZitadelConfig } from "./config";

// Cognito Client
export { CognitoAuthClient } from "./cognito-client";

// JWT Utilities
export {
  verifyJwtToken,
  verifyOidcJwtToken,
  decodeJwtToken,
  isTokenExpired,
  getTokenExpiration,
  extractUserFromIdToken,
} from "./jwt-utils";

// ZITADEL helpers
export {
  generatePkcePair,
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  refreshTokens as refreshZitadelTokens,
} from "./zitadel-client";

// Reset Token Utilities
export {
  generateResetToken,
  verifyResetToken,
  type ResetTokenPayload,
} from "./reset-token";
