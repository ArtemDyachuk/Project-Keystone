"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@keystone/ui";
import { Input } from "@keystone/ui";
import { useStytchB2BClient } from "@stytch/nextjs/b2b";
import styles from "./styles.module.css";
import { AuthForm } from "../AuthForm";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stytch = useStytchB2BClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL parameters
    const tokenParam = searchParams.get("token");

    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("No reset token found. Please request a new password reset link.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side validation
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    if (!token) {
      setError("No reset token found. Please request a new password reset link.");
      setLoading(false);
      return;
    }

    try {
      // Use Stytch B2B SDK for Organization flow password setup
      // This works for both password reset and initial password setup
      console.log("Processing Organization flow token:", { token: token.substring(0, 20) + "..." });
      
      const response = await stytch.passwords.resetByEmail({
        password_reset_token: token, // The token from the email link
        password: newPassword,
        session_duration_minutes: 60, // Session duration after password setup
      });

      console.log("Password reset successful:", response);
      
      // User is now authenticated, redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Password reset failed:", err);
      setError(err?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  if (!token) {
    return (
      <AuthForm title="Invalid Reset Link" subtitle="This password reset link is invalid or has expired.">
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.instructions}>
            <p>Please request a new password reset link.</p>
          </div>
          <div className={styles.links}>
            <Link href="/forgot-password" className={styles.primaryLink}>
              Request New Reset Link
            </Link>
            <Link href="/login" className={styles.link}>
              ← Back to login
            </Link>
          </div>
        </div>
      </AuthForm>
    );
  }

  return (
    <AuthForm title="Set Your Password" subtitle="Complete your account setup by choosing a password.">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="newPassword">New Password</label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />
        </div>

        <div className={styles.passwordRequirements}>
          <p className={styles.requirementsTitle}>Password requirements:</p>
          <ul className={styles.requirementsList}>
            <li className={newPassword.length >= 8 ? styles.valid : ""}>
              At least 8 characters
            </li>
            <li className={/[A-Z]/.test(newPassword) ? styles.valid : ""}>
              One uppercase letter
            </li>
            <li className={/[a-z]/.test(newPassword) ? styles.valid : ""}>
              One lowercase letter
            </li>
            <li className={/\d/.test(newPassword) ? styles.valid : ""}>
              One number
            </li>
            <li className={/[@$!%*?&_.]/.test(newPassword) ? styles.valid : ""}>
              One special character (@$!%*?&_.)
            </li>
          </ul>
        </div>

        {error && (
          <div className={styles.error}>
            ❌ {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? "Setting Password..." : "Set New Password"}
        </Button>
      </form>

      <div className={styles.links}>
        <p>
          <Link href="/forgot-password" className={styles.link}>
            Need a new reset link?
          </Link>
        </p>
        <p>
          <Link href="/login" className={styles.link}>
            ← Back to login
          </Link>
        </p>
      </div>
    </AuthForm>
  );
}
