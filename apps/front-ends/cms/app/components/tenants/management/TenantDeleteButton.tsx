"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteTenant } from "@/app/actions";
import { Tenant } from "../types";
import styles from "./TenantManagement.module.css";

interface TenantDeleteButtonProps {
  tenant: Tenant;
}

export function TenantDeleteButton({ tenant }: TenantDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${tenant.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      // Call server action which will handle deletion
      const result = await deleteTenant(tenant._id!);

      if (result?.success && result.redirectTo) {
        // Navigate to the redirect location
        window.location.href = result.redirectTo;
      }
    } catch (error) {
      // Show error for actual failures
      const errorMessage = error instanceof Error ? error.message : "Failed to delete organization";
      toast.error("❌ Failed to delete organization", {
        description: errorMessage,
        duration: 5000,
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.dangerZone}>
      <h3>Danger Zone</h3>
      <p>Permanently delete this organization and all associated data.</p>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={styles.deleteButton}
      >
        {isDeleting ? "Deleting..." : "🗑️ Delete Organization"}
      </button>
    </div>
  );
}
