"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { MfaServiceClient } from "@/app/services/mfa.service";
import styles from "./MfaEnrollmentModal.module.css";

interface MfaEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "enroll" | "unenroll";
}

export function MfaEnrollmentModal({ isOpen, onClose, onSuccess, mode = "enroll" }: MfaEnrollmentModalProps) {
  const [step, setStep] = useState<"password" | "setup" | "verify" | "success">("password");
  const [password, setPassword] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [otpauthUrl, setOtpauthUrl] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("password");
      setPassword("");
      setQrCodeUrl("");
      setOtpauthUrl("");
      setSecretKey("");
      setVerificationCode("");
      setError("");
    }
  }, [isOpen]);

  // Extract secret key from OTPAUTH URL
  const extractSecretFromOtpauth = (otpauthUrl: string): string => {
    try {
      const url = new URL(otpauthUrl);
      return url.searchParams.get('secret') || '';
    } catch {
      return '';
    }
  };

  const verifyPassword = async () => {
    try {
      setIsLoading(true);
      setError("");

      if (mode === "unenroll") {
        console.log("Verifying password for MFA unenrollment...");
        const result = await MfaServiceClient.unenrollMfa(password);
        console.log("MFA unenrollment result:", result);

        if (result.success) {
          onSuccess();
          onClose();
          setPassword("");
        } else {
          setError(result.message || "Failed to disable MFA. Please check your password and try again.");
        }
      } else {
        console.log("Verifying password for MFA enrollment...");
        const result = await MfaServiceClient.startMfaEnrollment(password);
        console.log("MFA enrollment result:", result);

        if (result.success && result.otpauthUrl) {
          // Extract secret key from OTPAUTH URL
          const secret = extractSecretFromOtpauth(result.otpauthUrl);
          console.log("Extracted secret:", secret);
          console.log("OTPAUTH URL:", result.otpauthUrl);

          // Generate QR code from the OTPAUTH URL
          try {
            const qrCodeDataUrl = await QRCode.toDataURL(result.otpauthUrl, {
              width: 200,
              margin: 2,
              color: {
                dark: "#000000",
                light: "#FFFFFF"
              }
            });
            console.log("QR code generated successfully");

            setQrCodeUrl(qrCodeDataUrl);
            setOtpauthUrl(result.otpauthUrl);
            setSecretKey(secret);
            setStep("verify");
          } catch (qrError) {
            console.error("QR code generation error:", qrError);
            setError("Failed to generate QR code. Please try again.");
          }
        } else {
          console.error("MFA enrollment failed:", result);
          setError(result.message || "Failed to start MFA enrollment. Please check your password and try again.");
        }
      }
    } catch (err) {
      const action = mode === "unenroll" ? "disable MFA" : "start MFA enrollment";
      setError(`Failed to ${action}. Please check your password and try again.`);
      console.error(`MFA ${mode} error:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
    if (value.length <= 6) {
      setVerificationCode(value);
      setError("");
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const result = await MfaServiceClient.finishMfaEnrollment(verificationCode);

      if (result.success) {
        setStep("success");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.message || "Invalid verification code");
      }
    } catch (err) {
      setError("Failed to complete MFA enrollment. Please try again.");
      console.error("MFA enrollment finish error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === "verify" && verificationCode.length === 6) {
      handleVerify();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === "unenroll" ? "Disable Two-Factor Authentication" : "Enable Two-Factor Authentication"}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg className={styles.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {step === "password" && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>
                <span className={styles.stepNumber}>1</span>
                Verify Your Password
              </h3>
              <p className={styles.stepDescription}>
                {mode === "unenroll"
                  ? "Enter your current password to disable two-factor authentication:"
                  : "Enter your current password to enable two-factor authentication:"
                }
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="password">
                  Current Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your current password"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className={styles.errorMessage}>{error}</div>
              )}
            </div>
          )}

          {(step === "setup" || step === "verify") && mode === "enroll" && (
            <>
              <div className={styles.step}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>2</span>
                  Install an Authenticator App
                </h3>
                <p className={styles.stepDescription}>
                  Download and install an authenticator app like Google Authenticator,
                  Authy, or Microsoft Authenticator on your mobile device.
                </p>
              </div>

              <div className={styles.step}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>3</span>
                  Scan QR Code
                </h3>
                <p className={styles.stepDescription}>
                  Open your authenticator app and scan this QR code:
                </p>

                {isLoading ? (
                  <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <span>Generating QR code...</span>
                  </div>
                ) : error ? (
                  <div className={styles.errorMessage}>{error}</div>
                ) : (qrCodeUrl || otpauthUrl) ? (
                  <div className={styles.qrContainer}>
                    {qrCodeUrl && (
                      <div className={styles.qrCode}>
                        <Image src={qrCodeUrl} alt="MFA QR Code" width={200} height={200} />
                      </div>
                    )}

                    <div className={styles.manualEntry}>
                      <div className={styles.manualEntryTitle}>Can't scan? Enter manually:</div>
                      {secretKey && (
                        <div className={styles.secretKeyContainer}>
                          <div className={styles.secretKeyLabel}>Secret Key:</div>
                          <div className={styles.secretKey}>{secretKey}</div>
                          <button
                            className={styles.copyButton}
                            onClick={() => navigator.clipboard.writeText(secretKey)}
                          >
                            Copy Secret
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.errorMessage}>No MFA data available. Please try again.</div>
                )}
              </div>

              <div className={styles.step}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>4</span>
                  Enter Verification Code
                </h3>
                <p className={styles.stepDescription}>
                  Enter the 6-digit code from your authenticator app to complete setup:
                </p>

                <div className={styles.verificationForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="verificationCode">
                      Verification Code
                    </label>
                    <input
                      id="verificationCode"
                      type="text"
                      className={`${styles.input} ${error ? styles.inputError : ""}`}
                      value={verificationCode}
                      onChange={handleVerificationCodeChange}
                      onKeyPress={handleKeyPress}
                      placeholder="000000"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                    {error && <div className={styles.errorMessage}>{error}</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === "success" && (
            <div className={styles.success}>
              <svg className={styles.successIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className={styles.successTitle}>MFA Enabled Successfully!</h3>
              <p className={styles.successMessage}>
                Two-factor authentication has been enabled for your account.
                You'll need to use your authenticator app for future logins.
              </p>
            </div>
          )}

          <div className={styles.actions}>
            {step === "password" && (
              <>
                <button
                  className={styles.buttonSecondary}
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className={styles.buttonPrimary}
                  onClick={verifyPassword}
                  disabled={isLoading || !password.trim()}
                >
                  {isLoading ? (
                    <div className={styles.loading}>
                      <div className={styles.spinner}></div>
                      <span>{mode === "unenroll" ? "Disabling..." : "Verifying..."}</span>
                    </div>
                  ) : (
                    mode === "unenroll" ? "Disable MFA" : "Continue"
                  )}
                </button>
              </>
            )}

            {(step === "setup" || step === "verify") && (
              <>
                <button
                  className={styles.buttonSecondary}
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className={styles.buttonPrimary}
                  onClick={handleVerify}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? (
                    <div className={styles.loading}>
                      <div className={styles.spinner}></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Complete Setup"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
