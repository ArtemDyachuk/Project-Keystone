"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResetToken = generateResetToken;
exports.verifyResetToken = verifyResetToken;
const tslib_1 = require("tslib");
const jsonwebtoken_1 = tslib_1.__importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const TOKEN_EXPIRY = "1h"; // 1 hour expiry
/**
 * Generate a JWT token for password reset
 */
function generateResetToken(email) {
    const payload = {
        email,
        purpose: "password-reset",
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRY,
    });
}
/**
 * Verify and decode a reset token
 */
function verifyResetToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Verify this is a password reset token
        if (decoded.purpose !== "password-reset") {
            throw new Error("Invalid token purpose");
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error("Reset link has expired. Please request a new one.");
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error("Invalid reset link. Please request a new one.");
        }
        else {
            throw error;
        }
    }
}
//# sourceMappingURL=reset-token.js.map