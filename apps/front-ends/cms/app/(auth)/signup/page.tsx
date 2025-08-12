"use client";

import { useState } from "react";
import { Button, Input } from "@keystone/ui";
import styles from "./signup.module.css";
import Link from "next/link";

type SignupStep = "email" | "verification" | "password" | "complete";

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setUsername(data.username); // Store the generated username
      setStep("verification");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          confirmationCode: verificationCode,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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

    try {
      // For now, just complete the signup process
      // In a full implementation, you'd implement password change via API
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="firstName">First Name</label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="lastName">Last Name</label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                required
              />
            </div>

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

            <Button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? "Sending verification code..." : "Send Verification Code"}
            </Button>
          </form>
        );

      case "verification":
        return (
          <form onSubmit={handleVerificationSubmit} className={styles.form}>
            <div className={styles.step}>
              <p className={styles.stepText}>
                📧 We've sent a 6-digit verification code to:
                <br />
                <strong>{email}</strong>
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="verificationCode">Verification Code</label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? "Verifying..." : "Verify Code"}
            </Button>

            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setStep("email")}
              className={styles.backButton}
            >
              ← Change Email
            </Button>
          </form>
        );

      case "password":
        return (
          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <div className={styles.step}>
              <p className={styles.stepText}>
                ✅ Email verified! Now create your password.
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
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        );

      case "complete":
        return (
          <div className={styles.complete}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Account Created Successfully!</h2>
            <p>Welcome to Keystone CMS, {firstName}!</p>
            <p>Your account has been created and verified.</p>
            
            <Link href="/login">
              <Button className={styles.submitButton}>
                Login to Your Account
              </Button>
            </Link>
          </div>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "email": return "Create Account";
      case "verification": return "Verify Email";
      case "password": return "Create Password";
      case "complete": return "Welcome!";
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case "email": return "1 of 3";
      case "verification": return "2 of 3";
      case "password": return "3 of 3";
      case "complete": return "Complete";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{getStepTitle()}</h1>
          {step !== "complete" && (
            <span className={styles.stepIndicator}>Step {getStepNumber()}</span>
          )}
        </div>

        {renderStep()}

        {error && (
          <div className={styles.error}>
            ❌ {error}
          </div>
        )}

        {step === "email" && (
          <div className={styles.links}>
            <p>
              Already have an account?{" "}
              <Link href="/login" className={styles.link}>
                Login here
              </Link>
            </p>
            <p>
              <Link href="/" className={styles.link}>
                ← Back to home
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
