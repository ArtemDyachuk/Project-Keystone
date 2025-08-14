"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setCurrentTenant } from "@/lib/tenants";
import styles from "./TenantCreate.module.css";

export function TenantCreate() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        setIsAuthenticated(true);
      } else {
        router.push("/login");
      }
    } catch (err) {
      router.push("/login");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      const response = await fetch(`${apiUrl}/api/tenants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create organization");
      }

      // Store new tenant info using utility function
      setCurrentTenant(data._id, data.name);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
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

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🏢 Create Organization</h1>
        <p>Welcome to Keystone CMS! Let's get started by creating your organization.</p>
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
