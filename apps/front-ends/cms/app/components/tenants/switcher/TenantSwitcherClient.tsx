"use client";

import { useState, useRef, useEffect } from "react";
import { Tenant } from "../types";
import styles from "./TenantSwitcher.module.css";

interface TenantSwitcherClientProps {
  selectedTenant: Tenant | null;
  userTenants: Tenant[];
}

export function TenantSwitcherClient({ selectedTenant, userTenants }: TenantSwitcherClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      
      // Call backend API to update Cognito
      const response = await fetch("/api/tenants/switch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant._id }),
      });
      
      if (response.ok) {
        console.log("Successfully updated selected tenant to:", tenant.name);
        // Refresh the page to get updated data from server
        window.location.reload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update selected tenant");
      }
    } catch (error) {
      console.error("Failed to update selected tenant:", error);
      // You could add a toast notification here for better UX
      alert(`Failed to switch to ${tenant.name}. Please try again.`);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  if (userTenants.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noTenants}>
          <span>No organizations</span>
          <a href="/tenants/create" className={styles.createLink}>
            Create Organization
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      {/* Custom Dropdown Button */}
      <button
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch tenants"
        disabled={isUpdating}
      >
        <span className={styles.selectedTenant}>
          {isUpdating ? "Updating..." : (selectedTenant ? selectedTenant.name : "Select Organization")}
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
            <h3>Switch Tenants</h3>
            <p>Select an organization to work with</p>
          </div>

          {/* Tenant List */}
          <div className={styles.tenantList}>
            {userTenants.map((tenant) => (
              <button
                key={tenant._id || 'unknown'}
                className={`${styles.tenantOption} ${
                  selectedTenant?._id === tenant._id ? styles.selected : ""
                }`}
                onClick={() => handleTenantSelect(tenant)}
                disabled={isUpdating}
              >
                <span className={styles.tenantName}>{tenant.name}</span>
                {selectedTenant?._id === tenant._id && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
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
  );
}
