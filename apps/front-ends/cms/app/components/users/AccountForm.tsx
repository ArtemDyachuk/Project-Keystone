"use client";

import { useState } from "react";
import { Card } from "@keystone/ui";
import type { CurrentUser } from "@/lib/sessions/utils";
import { updateUserAction } from "@/app/actions";
import styles from "./AccountForm.module.css";

interface AccountFormProps {
  user: CurrentUser;
}

export function AccountForm({ user }: AccountFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    firstName: "", // Not available in CurrentUser
    lastName: "", // Not available in CurrentUser
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await updateUserAction(user.uid, {
        displayName: formData.displayName || null,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
      });

      if (result.success) {
        setSuccess(result.message);
        // The page will be revalidated by the server action
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.content}>
      <div className={styles.mainSection}>
        <Card className={styles.profileCard}>
          <h2>Profile Information</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className={`${styles.input} ${styles.disabledInput}`}
                />
                <small>Email cannot be changed</small>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="Enter display name"
                  className={styles.input}
                  disabled={saving}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  className={styles.input}
                  disabled={saving}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  className={styles.input}
                  disabled={saving}
                />
              </div>
            </div>

            {error && (
              <div className={`${styles.message} ${styles.error}`}>
                {error}
              </div>
            )}

            {success && (
              <div className={`${styles.message} ${styles.success}`}>
                {success}
              </div>
            )}

            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className={styles.sidebar}>
        <Card className={styles.infoCard}>
          <h3>Account Details</h3>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>User ID:</span>
            <span className={styles.infoValue}>{user.uid}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email Verified:</span>
            <span className={styles.infoValue}>
              {user.emailVerified ? (
                <span className={`${styles.badge} ${styles.success}`}>Verified</span>
              ) : (
                <span className={`${styles.badge} ${styles.warning}`}>Not Verified</span>
              )}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Tenant ID:</span>
            <span className={styles.infoValue}>
              {user.tenantId || "None"}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Selected Corporation:</span>
            <span className={styles.infoValue}>
              {user.selectedCorporationId || "None"}
            </span>
          </div>
        </Card>

        <Card className={styles.rolesCard}>
          <h3>Your Roles</h3>
          <div className={styles.rolesList}>
            {user.roles.map((role) => (
              <span key={role} className={`${styles.badge} ${styles.info}`}>
                {role}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
