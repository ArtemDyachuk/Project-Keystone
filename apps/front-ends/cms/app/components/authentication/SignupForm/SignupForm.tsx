"use client";

import { useState } from "react";
import { Button, Input } from "@keystone/ui";
import styles from "./styles.module.css";
import Link from "next/link";
import { AuthForm } from "../AuthForm";
import { signupWithEmailLink } from "@/app/actions";

type SignupStep = "email" | "email-sent" | "complete";

export function SignupForm() {
  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signupWithEmailLink({
        firstName,
        lastName,
        email,
        companyName,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setSuccessMessage("✅ Verification email sent! Please check your inbox and spam folder.");
      setStep("email-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await signupWithEmailLink({
        firstName,
        lastName,
        email,
        companyName,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setSuccessMessage("✅ Verification email resent! Check your email and spam folder.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend verification email");
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
              <label htmlFor="companyName">Company Name</label>
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
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
              {loading ? "Sending verification email..." : "Send Verification Email"}
            </Button>
          </form>
        );

      case "email-sent":
        return (
          <div className={styles.emailSent}>
            <div className={styles.step}>
              <div className={styles.successIcon}>📧</div>
              <h2>Check Your Email!</h2>
              <p className={styles.stepText}>
                We've sent a verification link to:
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
                  • Make sure the email address is correct
                </p>
              </div>
            </div>

            <div className={styles.emailActions}>
              <p className={styles.instructionText}>
                <strong>Next steps:</strong>
                <br />
                1. Click the verification link in your email
                <br />
                2. You'll be redirected back here to set your password
                <br />
                3. Complete your account setup
              </p>
            </div>

            <div className={styles.resendSection}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleResendEmail}
                disabled={loading}
                className={styles.resendButton}
              >
                {loading ? "Resending..." : "📨 Resend Email"}
              </Button>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep("email");
                setSuccessMessage("");
                setError("");
              }}
              className={styles.backButton}
            >
              ← Change Email Address
            </Button>
          </div>
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
      case "email-sent": return "Check Your Email";
      case "complete": return "Welcome!";
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case "email": return "Step 1 of 2";
      case "email-sent": return "Step 2 of 2";
      case "complete": return "Complete";
    }
  };

  return (
    <AuthForm title={getStepTitle()} subtitle={step !== "complete" ? getStepNumber() : undefined}>
      {renderStep()}

      {error && step !== "email-sent" && (
        <div className={styles.error}>
          ❌ {error}
        </div>
      )}

      {successMessage && step === "email-sent" && (
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
