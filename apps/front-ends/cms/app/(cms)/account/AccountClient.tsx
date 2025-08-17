"use client";

import { useState, useEffect, useMemo } from "react";
import { getAuth, multiFactor, onAuthStateChanged, User } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { AccountTotpModal } from "./AccountTotpModal";
import styles from "./page.module.css";

export function AccountClient() {
   const [currentUser, setCurrentUser] = useState<User | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [showTotpModal, setShowTotpModal] = useState(false);
   const [mfaStatus, setMfaStatus] = useState<{
      enrolled: boolean;
      factors: Array<{ uid: string; displayName: string }>;
   }>({ enrolled: false, factors: [] });

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

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         setCurrentUser(user);
         setIsLoading(false);
      });

      return () => unsubscribe();
   }, [auth]);

   useEffect(() => {
      if (!currentUser) return;

      async function checkMfaStatus() {
         try {
            if (!currentUser) return;
            
            const multiFactorUser = multiFactor(currentUser);
            const enrolledFactors = multiFactorUser.enrolledFactors;
            
            setMfaStatus({
               enrolled: enrolledFactors.length > 0,
               factors: enrolledFactors.map(factor => ({
                  uid: factor.uid,
                  displayName: factor.displayName || "Unknown"
               }))
            });
         } catch (error) {
            console.error("Failed to check MFA status:", error);
            setMfaStatus({ enrolled: false, factors: [] });
         }
      }

      checkMfaStatus();
   }, [currentUser]);

   if (isLoading) {
      return <div>Loading account information...</div>;
   }

   if (!currentUser) {
      return <div>Please log in to view your account.</div>;
   }

   return (
      <>
         <div className={styles.container}>
            <h1 className={styles.title}>Account Settings</h1>
            
            <div className={styles.section}>
               <h2 className={styles.sectionTitle}>Profile Information</h2>
               <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                     <label>Email</label>
                     <span>{currentUser.email}</span>
                  </div>
                  <div className={styles.infoItem}>
                     <label>Email Verified</label>
                     <span>{currentUser.emailVerified ? "✅ Yes" : "❌ No"}</span>
                  </div>
                  <div className={styles.infoItem}>
                     <label>Account Created</label>
                     <span>{currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : "Unknown"}</span>
                  </div>
                  <div className={styles.infoItem}>
                     <label>Last Sign In</label>
                     <span>{currentUser.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : "Unknown"}</span>
                  </div>
               </div>
            </div>

            <div className={styles.section}>
               <h2 className={styles.sectionTitle}>Security</h2>
               <div className={styles.securityGrid}>
                  <div className={styles.securityItem}>
                     <div className={styles.securityInfo}>
                        <h3>Multi-Factor Authentication</h3>
                        <p>
                           {mfaStatus.enrolled 
                              ? `✅ Enabled (${mfaStatus.factors.length} factor${mfaStatus.factors.length > 1 ? 's' : ''})`
                              : "❌ Not enabled"
                           }
                        </p>
                        {mfaStatus.enrolled && mfaStatus.factors.length > 0 && (
                           <div className={styles.mfaFactors}>
                              {mfaStatus.factors.map(factor => (
                                 <div key={factor.uid} className={styles.mfaFactor}>
                                    <span>🔐 {factor.displayName}</span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                     <button
                        onClick={() => setShowTotpModal(true)}
                        className={styles.actionButton}
                     >
                        {mfaStatus.enrolled ? "Manage MFA" : "Set up TOTP"}
                     </button>
                  </div>
               </div>
            </div>

            <div className={styles.section}>
               <h2 className={styles.sectionTitle}>Tenant Access</h2>
               <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                     <label>Selected Tenant</label>
                     <span>Tenant_owner</span>
                  </div>
                  <div className={styles.infoItem}>
                     <label>Total Tenants</label>
                     <span>1</span>
                  </div>
                  <div className={styles.infoItem}>
                     <label>Current Roles</label>
                     <span>Owner</span>
                  </div>
                  <div className={styles.infoItem}>
                     <label>Tenant IDs</label>
                     <span>a0e650d1c30745</span>
                  </div>
               </div>
            </div>

            <div className={styles.actions}>
               <button className={styles.editButton}>Edit Account</button>
            </div>
         </div>

         {showTotpModal && (
            <AccountTotpModal
               onClose={() => setShowTotpModal(false)}
               mfaStatus={mfaStatus}
               onMfaStatusChange={setMfaStatus}
            />
         )}
      </>
   );
}
