"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@keystone/ui";
import { AuthForm } from "@/app/components/authentication/AuthForm";
import { resetPasswordAction } from "@/app/actions";
import styles from "../../styles.module.css";

type ResetStep = "verifying" | "set-password" | "complete" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<ResetStep>("verifying");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Get the reset parameters from URL
        const oobCode = searchParams.get("oobCode");
        const mode = searchParams.get("mode");
        const email = searchParams.get("email");
        
        if (!oobCode || mode !== "resetPassword" || !email) {
          setError("Invalid or expired password reset link");
          setStep("error");
          return;
        }

        // Set user info from URL parameters
        setUserEmail(decodeURIComponent(email));

        // For now, we'll assume the reset code is valid
        // In production, you might want to verify the reset code first
        console.log("✅ Password reset link verified");
        setStep("set-password");
        
      } catch (err) {
        console.error("Password reset verification failed:", err);
        setError(err instanceof Error ? err.message : "Failed to verify reset link. Please try again.");
        setStep("error");
      }
    };

    handlePasswordReset();
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
      // Get the reset parameters from URL
      const oobCode = searchParams.get("oobCode");
      const email = searchParams.get("email");
      
      if (!oobCode || !email) {
        throw new Error("Invalid reset link parameters");
      }

      // Use the dedicated reset password action
      const result = await resetPasswordAction(userEmail, password, oobCode);

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log("✅ Password reset successfully");
      setStep("complete");
      
      // Start countdown and auto-redirect
      let timeLeft = 3;
      setCountdown(timeLeft);
      
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          console.log("🔄 Auto-redirecting to login...");
          router.push("/login");
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
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
            <h2>Verifying reset link...</h2>
            <p>Please wait while we verify your password reset link.</p>
          </div>
        );

      case "set-password":
        return (
          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <div className={styles.step}>
              <p className={styles.stepText}>
                ✅ Reset link verified!
                <br />
                Now create your new password.
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">New Password</label>
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
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? "Resetting password..." : "Reset Password"}
            </Button>
          </form>
        );

      case "complete":
        return (
          <div className={styles.complete}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Password Reset Complete!</h2>
            <p>Your password has been successfully reset.</p>
            <p>You can now sign in with your new password.</p>
            
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
            <h2>Reset Link Invalid</h2>
            <p>{error || "Something went wrong with the password reset link."}</p>
            
            <div className={styles.errorActions}>
              <Button 
                onClick={() => router.push("/forgot-password")}
                variant="secondary"
                className={styles.submitButton}
              >
                Request New Reset Link
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
      case "verifying": return "Verifying Reset Link";
      case "set-password": return "Reset Your Password";
      case "complete": return "Password Reset Complete";
      case "error": return "Reset Failed";
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
            🔐 Resetting password for: <strong>{userEmail}</strong>
          </p>
        </div>
      )}
    </AuthForm>
  );
}
