"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { config } from "@/lib/config";
import styles from "./TenantReauthModal.module.css";

interface TenantReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTenant: {
    name: string;
    gipTenantId: string;
    appTenantId: string;
  };
  onSuccess: () => void;
}

export function TenantReauthModal({ 
  isOpen, 
  onClose, 
  targetTenant, 
  onSuccess 
}: TenantReauthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log(`🔐 Re-authenticating for GIP tenant: ${targetTenant.gipTenantId}`);

      // For GIP tenant authentication, we need to redirect to the auth login page
      console.log("🔄 Redirecting to tenant-scoped login...");
      
      // Store the target tenant info
      sessionStorage.setItem('pendingTenantSwitch', JSON.stringify({
        gipTenantId: targetTenant.gipTenantId,
        appTenantId: targetTenant.appTenantId,
        tenantName: targetTenant.name
      }));
      
      // Redirect to the login page with tenant context
      // The login page is at (auth)/login/page.tsx which creates route /login in Next.js App Router
      const loginUrl = `/login?tenantId=${encodeURIComponent(targetTenant.gipTenantId)}&returnTo=${encodeURIComponent('/dashboard')}`;
      console.log("🔄 Redirecting to:", loginUrl);
      
      // Use window.location.href for a hard redirect to ensure it works
      window.location.href = loginUrl;

    } catch (error) {
      console.error("❌ Re-authentication failed:", error);
      setError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>🔐 Re-authentication Required</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.explanation}>
            Switching to <strong>"{targetTenant.name}"</strong> requires re-authentication 
            for security. You'll be redirected to sign in with the organization's context.
          </p>

          <div className={styles.tenantInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Organization:</span>
              <span className={styles.value}>{targetTenant.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Security Level:</span>
              <span className={styles.value}>GIP Multi-tenant</span>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading ? "Redirecting..." : "Continue to Sign In"}
            </button>
          </div>

          <div className={styles.securityNote}>
            <small>
              🔒 This ensures proper tenant isolation and creates a secure session 
              for "{targetTenant.name}".
            </small>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level to avoid stacking context issues
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}
