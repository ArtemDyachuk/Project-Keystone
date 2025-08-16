"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setCurrentTenant } from "@/lib/tenants";
import { createTenant } from "@/app/actions";
import { UserData } from "@/app/actions/user.actions";
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
          // Try to refresh the session automatically
          try {
            const refreshResponse = await fetch("/api/auth/refresh-session", {
              method: "POST",
            });

            if (refreshResponse.ok) {
              const refreshResult = await refreshResponse.json();

              if (refreshResult.requiresReauth) {
                // Session refresh requires re-authentication
                toast.success("🎉 Organization created successfully!", {
                  duration: 6000,
                });
                router.push("/tenants");
              } else {
                // Session was refreshed successfully
                toast.success("🎉 Organization created successfully!", {
                  description: `Welcome to ${result.tenant.name || name}! Session refreshed automatically.`,
                  duration: 4000,
                });
                router.push("/tenants");
              }
            } else {
              // Fallback to manual re-auth message
              toast.success("🎉 Organization created successfully!", {
                duration: 6000,
              });
              router.push("/tenants");
            }
          } catch (refreshError) {
            console.warn("Failed to refresh session automatically:", refreshError);
            // Fallback to manual re-auth message
            toast.success("🎉 Organization created successfully!", {
              duration: 6000,
            });
            router.push("/tenants");
          }
        } else {
          // No re-auth required, proceed normally
          console.log("✅ Tenant created - session cookies updated with fresh claims");

          // Redirect to tenants page to see the new tenant
          router.push("/tenants");

          // Show success message
          toast.success("🎉 Organization created successfully!", {
            description: `Welcome to ${result.tenant.name || name}! Redirecting to your organizations...`,
            duration: 4000,
          });
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
