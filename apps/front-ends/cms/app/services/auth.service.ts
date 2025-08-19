import { config } from "@/lib/config";

export interface SignupWithEmailLinkRequest {
  firstName: string;
  lastName: string;
  email: string;
}

export interface VerifyEmailRequest {
  uid: string;
  tenantId?: string;
}

export interface SetPasswordRequest {
  uid: string;
  password: string;
  tenantId?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
  };
  message?: string;
  error?: string;
  emailLink?: string;
  data?: any; // For additional response data
}

/**
 * Service for Firebase authentication operations
 * This service makes API calls to the backend auth controller
 */
export class AuthServiceClient {

  /**
   * Start signup process by sending email verification link
   * @param data User signup data (firstName, lastName, email)
   * @returns Promise<AuthResponse> Response with user data and email link info
   */
  static async signupWithEmailLink(data: SignupWithEmailLinkRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/signup-email-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses (like rate limiting)
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes with better error messages
        if (response.status === 429) {
          throw new Error("Too many signup attempts. Please try again later.");
        } else if (response.status === 409) {
          throw new Error("An account with this email already exists. Try signing in instead.");
        } else if (response.status === 400) {
          throw new Error(result.message || "Invalid signup request. Please check your information.");
        } else {
          throw new Error(result.message || "Failed to start signup process");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to start signup with email link:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Verify email after user clicks the verification link
   * @param data Verification data (uid, tenantId)
   * @returns Promise<AuthResponse> Response with updated user data
   */
  static async verifyEmail(data: VerifyEmailRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses (like rate limiting)
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes with better error messages
        if (response.status === 429) {
          throw new Error("Too many verification attempts. Please try again later.");
        } else if (response.status === 400) {
          throw new Error(result.message || "Invalid verification request. The link may be expired.");
        } else if (response.status === 404) {
          throw new Error("Verification link not found. The link may be expired or invalid.");
        } else {
          throw new Error(result.message || "Failed to verify email");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to verify email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Set password after email verification
   * @param data Password data (uid, password, tenantId)
   * @returns Promise<AuthResponse> Response with final user data
   */
  static async setPassword(data: SetPasswordRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses (like rate limiting)
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes with better error messages
        if (response.status === 429) {
          throw new Error("Too many password attempts. Please try again later.");
        } else if (response.status === 400) {
          throw new Error(result.message || "Invalid password. Please check requirements.");
        } else if (response.status === 404) {
          throw new Error("User not found. The verification may have expired.");
        } else {
          throw new Error(result.message || "Failed to set password");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to set password:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Check if email verification link is valid
   * @param actionCode The action code from the email link
   * @returns Promise<AuthResponse> Response with verification status
   */
  static async checkEmailVerificationCode(actionCode: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/check-email-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionCode }),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses (like rate limiting)
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes with better error messages
        if (response.status === 429) {
          throw new Error("Too many verification attempts. Please try again later.");
        } else if (response.status === 400) {
          throw new Error(result.message || "Invalid or expired verification code.");
        } else {
          throw new Error(result.message || "Failed to check email verification code");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to check email verification code:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Send password reset email
   * @param email User's email address
   * @returns Promise<AuthResponse> Response with reset status
   */
  static async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      if (!email?.trim()) {
        return {
          success: false,
          error: "Email is required"
        };
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: "Please enter a valid email address"
        };
      }

      const response = await fetch(`${config.apiBaseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses (like rate limiting)
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes with better error messages
        if (response.status === 429) {
          throw new Error("Too many password reset attempts. Please try again later.");
        } else if (response.status === 400) {
          throw new Error(result.message || "Invalid email address.");
        } else {
          throw new Error(result.message || "Failed to send password reset email");
        }
      }

      return {
        success: true,
        message: result.message || "Password reset email sent!",
        data: result
      };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Reset password with verification code
   * @param email User's email address
   * @param password New password
   * @param oobCode Reset verification code
   * @returns Promise<AuthResponse> Response with reset status
   */
  static async resetPassword(email: string, password: string, oobCode: string): Promise<AuthResponse> {
    try {
      if (!email?.trim()) {
        return {
          success: false,
          error: "Email is required"
        };
      }

      if (!password?.trim()) {
        return {
          success: false,
          error: "Password is required"
        };
      }

      if (!oobCode?.trim()) {
        return {
          success: false,
          error: "Reset code is required"
        };
      }

      const response = await fetch(`${config.apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          oobCode: oobCode.trim()
        }),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses (like rate limiting)
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes with better error messages
        if (response.status === 429) {
          throw new Error("Too many password reset attempts. Please try again later.");
        } else if (response.status === 400) {
          throw new Error(result.message || "Invalid reset request. Please check your information.");
        } else if (response.status === 404) {
          throw new Error("No account found with this email address.");
        } else {
          throw new Error(result.message || "Failed to reset password");
        }
      }

      return {
        success: true,
        message: result.message || "Password reset successfully!",
        data: result
      };
    } catch (error) {
      console.error("Failed to reset password:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}
