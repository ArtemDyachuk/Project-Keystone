"use client";

import { useState } from "react";
import { MfaEnrollmentModal } from "./MfaEnrollmentModal";
import styles from "./MfaManagement.module.css";

interface MfaStatus {
  success: boolean;
  mfaEnabled: boolean;
  mfaEnrolledAt?: number;
  message?: string;
}

interface MfaManagementProps {
  initialMfaStatus: MfaStatus;
}

export function MfaManagement({ initialMfaStatus }: MfaManagementProps) {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>(initialMfaStatus);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"enroll" | "unenroll">("enroll");
  const [error, setError] = useState<string>("");

  const handleEnableMfa = () => {
    setModalMode("enroll");
    setIsModalOpen(true);
  };

  const handleDisableMfa = () => {
    setModalMode("unenroll");
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    if (modalMode === "enroll") {
      // Update MFA status after successful enrollment
      setMfaStatus({
        success: true,
        mfaEnabled: true,
        mfaEnrolledAt: Math.floor(Date.now() / 1000)
      });
    } else {
      // Update MFA status after successful unenrollment
      setMfaStatus({
        success: true,
        mfaEnabled: false
      });
    }
    setError("");
  };

  const formatEnrollmentDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };


  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Two-Factor Authentication</h2>
          <div className={`${styles.status} ${mfaStatus.mfaEnabled ? styles.statusEnabled : styles.statusDisabled}`}>
            <svg className={styles.statusIcon} fill="currentColor" viewBox="0 0 20 20">
              {mfaStatus.mfaEnabled ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            {mfaStatus.mfaEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>

        <p className={styles.description}>
          Two-factor authentication adds an extra layer of security to your account. 
          When enabled, you'll need to enter a verification code from your authenticator app 
          in addition to your password when signing in.
        </p>

        {mfaStatus.mfaEnabled && mfaStatus.mfaEnrolledAt && (
          <div className={styles.enrollmentInfo}>
            <div className={styles.enrollmentInfoTitle}>Enrolled on</div>
            <p className={styles.enrollmentInfoText}>
              {formatEnrollmentDate(mfaStatus.mfaEnrolledAt)}
            </p>
          </div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <div className={styles.actions}>
          {mfaStatus.mfaEnabled ? (
            <button
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={handleDisableMfa}
            >
              <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Disable MFA
            </button>
          ) : (
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleEnableMfa}
            >
              <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Enable MFA
            </button>
          )}
        </div>
      </div>

      <MfaEnrollmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        mode={modalMode}
      />
    </>
  );
}
