"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCorporation } from "@/app/actions/corporation.actions";
import styles from "./DeleteCorporationButton.module.css";

interface DeleteCorporationButtonProps {
  corporationId: string;
  corporationName: string;
}

export function DeleteCorporationButton({ corporationId, corporationName }: DeleteCorporationButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${corporationName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await deleteCorporation(corporationId);

      if (result?.success) {
        // Successfully deleted, navigate to corporations list
        router.push("/corporations");
      } else {
        throw new Error("Delete operation failed");
      }
    } catch (error: unknown) {
      // Check if this is a Next.js redirect (which is not an error)
      if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.includes('NEXT_REDIRECT')) {
        // This is a successful redirect, not an error
        // The user will be redirected to /corporations
        return;
      }

      // This is a real error
      console.error("Failed to delete corporation:", error);
      alert("Failed to delete corporation. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.deleteButton}
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "🗑️ Deleting..." : "🗑️ Delete Corporation"}
    </button>
  );
}
