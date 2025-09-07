"use server";

import { MfaServiceClient } from "@/app/services/mfa.service";

/**
 * Server action to get current MFA status
 * This runs on the server and calls the backend MFA API
 */
export async function getMfaStatusAction() {
  try {
    const result = await MfaServiceClient.getMfaStatus();
    return result;
  } catch (error) {
    console.error("❌ Get MFA status error:", error);
    return {
      success: false,
      mfaEnabled: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to start MFA enrollment process
 * This runs on the server and calls the backend MFA API
 */
export async function startMfaEnrollmentAction(password: string) {
  try {
    const result = await MfaServiceClient.startMfaEnrollment(password);
    
    if (result.success) {
      // MFA enrollment started successfully
    }
    
    return result;
  } catch (error) {
    console.error("❌ Start MFA enrollment error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to complete MFA enrollment with verification code
 * This runs on the server and calls the backend MFA API
 */
export async function finishMfaEnrollmentAction(verificationCode: string) {
  try {
    // Validate input
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

    const result = await MfaServiceClient.finishMfaEnrollment(verificationCode.trim());
    
    if (result.success) {
      // MFA enrollment completed successfully
    }
    
    return result;
  } catch (error) {
    console.error("❌ Finish MFA enrollment error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      mfaEnabled: false
    };
  }
}


/**
 * Server action to perform step-up authentication
 * This runs on the server and calls the backend MFA API
 */
export async function stepUpAuthenticationAction(verificationCode: string) {
  try {
    // Validate input
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

    const result = await MfaServiceClient.stepUpAuthentication(verificationCode.trim());
    
    if (result.success) {
      // Step-up authentication completed successfully
    }
    
    return result;
  } catch (error) {
    console.error("❌ Step-up authentication error:", error);
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
