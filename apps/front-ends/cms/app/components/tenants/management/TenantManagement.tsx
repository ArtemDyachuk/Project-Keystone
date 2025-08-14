"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tenant } from "../types";
import styles from "./TenantManagement.module.css";

interface TenantManagementProps {
  tenant: Tenant;
}

export function TenantManagement({ tenant }: TenantManagementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(tenant.name);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Reset name when tenant changes
  useEffect(() => {
    setName(tenant.name);
  }, [tenant.name]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      const response = await fetch(`${apiUrl}/api/tenants/${tenant._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update organization");
      }

      // Update local state and exit edit mode
      setIsEditing(false);
      setLoading(false);
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${tenant.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const accessToken = await getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      const response = await fetch(`${apiUrl}/api/tenants/${tenant._id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete organization");
      }

      // Redirect to tenants list
      router.push("/tenants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization");
      setIsDeleting(false);
    }
  };

  const getAccessToken = async (): Promise<string> => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        return data.accessToken || "";
      }
      return "";
    } catch (err) {
      return "";
    }
  };

  if (isEditing) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>✏️ Edit Organization</h1>
          <p>Update settings for "{tenant.name}"</p>
        </div>

        <form onSubmit={handleEdit} className={styles.form}>
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
          </div>

          <div className={styles.actions}>
            <button 
              type="submit" 
              disabled={loading || !name.trim()} 
              className={styles.editButton}
            >
              {loading ? "Updating..." : "Update Organization"}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setName(tenant.name); // Reset to original value
                setError("");
              }}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>⚙️ Manage Organization</h1>
        <p>Edit settings for "{tenant.name}"</p>
      </div>

      <div className={styles.info}>
        <div className={styles.field}>
          <label>Organization Name</label>
          <div className={styles.value}>{tenant.name}</div>
        </div>

        <div className={styles.field}>
          <label>Organization ID</label>
          <div className={styles.value}>{tenant._id}</div>
        </div>

        <div className={styles.field}>
          <label>Created</label>
          <div className={styles.value}>
            {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'Unknown'}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          onClick={() => setIsEditing(true)}
          className={styles.editButton}
        >
          ✏️ Edit Organization
        </button>
      </div>

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

      {error && (
        <div className={styles.error}>
          ❌ {error}
        </div>
      )}

      <div className={styles.backSection}>
        <a href="/tenants" className={styles.backButton}>
          ← Back to Organizations
        </a>
      </div>
    </div>
  );
}
