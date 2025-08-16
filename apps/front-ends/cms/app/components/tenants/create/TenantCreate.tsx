"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setCurrentTenant } from "@/lib/tenants";
import { createTenant } from "@/app/actions";
import { UserData } from "@/lib/auth/utils";
import styles from "./TenantCreate.module.css";

interface TenantCreateProps {
  userData: UserData;
}

export function TenantCreate({ userData }: TenantCreateProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await createTenant(name);
      
      if (result.success && result.tenant) {
        // Store new tenant info using utility function
        setCurrentTenant(result.tenant._id, result.tenant.name);

        if (result.requiresReauth) {
          // Show re-authentication message
          toast.success("🎉 Organization created successfully!", {
            description: `Welcome to ${result.tenant.name || name}! Please sign out and sign back in to access your new organization.`,
            duration: 6000,
          });
          
          // Redirect to dashboard (user will see they need to re-auth)
          router.push("/dashboard");
        } else {
          // Show success toast
          toast.success("🎉 Organization created successfully!", {
            description: `Welcome to ${result.tenant.name || name}! You're all set up.`,
            duration: 4000,
          });

          // Refresh router to update navigation with fresh token data, then navigate
          router.refresh();
          router.push("/dashboard");
        }
      } else {
        throw new Error(result.error || "Failed to create organization");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create organization";
      setError(errorMessage);
      toast.error("❌ Failed to create organization", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🏢 Create Organization</h1>
        <p>Welcome to Keystone CMS, {userData.firstName || userData.email?.split("@")[0] || "User"}! Let's get started by creating your organization.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="tenantName">Organization Name</label>
          <input
            id="tenantName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your organization name"
            required
            disabled={loading}
          />
          <small className={styles.hint}>
            This will be the name of your organization/workspace
          </small>
        </div>

        <div className={styles.actions}>
          <button 
            type="submit" 
            disabled={loading || !name.trim()} 
            className={styles.submitButton}
          >
            {loading ? "Creating..." : "Create Organization"}
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            ❌ {error}
          </div>
        )}
      </form>
    </div>
  );
}
