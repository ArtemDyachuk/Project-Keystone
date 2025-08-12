"use client";

import { useState } from "react";
import { Button, Input } from "@keystone/ui";
import styles from "./signup.module.css";
import Link from "next/link";

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

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]/.test(password)) {
      setError("Password must contain uppercase, lowercase, number, and special character");
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
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setStep("complete");
      setSuccessMessage("Account created successfully! You can now log in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Initial signup form
  if (step === "email") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Step 1 of 3: Enter your details</p>

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

            {error && (
              <div className={styles.error}>
                ❌ {error}
              </div>
            )}

            <Button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>

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
        </div>
      </div>
    );
  }

  // Step 2: Verification code
  if (step === "verification") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Verify Your Email</h1>
          <p className={styles.subtitle}>Step 2 of 3: Enter verification code</p>

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
              </p>
            </div>
          </div>

          <form onSubmit={handleVerificationSubmit} className={styles.form}>
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

            {error && (
              <div className={styles.error}>
                ❌ {error}
              </div>
            )}

            <Button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Verifying..." : "Verify Code"}
            </Button>
          </form>

          <div className={styles.links}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("email")}
              className={styles.backButton}
            >
              ← Change Email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Set password
  if (step === "password") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Create Your Password</h1>
          <p className={styles.subtitle}>Step 3 of 3: Set your password</p>

          <div className={styles.step}>
            <p className={styles.stepText}>
              ✅ Email verified! Now create your password.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className={styles.form}>
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
                Must be at least 8 characters
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

            {error && (
              <div className={styles.error}>
                ❌ {error}
              </div>
            )}

            <Button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Step 4: Success
  if (step === "complete") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.success}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Account Created Successfully!</h2>
            <p>Welcome to Keystone CMS!</p>
            <p>Please check your email for a verification link to complete your registration.</p>

            <Link href="/login">
              <Button className={styles.submitButton}>
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
