"use client";

import { useState, useEffect } from "react";
import { Tenant } from "@/components/tenants/types";
import { getTenants } from "@/lib/tenants";
import styles from "./page.module.css";

export default function TenantsPage() {
  const [userTenants, setUserTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const tenants = await getTenants();
        setUserTenants(tenants);
        console.log("Tenants page - Fetched tenants:", tenants.length);
      } catch (err) {
        console.error("Failed to load tenants:", err);
        setError(err instanceof Error ? err.message : "Failed to load organizations");
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>🏢 Organizations</h1>
          <p>Manage your organizations and their settings.</p>
        </div>
        <div className={styles.loading}>
          <p>Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>🏢 Organizations</h1>
          <p>Manage your organizations and their settings.</p>
        </div>
        <div className={styles.error}>
          <p>Error loading organizations: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🏢 Organizations</h1>
        <p>Manage your organizations and their settings.</p>
      </div>

      <div className={styles.tenantsList}>
        {userTenants.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No organizations found. Create your first organization to get started.</p>
            <a href="/tenants/create" className={styles.createButton}>
              ➕ Create Organization
            </a>
          </div>
        ) : (
          <div className={styles.tenantsGrid}>
            {userTenants.map((tenant) => (
              <div key={tenant._id || 'unknown'} className={styles.tenantCard}>
                <div className={styles.tenantInfo}>
                  <h3 className={styles.tenantName}>{tenant.name}</h3>
                  <p className={styles.tenantId}>ID: {tenant._id || 'Unknown'}</p>
                  <p className={styles.tenantCreated}>
                    Created: {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div className={styles.tenantActions}>
                  <a
                    href={`/tenants/${tenant._id || 'unknown'}`}
                    className={styles.manageButton}
                  >
                    ⚙️ Manage
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.createSection}>
        <a href="/tenants/create" className={styles.createButton}>
          ➕ Create New Organization
        </a>
      </div>
    </div>
  );
}
