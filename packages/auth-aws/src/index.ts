// Types
export * from "./types";

// Configuration
export { getCognitoConfig, getCognitoUrls } from "./config";

// Cognito Client
export { CognitoAuthClient } from "./cognito-client";

// JWT Utilities
export {
  verifyJwtToken,
  verifyGoogleIdToken,
  verifyUniversalJwtToken,
  decodeJwtToken,
  isTokenExpired,
  getTokenExpiration,
  extractUserFromIdToken,
} from "./jwt-utils";

// Reset Token Utilities
export {
  generateResetToken,
  verifyResetToken,
  type ResetTokenPayload,
} from "./reset-token";
