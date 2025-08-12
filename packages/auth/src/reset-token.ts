import jwt from "jsonwebtoken";

export interface ResetTokenPayload {
  email: string;
  purpose: "password-reset";
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const TOKEN_EXPIRY = "1h"; // 1 hour expiry

/**
 * Generate a JWT token for password reset
 */
export function generateResetToken(email: string): string {
  const payload: Omit<ResetTokenPayload, "iat" | "exp"> = {
    email,
    purpose: "password-reset",
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Verify and decode a reset token
 */
export function verifyResetToken(token: string): ResetTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ResetTokenPayload;
    
    // Verify this is a password reset token
    if (decoded.purpose !== "password-reset") {
      throw new Error("Invalid token purpose");
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Reset link has expired. Please request a new one.");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid reset link. Please request a new one.");
    } else {
      throw error;
    }
  }
}
