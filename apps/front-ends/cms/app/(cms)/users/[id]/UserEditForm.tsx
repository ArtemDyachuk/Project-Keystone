"use client";

import { useState, useTransition } from "react";
import { updateUserDetails, type UserData, type UpdateUserDetailsData } from "@/app/actions/user.actions";
import styles from "./UserEditForm.module.css";

interface UserEditFormProps {
  user: UserData;
  onUserUpdated: (updatedUser: UserData) => void;
  onCancel: () => void;
}

export function UserEditForm({ user, onUserUpdated, onCancel }: UserEditFormProps) {
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const updateData: UpdateUserDetailsData = {};
    
    // Only include fields that have changed
    if (firstName !== (user.firstName || "")) {
      updateData.firstName = firstName;
    }
    
    if (lastName !== (user.lastName || "")) {
      updateData.lastName = lastName;
    }

    // If nothing changed, just cancel
    if (Object.keys(updateData).length === 0) {
      onCancel();
      return;
    }

    startTransition(async () => {
      try {
        const updatedUser = await updateUserDetails(user.sub, updateData);
        onUserUpdated(updatedUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update user");
      }
    });
  };

  return (
    <div className={styles.editForm}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3 className={styles.title}>Edit User Details</h3>
        
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        <div className={styles.fieldGroup}>
          <label htmlFor="firstName" className={styles.label}>
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={styles.input}
            placeholder="Enter first name"
            disabled={isPending}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="lastName" className={styles.label}>
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={styles.input}
            placeholder="Enter last name"
            disabled={isPending}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={`${styles.button} ${styles.cancel}`}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.save}`}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
