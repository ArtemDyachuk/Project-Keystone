"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@keystone/ui";
import { Input } from "@keystone/ui";
import styles from "./styles.module.css";
import { AuthForm } from "../AuthForm";
import { forgotPasswordAction } from "@/app/actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await forgotPasswordAction(email);

      if (!result.success) {
        throw new Error(result.error);
      }

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
            <p>Please check your email for a password reset link.</p>
            <p className={styles.note}>The link will expire in 1 hour.</p>
            <p className={styles.note}>If you don't see the email, please check your spam folder.</p>
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
