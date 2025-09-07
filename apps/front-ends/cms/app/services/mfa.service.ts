import { config } from "@/lib/config";

export interface MfaStatusResponse {
  success: boolean;
  mfaEnabled: boolean;
  mfaEnrolledAt?: number;
  message?: string;
  error?: string;
}

export interface MfaEnrollmentStartResponse {
  success: boolean;
  message: string;
  qrCodeUrl?: string;
  otpauthUrl?: string;
  sessionInfo?: string;
}

export interface MfaEnrollmentFinishResponse {
  success: boolean;
  message: string;
  mfaEnabled: boolean;
  mfaEnrolledAt?: number;
}

export interface MfaUnenrollmentResponse {
  success: boolean;
  message: string;
  mfaEnabled: boolean;
}

export interface MfaStepUpResponse {
  success: boolean;
  message: string;
  mfa: {
    enabled: boolean;
    verified: boolean;
    verifiedAt: number;
  };
}

/**
 * Service for MFA operations
 * This service makes API calls to the backend MFA endpoints
 */
export class MfaServiceClient {
  /**
   * Get current MFA status for the user
   * @returns Promise<MfaStatusResponse> Response with MFA status
   */
  static async getMfaStatus(): Promise<MfaStatusResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/mfa/status`, {
        method: "GET",
        credentials: "include", // Include session cookie
        headers: {
          "Content-Type": "application/json",
        },
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 401) {
          throw new Error("Authentication required. Please login again.");
        } else if (response.status === 403) {
          throw new Error("Access denied. Please check your permissions.");
        } else if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        } else {
          throw new Error(result.message || "Failed to get MFA status");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to get MFA status:", error);
      return {
        success: false,
        mfaEnabled: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Start MFA enrollment process
   * @param password User's current password for re-authentication
   * @returns Promise<MfaEnrollmentStartResponse> Response with QR code and setup info
   */
  static async startMfaEnrollment(password: string): Promise<MfaEnrollmentStartResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/mfa/totp/start`, {
        method: "POST",
        credentials: "include", // Include session cookie
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 401) {
          throw new Error("Authentication required. Please login again.");
        } else if (response.status === 403) {
          throw new Error("Access denied. Please check your permissions.");
        } else if (response.status === 409) {
          throw new Error("MFA is already enabled for this account.");
        } else if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        } else {
          throw new Error(result.message || "Failed to start MFA enrollment");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to start MFA enrollment:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Complete MFA enrollment with verification code
   * @param verificationCode 6-digit TOTP code from authenticator app
   * @returns Promise<MfaEnrollmentFinishResponse> Response with enrollment status
   */
  static async finishMfaEnrollment(verificationCode: string): Promise<MfaEnrollmentFinishResponse> {
    try {
      if (!verificationCode?.trim()) {
        return {
          success: false,
          message: "Verification code is required",
          mfaEnabled: false
        };
      }

      // Validate verification code format
      if (!/^\d{6}$/.test(verificationCode.trim())) {
        return {
          success: false,
          message: "Verification code must be exactly 6 digits",
          mfaEnabled: false
        };
      }

      const response = await fetch(`${config.apiBaseUrl}/api/auth/mfa/totp/finish`, {
        method: "POST",
        credentials: "include", // Include session cookie
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verificationCode: verificationCode.trim(),
        }),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 400) {
          if (result.code === "INVALID_OTP") {
            throw new Error("Invalid verification code. Please check your authenticator app and try again.");
          } else {
            throw new Error(result.message || "Invalid verification code format.");
          }
        } else if (response.status === 401) {
          throw new Error("Authentication required. Please login again.");
        } else if (response.status === 403) {
          throw new Error("Access denied. Please check your permissions.");
        } else if (response.status === 404) {
          throw new Error("MFA enrollment session not found. Please start the enrollment process again.");
        } else if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        } else {
          throw new Error(result.message || "Failed to complete MFA enrollment");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to finish MFA enrollment:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        mfaEnabled: false
      };
    }
  }

  /**
   * Disable MFA for the user
   * @param password User's current password for verification
   * @returns Promise<MfaUnenrollmentResponse> Response with unenrollment status
   */
  static async unenrollMfa(password: string): Promise<MfaUnenrollmentResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/mfa/unenroll`, {
        method: "POST",
        credentials: "include", // Include session cookie
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 401) {
          throw new Error("Authentication required. Please login again.");
        } else if (response.status === 403) {
          throw new Error("Access denied. Please check your permissions.");
        } else if (response.status === 404) {
          throw new Error("MFA is not enabled for this account.");
        } else if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        } else {
          throw new Error(result.message || "Failed to disable MFA");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to unenroll MFA:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        mfaEnabled: true // Assume still enabled if unenrollment failed
      };
    }
  }

  /**
   * Perform step-up authentication with MFA verification
   * @param verificationCode 6-digit TOTP code from authenticator app
   * @returns Promise<MfaStepUpResponse> Response with step-up status
   */
  static async stepUpAuthentication(verificationCode: string): Promise<MfaStepUpResponse> {
    try {
      if (!verificationCode?.trim()) {
        return {
          success: false,
          message: "Verification code is required",
          mfa: {
            enabled: false,
            verified: false,
            verifiedAt: 0
          }
        };
      }

      // Validate verification code format
      if (!/^\d{6}$/.test(verificationCode.trim())) {
        return {
          success: false,
          message: "Verification code must be exactly 6 digits",
          mfa: {
            enabled: false,
            verified: false,
            verifiedAt: 0
          }
        };
      }

      const response = await fetch(`${config.apiBaseUrl}/api/auth/step-up`, {
        method: "POST",
        credentials: "include", // Include session cookie
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verificationCode: verificationCode.trim(),
        }),
      });

      let result;

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        result = { message: text };
      }

      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 400) {
          if (result.code === "INVALID_OTP") {
            throw new Error("Invalid verification code. Please check your authenticator app and try again.");
          } else {
            throw new Error(result.message || "Invalid verification code format.");
          }
        } else if (response.status === 401) {
          throw new Error("Authentication required. Please login again.");
        } else if (response.status === 403) {
          throw new Error("MFA is not enabled for this account.");
        } else if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        } else {
          throw new Error(result.message || "Failed to complete step-up authentication");
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to complete step-up authentication:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        mfa: {
          enabled: false,
          verified: false,
          verifiedAt: 0
        }
      };
    }
  }
}
