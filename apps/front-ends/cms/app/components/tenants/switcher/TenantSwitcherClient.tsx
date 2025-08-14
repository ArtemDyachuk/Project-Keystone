"use client";

import { useState, useRef, useEffect } from "react";
import { Tenant } from "../types";
import { getTenants } from "@/lib/tenants";
import styles from "./TenantSwitcher.module.css";

interface TenantSwitcherClientProps {
  selectedTenant: Tenant | null;
  userTenants: Tenant[];
}

export function TenantSwitcherClient({ selectedTenant, userTenants }: TenantSwitcherClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [freshTenants, setFreshTenants] = useState<Tenant[]>(userTenants);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);



  // Fetch fresh tenant data when dropdown opens
  const fetchFreshTenants = async () => {
    try {
      setIsLoading(true);
      const freshTenantsData = await getTenants();
      setFreshTenants(freshTenantsData);
    } catch (error) {
      console.error("Failed to fetch fresh tenants:", error);
      // Keep using existing tenants if fetch fails
    } finally {
      setIsLoading(false);
    }
  };

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
        // Successfully updated selected tenant
        // Refresh the page to get updated data from server
        window.location.reload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update selected tenant");
      }
    } catch (error) {
      console.error("Failed to update selected tenant:", error);
      // TODO: Replace with proper toast notification
      alert(`Failed to switch to ${tenant.name}. Please try again.`);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  if (freshTenants.length === 0 && !isLoading) {
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
        onClick={() => {
          if (!isOpen) {
            fetchFreshTenants(); // Fetch fresh data when opening
          }
          setIsOpen(!isOpen);
        }}
        aria-label="Switch tenants"
        disabled={isUpdating}
      >
        <span className={styles.selectedTenant}>
          {isUpdating ? "Updating..." : isLoading ? "Loading..." : (selectedTenant ? selectedTenant.name : "Select Organization")}
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
            {isLoading ? (
              <div className={styles.loading}>Loading tenants...</div>
            ) : freshTenants.length === 0 ? (
              <div className={styles.noTenants}>No tenants available</div>
            ) : (
              freshTenants.map((tenant) => (
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
  );
}
