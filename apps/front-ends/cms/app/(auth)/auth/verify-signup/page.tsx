"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@keystone/ui";
import { autoLogin as autoLoginAction } from "@/app/actions/auth.actions";
import styles from "./page.module.css";

interface VerifySignupResponse {
  success: boolean;
  message: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
  };
  tenantId: string;
  gipTenantId: string;
  readyForPassword: boolean;
}

export default function VerifySignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<"verifying" | "completing" | "password-setup" | "auto-login" | "success" | "error">("verifying");
  const [verificationData, setVerificationData] = useState<VerifySignupResponse | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setError("No verification token provided");
      setStep("error");
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-signup-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Token verification failed");
      }

      const data: VerifySignupResponse = await response.json();
      setVerificationData(data);
      // Show password setup form
      setStep("password-setup");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Token verification failed");
      setStep("error");
    }
  };

  const autoLogin = async () => {
    if (!verificationData) return;

    try {
      console.log("🔄 Attempting auto-login for:", verificationData.user.email);

      // Wait a moment for the password to be fully set
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use server action for proper session management
      const result = await autoLoginAction({
        email: verificationData.user.email,
        password: password,
      });

      if (!result.success) {
        throw new Error(result.error || "Auto-login failed");
      }

      console.log("✅ Auto-login successful:", result.data);

      // Wait a moment for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("🚀 Redirecting to dashboard...");
      // Redirect to dashboard on successful login
      router.push("/dashboard");
    } catch (error) {
      console.error("❌ Auto-login failed:", error);

      // Try one more time with a longer delay
      try {
        console.log("🔄 Retrying auto-login with longer delay...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        const retryResult = await autoLoginAction({
          email: verificationData.user.email,
          password: password,
        });

        if (retryResult.success) {
          console.log("✅ Retry auto-login successful!");
          await new Promise(resolve => setTimeout(resolve, 1000));
          router.push("/dashboard");
          return;
        }
      } catch (retryError) {
        console.error("❌ Retry auto-login also failed:", retryError);
      }

      // If all attempts fail, try to check if we're actually logged in
      try {
        console.log("🔄 Checking if user is actually logged in...");
        const sessionCheck = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          credentials: "include",
        });

        if (sessionCheck.ok) {
          console.log("✅ User is actually logged in! Redirecting to dashboard...");
          router.push("/dashboard");
          return;
        }
      } catch (sessionError) {
        console.error("❌ Session check failed:", sessionError);
      }

      // If all attempts fail, show error and let user manually login
      setError(`Auto-login failed: ${error instanceof Error ? error.message : "Unknown error"}. Please login manually.`);
      setStep("error");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationData || !password.trim()) return;

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setError("Password must contain uppercase, lowercase, numbers, and special characters");
      return;
    }

    setStep("completing");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: verificationData.user.uid,
          password: password.trim(),
          tenantId: verificationData.gipTenantId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to set password");
      }

      // Show auto-login step
      setStep("auto-login");

      // Auto-login after successful password setup
      await autoLogin();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to set password");
      setStep("error");
    }
  };

  if (step === "verifying") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Verifying Your Signup</h1>
          <p>Please wait while we verify your signup token...</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Verification Failed</h1>
          <p className={styles.error}>{error}</p>
          <Button onClick={() => router.push("/signup")} className={styles.button}>
            Back to Signup
          </Button>
        </div>
      </div>
    );
  }



  if (step === "password-setup" && verificationData) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Set Your Password</h1>
          <p>
            Welcome to <strong>{verificationData.user.displayName}</strong>!
          </p>
          <p>Your account has been created. Please set a password to complete the setup:</p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={styles.input}
                placeholder="Enter your password"
              />
              <small className={styles.helpText}>
                Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters
              </small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={styles.input}
                placeholder="Confirm your password"
              />
            </div>

            <Button type="submit" className={styles.button}>
              Set Password & Complete Setup
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "completing") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Setting Up Your Account</h1>
          <p>Please wait while we set your password and complete the setup...</p>
        </div>
      </div>
    );
  }

  if (step === "auto-login") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Logging You In</h1>
          <p>Password set successfully! Now logging you in automatically...</p>
          <div className={styles.loading}>
            <p>Please wait while we log you in...</p>
            <p>You'll be redirected to your dashboard shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Signup Complete! 🎉</h1>
          <p>Your account has been created successfully!</p>
          <p>You can now login with your email and password.</p>
          <div className={styles.buttonGroup}>
            <Button onClick={() => router.push("/login")} className={styles.button}>
              Go to Login
            </Button>
            <Button onClick={() => router.push("/dashboard")} className={`${styles.button} ${styles.secondaryButton}`}>
              Try Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
