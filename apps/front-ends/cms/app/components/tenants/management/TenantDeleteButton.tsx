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
      // Show optimistic success toast
      toast.success("🗑️ Organization deleted successfully!", {
        description: `"${tenant.name}" has been permanently deleted.`,
        duration: 4000,
      });

      // Call server action which will handle deletion and redirect
      await deleteTenant(tenant._id!);
    } catch (error) {
      // Check if this is a Next.js redirect error (which is expected)
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        // This is expected - the redirect is working, don't show error
        return;
      }

      // Only show error for actual failures
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
