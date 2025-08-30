"use server";

import { AuthServiceClient } from "@/app/services/auth.service";
import { setSessionCookie, deleteSessionCookie, setCSRFCookie, deleteCSRFCookie } from "@/lib/sessions/cookies";
import { redirect } from "next/navigation";
import { config } from "@/lib/config";

export interface SignupWithEmailLinkData {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
}

export interface SetPasswordData {
  uid: string;
  password: string;
  tenantId?: string;
  email?: string;
  sessionId?: string;
}

export interface AutoLoginRequest {
  email: string;
  password: string;
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

    if (!data.companyName?.trim()) {
      return {
        success: false,
        error: "Company name is required"
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
      companyName: data.companyName.trim(),
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

    if (result.success && result.user) {
      // Auto-login the user after setting password
      try {
        // Call the login endpoint to create a session
        const loginResponse = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.email || result.user.email,
            password: data.password,
          }),
        });

        if (loginResponse.ok) {
          const loginResult = await loginResponse.json();

          // Set session cookies
          if (loginResult.sessionId) {
            await setSessionCookie(loginResult.sessionId);
          }

          if (loginResult.csrfToken) {
            await setCSRFCookie(loginResult.csrfToken);
          }

          // Check if user needs to create a tenant
          if (loginResult.user?.uid) {
            console.log("🔍 Checking tenant requirement for user:", loginResult.user.uid);

            const tenantResponse = await fetch(`${config.apiBaseUrl}/api/tenants/check-requirement`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Cookie: `session=${loginResult.sessionId}`,
              },
            });

            if (tenantResponse.ok) {
              const tenantCheck = await tenantResponse.json();

              if (tenantCheck.needsTenant) {
                // User needs to create a tenant
                return {
                  ...result,
                  needsTenant: true,
                  redirectUrl: "/tenants/create",
                };
              } else {
                // User has a tenant, return dashboard redirect
                return {
                  ...result,
                  needsTenant: false,
                  redirectUrl: "/dashboard",
                };
              }
            } else {
              console.error("❌ Tenant check failed:", tenantResponse.status, await tenantResponse.text());
              // If tenant check fails, default to requiring tenant creation for new users
              return {
                ...result,
                needsTenant: true,
                redirectUrl: "/tenants/create",
              };
            }
          }
        }
      } catch (error) {
        console.error("Auto-login failed:", error);
        // Fallback: return login redirect
        return {
          ...result,
          needsTenant: false,
          redirectUrl: "/login",
          error: "Auto-login failed, please login manually",
        };
      }
    }

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

/**
 * Login with email and password
 */
export async function loginAction(email: string, password: string, redirectUrl: string = "/dashboard") {
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

    // Make direct API call to backend
    const response = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Login failed"
      };
    }

    // Set HttpOnly session cookie and CSRF token cookie
    if (result.sessionId) {
      await setSessionCookie(result.sessionId);
    }

    if (result.csrfToken) {
      await setCSRFCookie(result.csrfToken);
    }

    // For server-side Redis sessions, we just need to set the basic cookie
    // The backend will handle all session validation
    console.log('✅ Session cookies set for Redis session:', {
      sessionId: result.sessionId ? result.sessionId.substring(0, 8) + '...' : 'not set',
      csrfToken: result.csrfToken ? result.csrfToken.substring(0, 8) + '...' : 'not set'
    });

    // Small delay to ensure cookies are committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if user needs to create a tenant
    if (result.user?.uid) {
      // Make a direct API call to check tenant requirement
      const response = await fetch(`${config.apiBaseUrl}/api/tenants/check-requirement`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session=${result.sessionId}`, // Use the session ID from login response
        },
      });

      if (response.ok) {
        const tenantCheck = await response.json();
        if (tenantCheck.needsTenant) {
          // User needs to create a tenant, redirect to tenant creation
          redirect("/tenants/create");
        }
      }
    }

    // User has a tenant, continue to dashboard
    redirect(redirectUrl);
  } catch (error) {
    // Check if this is a Next.js redirect (which is expected)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      // This is normal - redirect was successful, just re-throw it
      throw error;
    }

    console.error("❌ Login action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Logout - destroy session and redirect
 */
export async function logoutAction() {
  try {
    // Call backend to destroy session
    await fetch(`${config.apiBaseUrl}/api/auth/logout`, {
      method: "POST",
      credentials: 'include', // Include cookies
    });

    // Delete both session and CSRF cookies
    await deleteSessionCookie();
    await deleteCSRFCookie();

    // Redirect to home page
    redirect("/");
  } catch (error) {
    // Check if this is a Next.js redirect (which is expected)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      // This is normal - redirect was successful, just re-throw it
      throw error;
    }

    console.error("❌ Logout error:", error);

    // Even if backend fails, still delete both cookies and redirect
    await deleteSessionCookie();
    await deleteCSRFCookie();
    redirect("/");
  }
}

/**
 * Auto-login function for the verify-signup flow
 * This uses server-side session management to properly set cookies
 */
export async function autoLogin(request: AutoLoginRequest) {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Auto-login failed");
    }

    const loginData = await response.json();

    // Set the session cookie from the backend response
    if (loginData.sessionId) {
      await setSessionCookie(loginData.sessionId);
    }

    // Set CSRF token if provided
    if (loginData.csrfToken) {
      await setCSRFCookie(loginData.csrfToken);
    }

    return { success: true, data: loginData };
  } catch (error) {
    console.error("Auto-login failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Auto-login failed"
    };
  }
}
