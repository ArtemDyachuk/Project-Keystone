"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyResetToken = exports.generateResetToken = exports.extractUserFromIdToken = exports.getTokenExpiration = exports.isTokenExpired = exports.decodeJwtToken = exports.verifyUniversalJwtToken = exports.verifyGoogleIdToken = exports.verifyJwtToken = exports.CognitoAuthClient = exports.getCognitoUrls = exports.getCognitoConfig = void 0;
const tslib_1 = require("tslib");
// Types
tslib_1.__exportStar(require("./types"), exports);
// Configuration
var config_1 = require("./config");
Object.defineProperty(exports, "getCognitoConfig", { enumerable: true, get: function () { return config_1.getCognitoConfig; } });
Object.defineProperty(exports, "getCognitoUrls", { enumerable: true, get: function () { return config_1.getCognitoUrls; } });
// Cognito Client
var cognito_client_1 = require("./cognito-client");
Object.defineProperty(exports, "CognitoAuthClient", { enumerable: true, get: function () { return cognito_client_1.CognitoAuthClient; } });
// JWT Utilities
var jwt_utils_1 = require("./jwt-utils");
Object.defineProperty(exports, "verifyJwtToken", { enumerable: true, get: function () { return jwt_utils_1.verifyJwtToken; } });
Object.defineProperty(exports, "verifyGoogleIdToken", { enumerable: true, get: function () { return jwt_utils_1.verifyGoogleIdToken; } });
Object.defineProperty(exports, "verifyUniversalJwtToken", { enumerable: true, get: function () { return jwt_utils_1.verifyUniversalJwtToken; } });
Object.defineProperty(exports, "decodeJwtToken", { enumerable: true, get: function () { return jwt_utils_1.decodeJwtToken; } });
Object.defineProperty(exports, "isTokenExpired", { enumerable: true, get: function () { return jwt_utils_1.isTokenExpired; } });
Object.defineProperty(exports, "getTokenExpiration", { enumerable: true, get: function () { return jwt_utils_1.getTokenExpiration; } });
Object.defineProperty(exports, "extractUserFromIdToken", { enumerable: true, get: function () { return jwt_utils_1.extractUserFromIdToken; } });
// Reset Token Utilities
var reset_token_1 = require("./reset-token");
Object.defineProperty(exports, "generateResetToken", { enumerable: true, get: function () { return reset_token_1.generateResetToken; } });
Object.defineProperty(exports, "verifyResetToken", { enumerable: true, get: function () { return reset_token_1.verifyResetToken; } });
//# sourceMappingURL=index.js.map