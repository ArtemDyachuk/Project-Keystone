"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@keystone/ui";
import { AuthForm } from "@/app/components/authentication/AuthForm";
import { setPasswordAction, verifyEmailAction } from "@/app/actions";
import styles from "../../styles.module.css";

type VerificationStep = "verifying" | "set-password" | "complete" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<VerificationStep>("verifying");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the verification parameters from URL
        const oobCode = searchParams.get("oobCode");
        const mode = searchParams.get("mode");
        const email = searchParams.get("email");
        const uid = searchParams.get("uid");

        if (!oobCode || mode !== "verifyEmail" || !email || !uid) {
          setError("Invalid or expired verification link");
          setStep("error");
          return;
        }

        // Set user info from URL parameters
        setUserEmail(decodeURIComponent(email));
        setUserId(uid);

        // Verify the email with our backend
        const result = await verifyEmailAction(uid);

        if (!result.success) {
          throw new Error(result.error || "Failed to verify email");
        }

        console.log("✅ Email verified successfully");
        setStep("set-password");

      } catch (err) {
        console.error("Email verification failed:", err);
        setError(err instanceof Error ? err.message : "Failed to verify email. Please try again.");
        setStep("error");
      }
    };

    handleEmailVerification();
  }, [searchParams]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setError("Password must contain uppercase, lowercase, numbers, and special characters");
      setLoading(false);
      return;
    }

    try {
      const result = await setPasswordAction({
        uid: userId,
        password: password,
        email: userEmail,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Check if user needs to create a tenant
      if (result.needsTenant && result.redirectUrl) {
        router.push(result.redirectUrl);
        return;
      }

      // Check if user should go to dashboard
      if (result.redirectUrl && result.redirectUrl === "/dashboard") {
        router.push(result.redirectUrl);
        return;
      }

      // If no specific redirect, continue with normal flow
      setStep("complete");

      // Start countdown and auto-redirect to login as fallback
      let timeLeft = 3;
      setCountdown(timeLeft);

      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);

        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          router.push("/login");
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "verifying":
        return (
          <div className={styles.verifying}>
            <div className={styles.loadingSpinner}>🔄</div>
            <h2>Verifying your email...</h2>
            <p>Please wait while we verify your email address.</p>
          </div>
        );

      case "set-password":
        return (
          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <div className={styles.step}>
              <p className={styles.stepText}>
                ✅ Email verified successfully!
                <br />
                Now create your password to complete your account setup.
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
              />
              <small className={styles.hint}>
                Must be at least 8 characters with uppercase, lowercase, numbers, and symbols
              </small>
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? "Setting up your account..." : "Complete Account Setup"}
            </Button>
          </form>
        );

      case "complete":
        return (
          <div className={styles.complete}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Account Setup Complete!</h2>
            <p>Welcome to Keystone CMS!</p>
            <p>Your account has been created and verified successfully.</p>

            <div className={styles.redirectInfo}>
              <p>Redirecting to login in {countdown} seconds...</p>
            </div>

            <Button
              onClick={() => router.push("/login")}
              className={styles.submitButton}
            >
              Continue to Login Now
            </Button>
          </div>
        );

      case "error":
        return (
          <div className={styles.error}>
            <div className={styles.errorIcon}>❌</div>
            <h2>Verification Failed</h2>
            <p>{error || "Something went wrong during email verification."}</p>

            <div className={styles.errorActions}>
              <Button
                onClick={() => router.push("/signup")}
                variant="secondary"
                className={styles.submitButton}
              >
                Try Signing Up Again
              </Button>

              <Button
                onClick={() => router.push("/login")}
                className={styles.submitButton}
              >
                Go to Login
              </Button>
            </div>
          </div>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "verifying": return "Verifying Email";
      case "set-password": return "Set Your Password";
      case "complete": return "Welcome!";
      case "error": return "Verification Failed";
    }
  };

  return (
    <AuthForm title={getStepTitle()}>
      {renderStep()}

      {error && step !== "error" && (
        <div className={styles.error}>
          ❌ {error}
        </div>
      )}

      {step === "set-password" && (
        <div className={styles.emailInfo}>
          <p className={styles.emailDisplay}>
            📧 Setting up account for: <strong>{userEmail}</strong>
          </p>
        </div>
      )}
    </AuthForm>
  );
}
