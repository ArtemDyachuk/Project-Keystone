"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card } from "@keystone/ui";
import styles from "./page.module.css";

interface Tenant {
  id: string;
  name: string;
  domain?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserTenant {
  tenant: Tenant;
  role: string;
}

export default function FirebaseMultiTenantTest() {
  const [tenants, setTenants] = useState<UserTenant[]>([]);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantDomain, setNewTenantDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load user's tenants on component mount
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await fetch("/api/tenants/list");
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      } else {
        setError("Failed to load tenants");
      }
    } catch (error) {
      setError("Failed to load tenants");
    }
  };

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/tenants/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newTenantName,
          domain: newTenantDomain || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`Tenant "${newTenantName}" created successfully!`);
        setNewTenantName("");
        setNewTenantDomain("");
        loadTenants(); // Refresh the list
      } else {
        setError(data.error || "Failed to create tenant");
      }
    } catch (error) {
      setError("An error occurred while creating tenant");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🏢 Firebase Multi-Tenancy Test</h1>
        <p>Test creating and managing tenants with Firebase Custom Claims</p>
      </div>

      <div className={styles.content}>
        {/* Create Tenant Form */}
        <Card className={styles.createTenantCard}>
          <h2>Create New Tenant</h2>
          <form onSubmit={createTenant} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="tenantName">Tenant Name *</label>
              <Input
                id="tenantName"
                type="text"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="Enter tenant name"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="tenantDomain">Domain (Optional)</label>
              <Input
                id="tenantDomain"
                type="text"
                value={newTenantDomain}
                onChange={(e) => setNewTenantDomain(e.target.value)}
                placeholder="e.g., company.com"
              />
            </div>

            <Button 
              type="submit" 
              className={styles.submitButton} 
              disabled={isLoading || !newTenantName.trim()}
            >
              {isLoading ? "Creating..." : "Create Tenant"}
            </Button>
          </form>

          {message && (
            <div className={styles.success}>
              ✅ {message}
            </div>
          )}

          {error && (
            <div className={styles.error}>
              ❌ {error}
            </div>
          )}
        </Card>

        {/* Tenants List */}
        <Card className={styles.tenantsCard}>
          <h2>Your Tenants ({tenants.length})</h2>
          
          {tenants.length === 0 ? (
            <div className={styles.emptyState}>
              <p>You don't have any tenants yet.</p>
              <p>Create your first tenant above to get started!</p>
            </div>
          ) : (
            <div className={styles.tenantsList}>
              {tenants.map((userTenant) => (
                <div key={userTenant.tenant.id} className={styles.tenantItem}>
                  <div className={styles.tenantInfo}>
                    <h3>{userTenant.tenant.name}</h3>
                    <p className={styles.tenantId}>ID: {userTenant.tenant.id}</p>
                    {userTenant.tenant.domain && (
                      <p className={styles.tenantDomain}>Domain: {userTenant.tenant.domain}</p>
                    )}
                    <p className={styles.tenantRole}>Role: <span className={styles.roleBadge}>{userTenant.role}</span></p>
                  </div>
                  <div className={styles.tenantActions}>
                    <Button size="sm" variant="outline">
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* How It Works */}
        <Card className={styles.infoCard}>
          <h2>🔍 How Firebase Multi-Tenancy Works</h2>
          <div className={styles.infoContent}>
            <h3>1. Custom Claims</h3>
            <p>Firebase stores tenant access in JWT Custom Claims:</p>
            <pre className={styles.codeBlock}>
{`{
  "tenantIds": ["tenant_123", "tenant_456"],
  "tenantRoles": {
    "tenant_123": "admin",
    "tenant_456": "user"
  },
  "selectedTenantId": "tenant_123"
}`}
            </pre>

            <h3>2. Automatic Updates</h3>
            <p>When you create/join/leave tenants, Firebase automatically updates your JWT token with new claims.</p>

            <h3>3. Secure Access Control</h3>
            <p>Claims are verified server-side and can't be tampered with by users.</p>

            <h3>4. Real-time Updates</h3>
            <p>Changes to tenant access are immediately reflected in all active sessions.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
