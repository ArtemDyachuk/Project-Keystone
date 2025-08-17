"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, User, signInWithEmailAndPassword, getMultiFactorResolver, MultiFactorResolver } from "firebase/auth";
import { TotpMultiFactorGenerator } from "firebase/auth";
import { initializeApp } from "firebase/app";
import styles from "./MfaTotpModal.module.css";

interface MfaTotpModalProps {
   email: string;
   password: string;
   redirectUrl: string;
   onClose: () => void;
   onSuccess: () => void;
}

export function MfaTotpModal({ email, password, redirectUrl, onClose, onSuccess }: MfaTotpModalProps) {
   const auth = useMemo(() => {
      const config = {
         apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
         authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
         projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      if (!config.apiKey || !config.authDomain || !config.projectId) {
         throw new Error("Missing Firebase configuration");
      }
      try {
         return getAuth();
      } catch {
         initializeApp(config);
         return getAuth();
      }
   }, []);

   const [verificationCode, setVerificationCode] = useState("");
   const [error, setError] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [currentUser, setCurrentUser] = useState<User | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
   const [totpUid, setTotpUid] = useState<string>("");

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         setCurrentUser(user);
      });
      return () => unsubscribe();
   }, [auth]);

   // Prepare resolver
   useEffect(() => {
      let cancelled = false;
      async function prepare() {
         setError("");
         setIsLoading(true);
         try {
            // Trigger sign-in to get MultiFactorError and resolver
            await signInWithEmailAndPassword(auth, email, password);
            // If it succeeds, create session and redirect
            const idToken = await auth.currentUser?.getIdToken();
            if (idToken) {
               await fetch("/api/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken }),
               });
            }
            if (!cancelled) {
               onClose();
               window.location.assign(redirectUrl);
            }
         } catch (e: any) {
            if (e?.code === "auth/multi-factor-auth-required") {
               try {
                  const r = getMultiFactorResolver(auth, e);
                  const totpHint = r.hints.find((h: any) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
                  if (!totpHint) {
                     throw new Error("No TOTP factor enrolled for this account");
                  }
                  if (!cancelled) {
                     setResolver(r);
                     setTotpUid((totpHint as any).uid);
                     setIsLoading(false);
                  }
               } catch (err) {
                  if (!cancelled) {
                     setError(err instanceof Error ? err.message : "Failed to prepare MFA");
                     setIsLoading(false);
                  }
               }
            } else {
               if (!cancelled) {
                  setError(e instanceof Error ? e.message : "Failed to sign in");
                  setIsLoading(false);
               }
            }
         }
      }
      prepare();
      return () => {
         cancelled = true;
      };
   }, [auth, email, password, redirectUrl, onClose]);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError("");
      setIsSubmitting(true);
      try {
         if (!resolver || !totpUid) throw new Error("MFA not ready");
         const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpUid, verificationCode.trim());
         const cred = await resolver.resolveSignIn(assertion);
         const idToken = await cred.user.getIdToken();
         await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
         });
         onSuccess();
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Invalid code");
      } finally {
         setIsSubmitting(false);
      }
   }

   if (isLoading) {
      return (
         <div className={styles.modal}>
            <div className={styles.modalContent}>
               <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>TOTP Verification</h3>
                  <button onClick={onClose} className={styles.closeButton} aria-label="Close">×</button>
               </div>
               <div className={styles.loadingText}>Preparing your second factor…</div>
            </div>
         </div>
      );
   }

   if (!currentUser && !resolver) {
      return (
         <div className={styles.modal}>
            <div className={styles.modalContent}>
               <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>TOTP Verification</h3>
                  <button onClick={onClose} className={styles.closeButton} aria-label="Close">×</button>
               </div>
               <div className={styles.error}>Could not initialize MFA. Please try again.</div>
            </div>
         </div>
      );
   }

   return (
      <div className={styles.modal}>
         <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
               <h3 className={styles.modalTitle}>TOTP Verification</h3>
               <button onClick={onClose} className={styles.closeButton} aria-label="Close">×</button>
            </div>
            <p className={styles.description}>
               Enter the 6‑digit code from your authenticator app.
            </p>
            <form onSubmit={handleSubmit} className={styles.form}>
               <div className={styles.inputGroup}>
                  <input
                     type="text"
                     inputMode="numeric"
                     pattern="[0-9]*"
                     placeholder="000000"
                     value={verificationCode}
                     onChange={(e) => setVerificationCode(e.target.value)}
                     className={styles.input}
                     maxLength={6}
                     required
                  />
               </div>
               <div className={styles.inputGroup}>
                  <button type="submit" disabled={isSubmitting || verificationCode.trim().length !== 6} className={`${styles.button} ${styles.primaryButton}`}>
                     {isSubmitting ? "Verifying..." : "Verify"}
                  </button>
               </div>
               {error && <div className={styles.error}>{error}</div>}
            </form>
         </div>
      </div>
   );
}


