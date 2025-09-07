"use client";

import { useState } from "react";
import styles from "./styles.module.css";
import Link from "next/link";
import { Button, Input } from "@keystone/ui";
import { AuthForm } from "../AuthForm";
import { loginAction, loginWithMfaAction } from "@/app/actions";

interface LoginFormProps {
  redirectUrl: string;
}

export function LoginForm({ redirectUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Removed checkAuth useEffect - middleware handles this now

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (mfaRequired) {
        // Handle MFA verification
        const result = await loginWithMfaAction(email, password, verificationCode, redirectUrl);
        
        if (result && !result.success) {
          setError(result.error || "MFA verification failed");
          setIsLoading(false);
          return;
        }
      } else {
        // Handle regular login
        const result = await loginAction(email, password, redirectUrl);

        // Check if MFA is required
        if (result && result.mfaRequired) {
          setMfaRequired(true);
          setIsLoading(false);
          return;
        }

        // Check if login was successful
        if (result && !result.success) {
          setError(result.error || "Login failed");
          setIsLoading(false);
          return;
        }
      }

      // If we reach here, login was successful
      // The loginAction will handle the redirect
    } catch (error) {
      // Only show error if it's not a redirect
      if (error instanceof Error && error.message !== 'NEXT_REDIRECT') {
        setError("An error occurred. Please try again.");
      }
      // If it's NEXT_REDIRECT, that means login was successful
      setIsLoading(false);
    }
  };

  return (
    <AuthForm title="Login" subtitle="Welcome back to Keystone CMS">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
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
          <label htmlFor="password">Password</label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        {mfaRequired && (
          <div className={styles.field}>
            <label htmlFor="verificationCode">Verification Code</label>
            <Input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code from your authenticator app"
              maxLength={6}
              required
            />
            <p className={styles.mfaHelp}>
              Open your authenticator app and enter the 6-digit code
            </p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            ❌ {error}
          </div>
        )}

        <Button type="submit" className={styles.submitButton} disabled={isLoading}>
          {isLoading 
            ? (mfaRequired ? "Verifying..." : "Logging in...") 
            : (mfaRequired ? "Verify & Login" : "Login")
          }
        </Button>

        <div className={styles.forgotPassword}>
          <Link href="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>
      </form>

      <div className={styles.links}>
        <p>
          Don't have an account?{" "}
          <Link href="/signup" className={styles.link}>
            Sign up here
          </Link>
        </p>
        <p>
          <Link href="/" className={styles.link}>
            ← Back to home
          </Link>
        </p>
      </div>
    </AuthForm>
  );
}
