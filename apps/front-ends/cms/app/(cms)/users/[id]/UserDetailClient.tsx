"use client";

import { useState } from "react";
import Link from "next/link";
import { UserEditForm } from "./UserEditForm";
import type { UserData } from "@/app/actions/user.actions";
import styles from "./page.module.css";

interface UserDetailClientProps {
  initialUser: UserData;
}

export function UserDetailClient({ initialUser }: UserDetailClientProps) {
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email || "Unknown User";

  const userInitials = getUserInitials(user);

  const handleUserUpdated = (updatedUser: UserData) => {
    setUser(updatedUser);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/users" className={styles.backButton}>
          ← Back to Users
        </Link>
        <h1 className={styles.title}>User Details</h1>
      </div>

      {isEditing && (
        <UserEditForm 
          user={user}
          onUserUpdated={handleUserUpdated}
          onCancel={handleCancelEdit}
        />
      )}

      <div className={styles.userProfile}>
        <div className={styles.profileHeader}>
          <div className={styles.userAvatar}>
            {userInitials}
          </div>
          <div className={styles.userBasicInfo}>
            <h2 className={styles.userName}>{displayName}</h2>
            <p className={styles.userEmail}>{user.email}</p>
            <div className={styles.verificationStatus}>
              <span className={`${styles.statusBadge} ${user.email_verified ? styles.verified : styles.unverified}`}>
                {user.email_verified ? "✅ Email Verified" : "❌ Email Not Verified"}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailCard}>
            <h3 className={styles.cardTitle}>Account Information</h3>
            <div className={styles.cardContent}>
              <div className={styles.detailRow}>
                <span className={styles.label}>User ID:</span>
                <span className={styles.value}>{user.sub}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.label}>Username:</span>
                <span className={styles.value}>{user.username || "Not set"}</span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.label}>First Name:</span>
                <span className={styles.value}>{user.firstName || "Not set"}</span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.label}>Last Name:</span>
                <span className={styles.value}>{user.lastName || "Not set"}</span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.label}>Email:</span>
                <span className={styles.value}>{user.email}</span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.label}>Email Verified:</span>
                <span className={`${styles.value} ${user.email_verified ? styles.verified : styles.unverified}`}>
                  {user.email_verified ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.detailCard}>
            <h3 className={styles.cardTitle}>Tenant Access</h3>
            <div className={styles.cardContent}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Selected Tenant:</span>
                <span className={styles.value}>
                  {user.selectedTenantId || "None selected"}
                </span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.label}>Total Tenants:</span>
                <span className={styles.value}>
                  {user.tenantIds?.length || 0}
                </span>
              </div>

              {user.tenantIds && user.tenantIds.length > 0 && (
                <div className={styles.detailColumn}>
                  <span className={styles.label}>Tenant IDs:</span>
                  <div className={styles.tenantList}>
                    {user.tenantIds.map((tenantId) => (
                      <div key={tenantId} className={styles.tenantItem}>
                        <span className={styles.tenantId}>{tenantId}</span>
                        {user.tenantRoles?.[tenantId] && (
                          <span className={styles.tenantRole}>
                            {user.tenantRoles[tenantId]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {user.tenantRoles && Object.keys(user.tenantRoles).length > 0 && (
            <div className={styles.detailCard}>
              <h3 className={styles.cardTitle}>Roles</h3>
              <div className={styles.cardContent}>
                <div className={styles.rolesGrid}>
                  {Object.entries(user.tenantRoles).map(([tenantId, role]) => (
                    <div key={tenantId} className={styles.roleItem}>
                      <div className={styles.roleTenant}>{tenantId}</div>
                      <div className={styles.roleValue}>{role}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Link href="/users" className={styles.button}>
            Back to Users List
          </Link>
          <button 
            onClick={() => setIsEditing(true)}
            className={`${styles.button} ${styles.primary}`}
            disabled={isEditing}
          >
            Edit User
          </button>
        </div>
      </div>
    </div>
  );
}

function getUserInitials(user: UserData): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }
  
  if (user.email) {
    return user.email.charAt(0).toUpperCase();
  }
  
  if (user.username) {
    return user.username.charAt(0).toUpperCase();
  }
  
  return "?";
}
