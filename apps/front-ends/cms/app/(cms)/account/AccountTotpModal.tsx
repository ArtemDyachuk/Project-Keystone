"use client";

import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { getAuth, multiFactor, onAuthStateChanged, User, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { TotpMultiFactorGenerator } from "firebase/auth";
import { initializeApp } from "firebase/app";
import QRCode from "qrcode";
import styles from "./AccountTotpModal.module.css";

interface AccountTotpModalProps {
   onClose: () => void;
   mfaStatus: {
      enrolled: boolean;
      factors: Array<{ uid: string; displayName: string }>;
   };
   onMfaStatusChange: (status: {
      enrolled: boolean;
      factors: Array<{ uid: string; displayName: string }>;
   }) => void;
}

export function AccountTotpModal({ onClose, mfaStatus, onMfaStatusChange }: AccountTotpModalProps) {
   const auth = useMemo(() => {
      // Get Firebase config from environment variables
      const config = {
         apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
         authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
         projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };

      // Initialize Firebase if not already done
      if (!config.apiKey || !config.authDomain || !config.projectId) {
         throw new Error("Missing Firebase configuration");
      }

      try {
         return getAuth();
      } catch {
         // If getAuth fails, initialize the app first
         initializeApp(config);
         return getAuth();
      }
   }, []);

   const [qrDataUrl, setQrDataUrl] = useState<string>("");
   const [secretKey, setSecretKey] = useState<string>("");
   const [verificationCode, setVerificationCode] = useState<string>("");
   const [error, setError] = useState<string>("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [displayName, setDisplayName] = useState("Authenticator App");
   const [currentUser, setCurrentUser] = useState<User | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [needsReauth, setNeedsReauth] = useState(false);
   const [password, setPassword] = useState("");
   const [isManaging, setIsManaging] = useState(mfaStatus.enrolled);

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         setCurrentUser(user);
         setIsLoading(false);
      });

      return () => unsubscribe();
   }, [auth]);

   async function handleReauth(e: React.FormEvent) {
      e.preventDefault();
      setError("");
      setIsSubmitting(true);

      try {
         if (!currentUser?.email) throw new Error("No user email found");

         const credential = EmailAuthProvider.credential(currentUser.email, password);
         await reauthenticateWithCredential(currentUser, credential);

         setNeedsReauth(false);
         setPassword("");
         // Now try to generate TOTP or manage MFA
         if (isManaging) {
            // We're managing existing MFA, no need to generate new TOTP
            setIsManaging(true);
         } else {
            generateTotp();
         }
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Invalid password");
      } finally {
         setIsSubmitting(false);
      }
   }

   async function generateTotp() {
      if (!currentUser) return;

      let mounted = true;
      try {
         const session = await multiFactor(currentUser).getSession();
         const secret = await TotpMultiFactorGenerator.generateSecret(session);

         // Use explicit RFC-compliant otpauth URI to avoid parser quirks
         const account = encodeURIComponent(currentUser.email || "user");
         const issuer = encodeURIComponent("Keystone CMS");
         const totpUri =
            `otpauth://totp/${account}?secret=${secret.secretKey}&issuer=${issuer}`;

         const dataUrl = await QRCode.toDataURL(totpUri, {
            width: 280,
            margin: 2,
            errorCorrectionLevel: "M",
            color: {
               dark: "#000000",
               light: "#FFFFFF"
            }
         });

         if (!mounted) return;
         setQrDataUrl(dataUrl);
         setSecretKey(secret.secretKey);
         // Store full secret object for enrollment
         (window as any).__totpSecret = secret;
         setError("");
      } catch (err: unknown) {
         if (mounted) {
            const errorMessage = err instanceof Error ? err.message : "";
            if (errorMessage.includes("auth/requires-recent-login")) {
               setNeedsReauth(true);
               setError("Please re-enter your password to continue");
               // Clear any existing QR data since it's invalid
               setQrDataUrl("");
               setSecretKey("");
               delete (window as any).__totpSecret;
            } else {
               setError(errorMessage || "Failed to initialize TOTP");
            }
         }
      }

      return () => {
         mounted = false;
         delete (window as any).__totpSecret;
      };
   }

   const hasGeneratedSecretRef = useRef(false);
   useEffect(() => {
      if (!currentUser || isLoading) return;
      if (isManaging) return; // managing, not enrolling
      if (hasGeneratedSecretRef.current) return; // guard against Strict Mode double-invoke
      hasGeneratedSecretRef.current = true;
      generateTotp();
   }, [currentUser, isLoading, isManaging]);

   async function handleEnroll(e: React.FormEvent) {
      e.preventDefault();
      setError("");
      setIsSubmitting(true);
      try {
         if (!currentUser) throw new Error("No authenticated user");
         const secret = (window as any).__totpSecret;
         if (!secret) throw new Error("Missing TOTP secret. Please reopen enrollment.");

         console.log("🔍 Code entered:", verificationCode.trim(), "from:", qrDataUrl ? "QR scan" : "manual");
         const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, verificationCode.trim());
         await multiFactor(currentUser).enroll(assertion, displayName.trim() || "Authenticator App");

         // Update MFA status
         onMfaStatusChange({
            enrolled: true,
            factors: [{ uid: "new", displayName: displayName.trim() || "Authenticator App" }]
         });

         onClose();
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Invalid or expired code");
      } finally {
         setIsSubmitting(false);
      }
   }

   async function handleDisableMfa() {
      if (!currentUser) return;

      setError("");
      setIsSubmitting(true);

      try {
         // Get all enrolled factors
         const multiFactorUser = multiFactor(currentUser);
         const enrolledFactors = multiFactorUser.enrolledFactors;

         // Unenroll all factors
         for (const factor of enrolledFactors) {
            await multiFactorUser.unenroll(factor);
         }

         // Refresh session cookie to prevent invalidation
         const idToken = await currentUser.getIdToken(true); // Force refresh
         await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
         });

         // Update MFA status
         onMfaStatusChange({
            enrolled: false,
            factors: []
         });

         onClose();
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Failed to disable MFA");
      } finally {
         setIsSubmitting(false);
      }
   }

   if (isLoading) {
      return (
         <div className={styles.modal}>
            <div className={styles.modalContent}>
               <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                     {isManaging ? "Manage MFA" : "Set up TOTP"}
                  </h3>
                  <button onClick={onClose} className={styles.closeButton} aria-label="Close">×</button>
               </div>
               <div className={styles.loadingText}>Loading authentication state...</div>
            </div>
         </div>
      );
   }

   if (!currentUser) {
      return (
         <div className={styles.modal}>
            <div className={styles.modalContent}>
               <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                     {isManaging ? "Manage MFA" : "Set up TOTP"}
                  </h3>
                  <button onClick={onClose} className={styles.closeButton} aria-label="Close">×</button>
               </div>
               <div className={styles.unauthText}>
                  <p>❌ Not authenticated</p>
                  <p>Please refresh the page or try logging in again.</p>
               </div>
            </div>
         </div>
      );
   }

   if (needsReauth) {
      return (
         <div className={styles.modal}>
            <div className={styles.modalContent}>
               <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                     {isManaging ? "Manage MFA" : "Set up TOTP"}
                  </h3>
                  <button onClick={onClose} className={styles.closeButton} aria-label="Close">×</button>
               </div>

               <p className={styles.reauthText}>
                  For security reasons, please re-enter your password to {isManaging ? "manage" : "set up"} TOTP.
               </p>

               <form onSubmit={handleReauth}>
                  <input
                     type="password"
                     placeholder="Enter your password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className={styles.passwordInput}
                     required
                  />
                  <div className={styles.reauthButtonGroup}>
                     <button type="button" onClick={onClose} className={`${styles.button} ${styles.secondaryButton}`}>
                        Cancel
                     </button>
                     <button type="submit" disabled={isSubmitting || !password.trim()} className={`${styles.button} ${styles.primaryButton}`}>
                        {isSubmitting ? "Verifying..." : "Continue"}
                     </button>
                  </div>
                  {error && <div className={styles.error}>{error}</div>}
               </form>
            </div>
         </div>
      );
   }

   // Show MFA management interface
   if (isManaging) {
      return (
         <div className={styles.modal}>
            <div className={styles.modalContent}>
               <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Manage MFA</h3>
                  <button onClick={onClose} className={styles.closeButton} aria-label="Close">×</button>
               </div>

               <div className={styles.mfaManagement}>
                  <h4>Current MFA Factors</h4>
                  {mfaStatus.factors.map(factor => (
                     <div key={factor.uid} className={styles.mfaFactorItem}>
                        <span>🔐 {factor.displayName}</span>
                        <span className={styles.factorStatus}>Active</span>
                     </div>
                  ))}

                  <div className={styles.mfaActions}>
                     <button
                        onClick={handleDisableMfa}
                        disabled={isSubmitting}
                        className={`${styles.button} ${styles.dangerButton}`}
                     >
                        {isSubmitting ? "Disabling..." : "Disable MFA"}
                     </button>
                     <button
                        onClick={onClose}
                        className={`${styles.button} ${styles.secondaryButton}`}
                     >
                        Cancel
                     </button>
                  </div>

                  {error && <div className={styles.error}>{error}</div>}
               </div>
            </div>
         </div>
      );
   }

   // Show TOTP enrollment interface
   return (
      <div className={styles.modal}>
         <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
               <h3 className={styles.modalTitle}>Set up TOTP</h3>
               <button onClick={onClose} className={styles.closeButton} aria-label="Close">×</button>
            </div>

            <ol className={styles.instructions}>
               <li>Open your authenticator app (Google Authenticator, 1Password, etc.).</li>
               <li>Scan the QR code or enter the secret key manually.</li>
               <li>Enter the 6‑digit code to complete enrollment.</li>
            </ol>

            <div className={styles.qrContainer}>
               {qrDataUrl ? (
                  <img src={qrDataUrl} alt="TOTP QR" className={styles.qrCode} />
               ) : (
                  <div className={styles.qrPlaceholder}>
                     {error ? "Failed to generate" : "Generating…"}
                  </div>
               )}
            </div>

            {secretKey && (
               <div className={styles.secretKey}>
                  Secret: {secretKey}
               </div>
            )}

            <form onSubmit={handleEnroll} className={styles.form}>
               <div className={styles.inputGroup}>
                  <input
                     type="text"
                     placeholder="Display name (optional)"
                     value={displayName}
                     onChange={(e) => setDisplayName(e.target.value)}
                     className={styles.input}
                  />
               </div>
               <div className={styles.buttonGroup}>
                  <input
                     type="text"
                     inputMode="numeric"
                     pattern="[0-9]*"
                     placeholder="6‑digit code"
                     value={verificationCode}
                     onChange={(e) => setVerificationCode(e.target.value)}
                     className={styles.input}
                  />
                  <button type="submit" disabled={isSubmitting || verificationCode.trim().length === 0} className={`${styles.button} ${styles.primaryButton}`}>
                     {isSubmitting ? "Enrolling…" : "Enroll"}
                  </button>
               </div>
               {error && <div className={styles.error}>{error}</div>}
            </form>
         </div>
      </div>
   );
}


