"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTenant, checkTenantRequirement } from "@/app/actions/tenant.actions";
import styles from "./TenantCreationForm.module.css";

interface TenantCreationFormProps {
  userId: string;
  userEmail: string;
}

export default function TenantCreationForm({ userId: _userId, userEmail: _userEmail }: TenantCreationFormProps) {
  const [tenantName, setTenantName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasExistingTenants, setHasExistingTenants] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  // Check if user already has tenants
  useEffect(() => {
    const checkExistingTenants = async () => {
      try {
        const result = await checkTenantRequirement(_userId);
        setHasExistingTenants(!result.needsTenant);
      } catch (error) {
        console.error("Failed to check tenant requirements:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkExistingTenants();
  }, [_userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantName.trim()) {
      setError("Tenant name is required");
      return;
    }

    if (tenantName.trim().length < 2) {
      setError("Tenant name must be at least 2 characters long");
      return;
    }

    if (tenantName.trim().length > 100) {
      setError("Tenant name must be less than 100 characters");
      return;
    }

    // Validate tenant name (no special characters)
    const validNameRegex = /^[a-zA-Z0-9\s\-_&.()]+$/;
    if (!validNameRegex.test(tenantName.trim())) {
      setError("Tenant name can only contain letters, numbers, and spaces");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await createTenant(tenantName.trim());

      if (!result.success) {
        throw new Error(result.error || "Failed to create tenant");
      }

      // Redirect to dashboard after successful tenant creation
      router.push("/dashboard");
    } catch (error) {
      console.error("❌ Tenant creation failed:", error);
      setError(error instanceof Error ? error.message : "Failed to create tenant");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <div className={styles.header}>
            <div className={styles.loadingSpinner}>🔄</div>
            <h1 className={styles.title}>Checking your account...</h1>
            <p className={styles.subtitle}>Please wait while we verify your organization status.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {hasExistingTenants ? "Create Additional Organization" : "Create Your Organization"}
          </h1>
          <p className={styles.subtitle}>
            {hasExistingTenants
              ? "You can create additional organizations to manage different business entities or projects."
              : "Welcome! To get started, you need to create an organization. This will be your workspace where you can manage your content and team."
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="tenantName" className={styles.label}>
              Organization Name
            </label>
            <input
              type="text"
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Enter your organization name"
              className={styles.input}
              disabled={isSubmitting}
              maxLength={100}
            />
            <p className={styles.helpText}>
              Use letters, numbers, and spaces only. This will be your organization's display name.
            </p>
          </div>

          {error && (
            <div className={styles.error}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !tenantName.trim()}
            className={styles.submitButton}
          >
            {isSubmitting ? "Creating..." : "Create Organization"}
          </button>
        </form>

        <div className={styles.info}>
          <p className={styles.infoText}>
            <strong>What happens next?</strong>
          </p>
          <ul className={styles.infoList}>
            <li>Your organization will be created in our secure system</li>
            <li>You'll be set as the organization owner with full access</li>
            <li>A default corporation will be created for you</li>
            <li>
              {hasExistingTenants
                ? "You can switch between organizations from your dashboard"
                : "You'll be redirected to your dashboard"
              }
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
