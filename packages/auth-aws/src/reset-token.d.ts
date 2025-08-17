export interface ResetTokenPayload {
    email: string;
    purpose: "password-reset";
    iat: number;
    exp: number;
}
/**
 * Generate a JWT token for password reset
 */
export declare function generateResetToken(email: string): string;
/**
 * Verify and decode a reset token
 */
export declare function verifyResetToken(token: string): ResetTokenPayload;
//# sourceMappingURL=reset-token.d.ts.map