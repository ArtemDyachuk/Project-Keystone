"use client";

import { useState, useRef, useEffect } from "react";
import { Tenant } from "../types";
import { updateSelectedTenantAndRedirect } from "@/app/actions/tenant.actions";
import { FullPageLoader } from "@/app/components/loaders";
import { useRouter } from "next/navigation";
import styles from "./TenantSwitcher.module.css";

interface TenantSwitcherClientProps {
  selectedTenant: Tenant | null;
  userTenants: Tenant[];
}

export function TenantSwitcherClient({ selectedTenant, userTenants }: TenantSwitcherClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
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

  const handleTenantSelect = async (tenant: Tenant) => {
    // Don't update if it's already selected
    if (selectedTenant?._id === tenant._id) {
      setIsOpen(false);
      return;
    }

    try {
      setIsUpdating(true);

      const result = await updateSelectedTenantAndRedirect(tenant._id!);

      if (result?.success) {
        // Clear loading state before navigation
        setIsUpdating(false);
        setIsOpen(false);

        // Navigate to dashboard with fresh tenant context
        router.push("/dashboard");
      } else {
        throw new Error("Server action did not complete successfully");
      }
    } catch (error) {
      console.error("Failed to update selected tenant:", error);
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
