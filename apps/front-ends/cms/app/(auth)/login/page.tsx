"use client";

import { useState } from "react";
import { Button, Input } from "@keystone/ui";
import { signInUser, redirectTo } from "../../../lib/auth-client";
import styles from "./login.module.css";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await signInUser(email, password);

      if (!result.success) {
        throw new Error(result.error || "Login failed");
      }

      setSuccess("Login successful! 🎉");
      console.log("User logged in:", result.user);
      
      // Wait a moment to show success message, then redirect
      setTimeout(() => {
        redirectTo("/");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Login</h1>
        <p className={styles.subtitle}>Welcome back to Keystone CMS</p>

        <form onSubmit={handleLogin} className={styles.form}>
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

          {success && (
            <div className={styles.success}>
              ✅ {success}
            </div>
          )}

          <Button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? "Signing in..." : "Login"}
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
      </div>
    </div>
  );
}
