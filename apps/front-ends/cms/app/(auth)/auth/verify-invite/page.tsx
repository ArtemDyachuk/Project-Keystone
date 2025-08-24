"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@keystone/ui";
import styles from "./page.module.css";

interface VerifyInviteResponse {
   success: boolean;
   message: string;
   email: string;
   firstName?: string;
   lastName?: string;
   roles?: string[];
   token: string;
}

export default function VerifyInvitePage() {
   const router = useRouter();
   const searchParams = useSearchParams();
   const token = searchParams.get("token");

   const [step, setStep] = useState<"verifying" | "completing" | "password-setup" | "auto-login" | "success" | "error">("verifying");
   const [verificationData, setVerificationData] = useState<VerifyInviteResponse | null>(null);
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [error, setError] = useState<string>("");

   useEffect(() => {
      if (!token) {
         setError("No verification token provided");
         setStep("error");
         return;
      }
      verifyToken();
   }, [token]);

   const verifyToken = async () => {
      try {
         const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-invite-token`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
         });

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Token verification failed");
         }

         const data: VerifyInviteResponse = await response.json();
         setVerificationData(data);
         setStep("password-setup");
      } catch (error) {
         setError(error instanceof Error ? error.message : "Token verification failed");
         setStep("error");
      }
   };

   const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!verificationData || !password.trim()) return;

      // Validate password confirmation
      if (password !== confirmPassword) {
         setError("Passwords do not match");
         return;
      }

      // Validate password strength
      if (password.length < 8) {
         setError("Password must be at least 8 characters long");
         return;
      }

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
         setError("Password must contain uppercase, lowercase, numbers, and special characters");
         return;
      }

      setStep("completing");

      try {
         const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/complete-invite`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               token,
               password: password.trim(),
            }),
         });

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to accept invite");
         }

         // Show auto-login step
         setStep("auto-login");

         // Auto-login after successful invite acceptance
         await autoLogin();
      } catch (error) {
         setError(error instanceof Error ? error.message : "Failed to accept invite");
         setStep("error");
      }
   };

   const autoLogin = async () => {
      if (!verificationData) return;

      try {
         console.log("🔄 Attempting auto-login for:", verificationData.email);

         // Wait a moment for the password to be fully set
         await new Promise(resolve => setTimeout(resolve, 1000));

         // Use server action for proper session management
         const { autoLogin: autoLoginAction } = await import("@/app/actions/auth.actions");
         const result = await autoLoginAction({
            email: verificationData.email,
            password: password,
         });

         if (!result.success) {
            throw new Error(result.error || "Auto-login failed");
         }

         console.log("✅ Auto-login successful:", result.data);

         // Wait a moment for cookies to be set
         await new Promise(resolve => setTimeout(resolve, 1000));

         console.log("🚀 Redirecting to dashboard...");
         // Redirect to dashboard on successful login
         router.push("/dashboard");
      } catch (error) {
         console.error("❌ Auto-login failed:", error);

         // Try one more time with a longer delay
         try {
            console.log("🔄 Retrying auto-login with longer delay...");
            await new Promise(resolve => setTimeout(resolve, 2000));

            const { autoLogin: autoLoginAction } = await import("@/app/actions/auth.actions");
            const retryResult = await autoLoginAction({
               email: verificationData.email,
               password: password,
            });

            if (retryResult.success) {
               console.log("✅ Retry auto-login successful!");
               await new Promise(resolve => setTimeout(resolve, 1000));
               router.push("/dashboard");
               return;
            }
         } catch (retryError) {
            console.error("❌ Retry auto-login also failed:", retryError);
         }

         // If all attempts fail, try to check if we're actually logged in
         try {
            console.log("🔄 Checking if user is actually logged in...");
            const sessionCheck = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
               credentials: "include",
            });

            if (sessionCheck.ok) {
               console.log("✅ User is actually logged in! Redirecting to dashboard...");
               router.push("/dashboard");
               return;
            }
         } catch (sessionError) {
            console.error("❌ Session check failed:", sessionError);
         }

         // If all attempts fail, show error and let user manually login
         setError(`Auto-login failed: ${error instanceof Error ? error.message : "Unknown error"}. Please login manually.`);
         setStep("error");
      }
   };

   if (step === "verifying") {
      return (
         <div className={styles.container}>
            <div className={styles.card}>
               <h1>Verifying Your Invite</h1>
               <p>Please wait while we verify your invite token...</p>
            </div>
         </div>
      );
   }

   if (step === "error") {
      return (
         <div className={styles.container}>
            <div className={styles.card}>
               <h1>Invite Verification Failed</h1>
               <p className={styles.error}>{error}</p>
               <Button onClick={() => router.push("/login")} className={styles.button}>
                  Go to Login
               </Button>
            </div>
         </div>
      );
   }

   if (step === "completing") {
      return (
         <div className={styles.container}>
            <div className={styles.card}>
               <h1>Accepting Your Invite</h1>
               <p>Please wait while we set up your account...</p>
            </div>
         </div>
      );
   }

   if (step === "auto-login") {
      return (
         <div className={styles.container}>
            <div className={styles.card}>
               <h1>Logging You In</h1>
               <p>Invite accepted successfully! Now logging you in automatically...</p>
               <div className={styles.loading}>
                  <p>Please wait while we log you in...</p>
                  <p>You'll be redirected to your dashboard shortly.</p>
               </div>
            </div>
         </div>
      );
   }

   if (step === "success") {
      return (
         <div className={styles.container}>
            <div className={styles.card}>
               <h1>Invite Accepted! 🎉</h1>
               <p>Your account has been created successfully!</p>
               <p>You can now login with your email and password.</p>
               <div className={styles.buttonGroup}>
                  <Button onClick={() => router.push("/login")} className={styles.button}>
                     Go to Login
                  </Button>
                  <Button onClick={() => router.push("/dashboard")} className={`${styles.button} ${styles.secondaryButton}`}>
                     Try Dashboard
                  </Button>
               </div>
            </div>
         </div>
      );
   }

   if (step === "password-setup" && verificationData) {
      return (
         <div className={styles.container}>
            <div className={styles.card}>
               <h1>Accept Your Invite</h1>
               <p>Welcome to the team!</p>
               <p>Please set a password to complete your account setup:</p>

               {error && <div className={styles.error}>{error}</div>}

               <form onSubmit={handlePasswordSubmit} className={styles.form}>
                  <div className={styles.formGroup}>
                     <label htmlFor="password">Password</label>
                     <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className={styles.input}
                        placeholder="Enter your password"
                     />
                     <small className={styles.helpText}>
                        Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters
                     </small>
                  </div>

                  <div className={styles.formGroup}>
                     <label htmlFor="confirmPassword">Confirm Password</label>
                     <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={styles.input}
                        placeholder="Confirm your password"
                     />
                  </div>

                  <Button type="submit" className={styles.button}>
                     Accept Invite & Complete Setup
                  </Button>
               </form>
            </div>
         </div>
      );
   }

   return null;
}
