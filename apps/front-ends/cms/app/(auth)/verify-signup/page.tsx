"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@keystone/ui";
import styles from "./page.module.css";

interface VerifySignupResponse {
  success: boolean;
  message: string;
  email: string;
  companyName: string;
  token: string;
}

interface CompleteSignupRequest {
  token: string;
  firstName: string;
  lastName: string;
}

export default function VerifySignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verificationData, setVerificationData] = useState<VerifySignupResponse | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"verifying" | "form" | "success">("verifying");

  useEffect(() => {
    if (!token) {
      setError("No verification token provided");
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/auth/verify-signup-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to verify token");
      }

      setVerificationData(result);
      setStep("form");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to verify token");
      setStep("verifying");
    } finally {
      setIsLoading(false);
    }
  };

  const completeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationData || !firstName.trim() || !lastName.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const request: CompleteSignupRequest = {
        token: verificationData.token,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      const response = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to complete signup");
      }

      setStep("success");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to complete signup");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "verifying") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Verifying Your Signup</h1>
          {isLoading ? (
            <div className={styles.loading}>
              <p>Verifying your signup token...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
              <Button onClick={() => router.push("/signup")}>
                Back to Signup
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (step === "form" && verificationData) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Complete Your Signup</h1>
          <p>Welcome to <strong>{verificationData.companyName}</strong>!</p>
          <p>Please provide your name to complete your account setup.</p>

          <form onSubmit={completeSignup} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Completing..." : "Complete Signup"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Signup Complete! 🎉</h1>
          <p>Your account has been created successfully!</p>
          <p>You will receive an email with a password setup link shortly.</p>
          <Button onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
