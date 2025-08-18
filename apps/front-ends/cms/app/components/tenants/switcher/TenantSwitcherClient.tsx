"use client";

import { useState, useRef, useEffect } from "react";
import { Tenant } from "../types";

import { FullPageLoader } from "@/app/components/loaders";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";
import { apiFetch, isServiceUnavailable, isForbiddenError } from "@/app/lib/fetcher";
import { TenantReauthModal } from "./TenantReauthModal";
import styles from "./TenantSwitcher.module.css";

interface TenantSwitcherClientProps {
  selectedTenant: Tenant | null;
  userTenants: Tenant[];
}

export function TenantSwitcherClient({ selectedTenant, userTenants }: TenantSwitcherClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reauthModal, setReauthModal] = useState<{
    isOpen: boolean;
    targetTenant?: {
      name: string;
      gipTenantId: string;
      appTenantId: string;
    };
  }>({ isOpen: false });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

    /**
   * Handle re-authentication flow for GIP tenant switching
   */
  const handleReauthFlow = async (gipTenantId: string, appTenantId: string, tenantName: string) => {
    console.log("🔐 Starting re-authentication flow for GIP tenant switch");
    
    // Stop the loading spinner and close dropdown
    setIsUpdating(false);
    setIsOpen(false);
    
    // Open the re-auth modal
    setReauthModal({
      isOpen: true,
      targetTenant: {
        name: tenantName,
        gipTenantId,
        appTenantId,
      }
    });
  };

  const handleTenantSelect = async (tenant: Tenant) => {
    // Don't update if it's already selected (idempotent check)
    if (selectedTenant?._id === tenant._id) {
      console.log("ℹ️ Already on target tenant:", tenant.name);
      setIsOpen(false);
      return;
    }

    try {
      setIsUpdating(true);

      console.log("🔄 Switching to tenant:", tenant.name);
      console.log("🔄 This will switch both app-level tenant and GIP tenant context");

      // Use enhanced fetcher with CSRF and retry logic
      const response = await apiFetch(`${config.apiBaseUrl}/api/tenants/switch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tenantId: tenant._id }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Successfully switched to tenant:", tenant.name, result);
        console.log("✅ Redis session updated with new tenant context");

        // Navigate to dashboard with fresh tenant context
        router.push("/dashboard");
        router.refresh(); // Force a refresh to get updated data
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("❌ Failed to switch tenant:", errorData);

        // Handle re-auth required for GIP tenant switching
        if (response.status === 401 && errorData.code === 'REAUTH_REQUIRED') {
          console.log("🔐 Re-authentication required for GIP tenant switch");
          console.log(`   Target GIP tenant: ${errorData.gipTenantId}`);
          console.log(`   Target app tenant: ${errorData.appTenantId}`);

          await handleReauthFlow(errorData.gipTenantId, errorData.appTenantId, tenant.name);
          return; // Exit early, handleReauthFlow will manage the flow
        }

        // Show specific error messages for other cases
        if (response.status === 401) {
          if (errorData.message?.includes('MFA')) {
            alert("MFA step-up required: You need to complete multi-factor authentication to switch to this organization");
          } else {
            alert("Authentication required: Please sign in again to switch organizations");
          }
        } else if (response.status === 403) {
          alert("Access denied: You don't have permission to access this organization");
        } else {
          alert(errorData.message || "Failed to switch organization");
        }
      }

      setIsUpdating(false);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch tenant:", error);

      // Handle specific error types
      if (isServiceUnavailable(error)) {
        alert("Service temporarily unavailable. Please try again in a moment.");
      } else if (isForbiddenError(error)) {
        alert("Access denied: You don't have permission to access this organization");
      } else {
        alert("Failed to switch organization. Please try again.");
      }

      setIsUpdating(false);
      setIsOpen(false);
    }
  };



  return (
    <>
      <FullPageLoader
        isVisible={isUpdating}
        title="Switching Organization"
        description="Updating your workspace data..."
      />

      {reauthModal.targetTenant && (
        <TenantReauthModal
          isOpen={reauthModal.isOpen}
          onClose={() => setReauthModal({ isOpen: false })}
          targetTenant={reauthModal.targetTenant}
          onSuccess={() => {
            setReauthModal({ isOpen: false });
            // The modal handles navigation and refresh
          }}
        />
      )}

      <div className={styles.container} ref={dropdownRef}>
        {/* Custom Dropdown Button */}
        <button
          className={styles.dropdownButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Switch organizations"
          disabled={isUpdating}
        >
          <span className={styles.selectedTenant}>
            {userTenants.length === 0 ? "No Organizations" : (selectedTenant ? selectedTenant.name : "Select Organization")}
          </span>
          <span className={`${styles.dropdownArrow} ${isOpen ? styles.arrowUp : ""}`}>
            ▼
          </span>
        </button>

        {/* Custom Dropdown Menu */}
        {isOpen && (
          <div className={styles.dropdownMenu}>
            {/* Header */}
            <div className={styles.dropdownHeader}>
              <h3>Switch Organizations</h3>
              {userTenants.length > 0 && (
                <p>Select an organization to work with</p>
              )}
            </div>

            {/* Tenant List */}
            <div className={styles.tenantList}>
              {userTenants.length === 0 ? (
                <div className={styles.noTenants}>
                  Create your first organization to get started
                </div>
              ) : (
                userTenants.map((tenant) => (
                  <button
                    key={tenant._id || 'unknown'}
                    className={`${styles.tenantOption} ${selectedTenant?._id === tenant._id ? styles.selected : ""
                      }`}
                    onClick={() => handleTenantSelect(tenant)}
                    disabled={isUpdating}
                  >
                    <span className={styles.tenantName}>{tenant.name}</span>
                    {selectedTenant?._id === tenant._id && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className={styles.dropdownFooter}>
              <a href="/tenants" className={styles.manageButton}>
                Manage Tenants
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
