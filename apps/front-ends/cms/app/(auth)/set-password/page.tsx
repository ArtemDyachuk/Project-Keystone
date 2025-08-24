"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../styles.module.css";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const tenantId = searchParams.get("tenantId");

  useEffect(() => {
    console.log("🔍 Frontend: Received URL parameters:", { uid, tenantId });

    if (!uid) {
      setError("Missing user ID. Please use the complete invite link.");
      return;
    }

    if (!tenantId) {
      setError("Missing tenant ID. Please use the complete invite link.");
      return;
    }
  }, [uid, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    console.log("🔍 Frontend: Submitting form with data:", { uid, password, tenantId });

    // Validate password
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Check password strength
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
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid, password, tenantId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to set password");
      }

      if (result.success) {
        if (result.inviteCompleted) {
          // Invite was completed - automatically log the user in
          setSuccess("Invite accepted successfully! Logging you in...");

          try {
            // Get the user's email from the result
            const userEmail = result.user?.email;
            if (!userEmail) {
              throw new Error("User email not found");
            }

            // Automatically log the user in using their email and the password they just set
            const loginResponse = await fetch("/api/auth/signin", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: userEmail,
                password: password,
                tenantId: tenantId
              }),
            });

            const loginResult = await loginResponse.json();

            if (loginResponse.ok && loginResult.success) {
              setSuccess("Welcome! You're now logged in.");
              // Redirect to dashboard after successful login
              setTimeout(() => {
                router.push("/dashboard");
              }, 1500);
            } else {
              // If auto-login fails, redirect to login page
              setSuccess("Account created successfully! Please log in.");
              setTimeout(() => {
                router.push("/login");
              }, 1500);
            }
          } catch (error) {
            console.error("Auto-login failed:", error);
            // If auto-login fails, redirect to login page
            setSuccess("Account created successfully! Please log in.");
            setTimeout(() => {
              router.push("/login");
            }, 1500);
          }
        } else {
          // Regular password setting
          setSuccess("Password set successfully!");
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        }
      } else {
        setError(result.error || "Failed to set password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !tenantId) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.contentContainer}>
          <div className={styles.errorMessage}>
            <h2>Invalid Invite Link</h2>
            <p>This invite link is missing required information. Please contact the person who invited you.</p>
            <button onClick={() => router.push("/login")} className={styles.submitButton}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.contentContainer}>
        <div className={styles.form}>
          <h2>Set Your Password</h2>
          <p>Create a secure password for your account</p>

          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className={styles.successMessage}>
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                disabled={loading}
                className={styles.input}
              />
              <span className={styles.hint}>
                Must be at least 8 characters with uppercase, lowercase, numbers, and special characters
              </span>
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                disabled={loading}
                className={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? "Setting Password..." : "Set Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
