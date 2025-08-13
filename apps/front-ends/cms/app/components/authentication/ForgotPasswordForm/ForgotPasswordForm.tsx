"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@keystone/ui";
import { Input } from "@keystone/ui";
import styles from "./styles.module.css";
import { AuthForm } from "../AuthForm";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setResetLink(data.resetLink || "");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthForm title="Check Your Email" subtitle={`We've sent a password reset link to: ${email}`}>
        <div className={styles.successContent}>
          <div className={styles.successIcon}>📧</div>
          <div className={styles.instructions}>
            <p>Please check your email for a 6-digit verification code.</p>
            <p>Or use this direct reset link:</p>
            {resetLink && (
              <div className={styles.resetLinkContainer}>
                <a href={resetLink} className={styles.resetLink}>
                  🔗 Click here to reset your password
                </a>
              </div>
            )}
            <p className={styles.note}>The link will expire in 1 hour.</p>
          </div>
          <div className={styles.links}>
            <Link href="/login" className={styles.link}>
              ← Back to login
            </Link>
          </div>
        </div>
      </AuthForm>
    );
  }

  return (
    <AuthForm title="Reset Password" subtitle="Enter your email address and we'll send you a link to reset your password.">
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

          {error && (
            <div className={styles.error}>
              ❌ {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className={styles.links}>
          <p>
            Remember your password?{" "}
            <Link href="/login" className={styles.link}>
              Back to login
            </Link>
          </p>
        </div>
    </AuthForm>
  );
}
