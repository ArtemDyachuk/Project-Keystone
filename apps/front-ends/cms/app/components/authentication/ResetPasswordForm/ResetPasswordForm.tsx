"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@keystone/ui";
import { Input } from "@keystone/ui";
import styles from "./styles.module.css";
import { AuthForm } from "../AuthForm";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get token from URL parameters and validate it
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");

    if (token) {
      // Validate JWT token and extract email
      fetch("/api/auth/validate-reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.email) {
            setEmail(data.email);
          } else {
            setError("Invalid or expired reset link. Please request a new one.");
          }
        })
        .catch(() => {
          setError("Invalid reset link. Please request a new one.");
        });
    } else if (emailParam) {
      setEmail(emailParam);
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

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]/.test(newPassword)) {
      setError("Password must contain uppercase, lowercase, number, and special character");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/confirm-reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          confirmationCode,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthForm title="Password Reset Complete!" subtitle="Your password has been successfully updated.">
        <div className={styles.successContent}>
          <div className={styles.successIcon}>🎉</div>
          <div className={styles.instructions}>
            <p>You can now sign in with your new password.</p>
          </div>
          <div className={styles.links}>
            <Link href="/login" className={styles.primaryLink}>
              Go to Login
            </Link>
          </div>
        </div>
      </AuthForm>
    );
  }

  return (
    <AuthForm title="Reset Your Password" subtitle="Enter the verification code from your email and choose a new password.">
      <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email Address</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmationCode">Verification Code</label>
            <Input
              id="confirmationCode"
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              placeholder="Enter 6-digit code from email"
              maxLength={6}
              required
            />
          </div>

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
              <li className={/[@$!%*?&_]/.test(newPassword) ? styles.valid : ""}>
                One special character (@$!%*?&_)
              </li>
            </ul>
          </div>

          {error && (
            <div className={styles.error}>
              ❌ {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <div className={styles.links}>
          <p>
            <Link href="/forgot-password" className={styles.link}>
              Didn't receive the code? Send new one
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
