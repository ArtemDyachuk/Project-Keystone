"use client";

import { useState, useRef, useEffect } from "react";
import { Corporation } from "../../corporations/types";
import { updateSelectedCorporationAndRedirect } from "@/app/actions/corporation.actions";
import { FullPageLoader } from "@/app/components/loaders";
import { useRouter } from "next/navigation";
import styles from "./TenantSwitcher.module.css";

interface TenantSwitcherClientProps {
  selectedCorporation: Corporation | null;
  userCorporations: Corporation[];
}

export function TenantSwitcherClient({ selectedCorporation, userCorporations }: TenantSwitcherClientProps) {
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

  const handleCorporationSelect = async (corporation: Corporation) => {
    // Don't update if it's already selected
    if (selectedCorporation?._id === corporation._id) {
      setIsOpen(false);
      return;
    }

    try {
      setIsUpdating(true);

      const result = await updateSelectedCorporationAndRedirect(corporation._id!);

      if (result?.success) {
        // Clear loading state before navigation
        setIsUpdating(false);
        setIsOpen(false);

        // Navigate to dashboard with fresh corporation context
        router.push("/dashboard");
      } else {
        throw new Error("Server action did not complete successfully");
      }
    } catch (error) {
      console.error("Failed to update selected corporation:", error);
      setIsUpdating(false);
      setIsOpen(false);
    }
  };



  return (
    <>
      <FullPageLoader
        isVisible={isUpdating}
        title="Switching Corporation"
        description="Updating your workspace data..."
      />

      <div className={styles.container} ref={dropdownRef}>
        {/* Custom Dropdown Button */}
        <button
          className={styles.dropdownButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Switch corporations"
          disabled={isUpdating}
        >
          <span className={styles.selectedCorporation}>
            {userCorporations.length === 0 ? "No Corporations" : (selectedCorporation ? selectedCorporation.name : "Select Corporation")}
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
              <h3>Switch Corporations</h3>
              {userCorporations.length > 0 && (
                <p>Select a corporation to work with</p>
              )}
            </div>

            {/* Corporation List */}
            <div className={styles.corporationList}>
              {userCorporations.length === 0 ? (
                <div className={styles.noCorporations}>
                  Create your first corporation to get started
                </div>
              ) : (
                userCorporations.map((corporation) => (
                  <button
                    key={corporation._id || 'unknown'}
                    className={`${styles.corporationOption} ${selectedCorporation?._id === corporation._id ? styles.selected : ""
                      }`}
                    onClick={() => handleCorporationSelect(corporation)}
                    disabled={isUpdating}
                  >
                    <span className={styles.corporationName}>{corporation.name}</span>
                    {selectedCorporation?._id === corporation._id && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className={styles.dropdownFooter}>
              <a href="/corporations" className={styles.manageButton}>
                Manage Corporations
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
