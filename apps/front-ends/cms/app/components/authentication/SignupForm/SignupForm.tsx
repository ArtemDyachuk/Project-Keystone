"use client";

import { useState } from "react";
import { Button, Input } from "@keystone/ui";
import styles from "./styles.module.css";
import Link from "next/link";
import { AuthForm } from "../AuthForm";

type SignupStep = "email" | "verification" | "password" | "complete";

export function SignupForm() {
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
  const [successMessage, setSuccessMessage] = useState("");

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
          password: "TempPassword123!", // Temporary password for account creation
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
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setSuccessMessage("✅ Verification code resent! Check your email and spam folder.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
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
              <div className={styles.emailHelp}>
                <p className={styles.helpText}>
                  💡 <strong>Can't find the email?</strong>
                  <br />
                  • Check your spam/junk folder
                  <br />
                  • Wait up to 5 minutes for delivery
                  <br />
                  • Try the resend button below
                </p>
              </div>
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

            <div className={styles.resendSection}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleResendCode}
                disabled={loading}
                className={styles.resendButton}
              >
                📨 Resend Verification Code
              </Button>
            </div>

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
    <AuthForm title={getStepTitle()} subtitle={step !== "complete" ? `Step ${getStepNumber()}` : undefined}>
      {renderStep()}

      {error && (
        <div className={styles.error}>
          ❌ {error}
        </div>
      )}

      {successMessage && (
        <div className={styles.success}>
          {successMessage}
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
    </AuthForm>
  );
}
