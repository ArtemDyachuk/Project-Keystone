"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./styles.module.css";
import Link from "next/link";
import { Button, Input } from "@keystone/ui";
import { AuthForm } from "../AuthForm";

interface LoginFormProps {
  redirectUrl: string;
}

export function LoginForm({ redirectUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push(redirectUrl);
      } else {
        const data = await response.json();

        // Handle Firebase-specific errors
        if (data.error?.includes("email-not-verified")) {
          setError("Please verify your email address before signing in. Check your inbox for the verification link.");
        } else if (data.error?.includes("user-not-found")) {
          setError("No account found with this email. Please sign up first.");
        } else if (data.error?.includes("wrong-password")) {
          setError("Incorrect password. Please try again.");
        } else {
          setError(data.error || "Login failed");
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm title="Sign In" subtitle="Welcome back to Keystone CMS">
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

        {error && (
          <div className={styles.error}>
            ❌ {error}
          </div>
        )}

        <Button type="submit" className={styles.submitButton} disabled={isLoading}>
          {isLoading ? "Signing In..." : "Sign In"}
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
