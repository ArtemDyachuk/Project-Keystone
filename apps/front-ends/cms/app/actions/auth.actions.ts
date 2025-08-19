"use server";

import { AuthServiceClient } from "@/app/services/auth.service";

export interface SignupWithEmailLinkData {
  firstName: string;
  lastName: string;
  email: string;
}

export interface SetPasswordData {
  uid: string;
  password: string;
  tenantId?: string;
}

/**
 * Server action to start signup process with email verification
 * This runs on the server and calls the backend auth API
 */
export async function signupWithEmailLink(data: SignupWithEmailLinkData) {
  try {
    // Validate input data
    if (!data.firstName?.trim()) {
      return {
        success: false,
        error: "First name is required"
      };
    }

    if (!data.lastName?.trim()) {
      return {
        success: false,
        error: "Last name is required"
      };
    }

    if (!data.email?.trim()) {
      return {
        success: false,
        error: "Email is required"
      };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        error: "Please enter a valid email address"
      };
    }

    // Call the auth service
    const result = await AuthServiceClient.signupWithEmailLink({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
    });

    return result;
  } catch (error) {
    console.error("❌ Signup with email link error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to verify email after user clicks verification link
 */
export async function verifyEmailAction(uid: string, tenantId?: string) {
  try {
    if (!uid) {
      return {
        success: false,
        error: "User ID is required"
      };
    }

    const result = await AuthServiceClient.verifyEmail({ uid, tenantId });
    return result;
  } catch (error) {
    console.error("❌ Email verification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to set password after email verification
 */
export async function setPasswordAction(data: SetPasswordData) {
  try {
    // Validate input data
    if (!data.uid) {
      return {
        success: false,
        error: "User ID is required"
      };
    }

    if (!data.password) {
      return {
        success: false,
        error: "Password is required"
      };
    }

    if (data.password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long"
      };
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(data.password);
    const hasLowerCase = /[a-z]/.test(data.password);
    const hasNumbers = /\d/.test(data.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return {
        success: false,
        error: "Password must contain uppercase, lowercase, numbers, and special characters"
      };
    }

    const result = await AuthServiceClient.setPassword(data);
    return result;
  } catch (error) {
    console.error("❌ Set password error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to check email verification code from link
 */
export async function checkEmailVerificationCode(actionCode: string) {
  try {
    if (!actionCode) {
      return {
        success: false,
        error: "Verification code is required"
      };
    }

    const result = await AuthServiceClient.checkEmailVerificationCode(actionCode);
    return result;
  } catch (error) {
    console.error("❌ Check email verification code error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Send password reset email
 */
export async function forgotPasswordAction(email: string) {
  try {
    if (!email?.trim()) {
      return {
        success: false,
        error: "Email is required"
      };
    }

    // Call the auth service
    const result = await AuthServiceClient.forgotPassword(email);
    return result;
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Reset password with verification code
 */
export async function resetPasswordAction(email: string, password: string, oobCode: string) {
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

    // Call the auth service
    const result = await AuthServiceClient.resetPassword(email, password, oobCode);
    return result;
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
