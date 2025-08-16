import { getUserById } from "@/app/actions/user.actions";
import Link from "next/link";
import styles from "./page.module.css";

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  let user;
  let error;

  try {
    user = await getUserById(id);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load user";
    console.error("Error loading user:", err);
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/users" className={styles.backButton}>
            ← Back to Users
          </Link>
          <h1 className={styles.title}>User Details</h1>
        </div>
        <div className={styles.error}>
          <h2>❌ Error Loading User</h2>
          <p>{error}</p>
          <p>The user may not exist or you may not have permission to view them.</p>
          <Link href="/users" className={styles.button}>
            Return to Users List
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/users" className={styles.backButton}>
            ← Back to Users
          </Link>
          <h1 className={styles.title}>User Details</h1>
        </div>
        <div className={styles.error}>
          <h2>User Not Found</h2>
          <p>The user you're looking for could not be found.</p>
          <Link href="/users" className={styles.button}>
            Return to Users List
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email || "Unknown User";

  const userInitials = getUserInitials(user);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/users" className={styles.backButton}>
          ← Back to Users
        </Link>
        <h1 className={styles.title}>User Details</h1>
      </div>

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

              {user.firstName && (
                <div className={styles.detailRow}>
                  <span className={styles.label}>First Name:</span>
                  <span className={styles.value}>{user.firstName}</span>
                </div>
              )}

              {user.lastName && (
                <div className={styles.detailRow}>
                  <span className={styles.label}>Last Name:</span>
                  <span className={styles.value}>{user.lastName}</span>
                </div>
              )}

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
          {/* Future: Add edit button here */}
          {/* <button className={`${styles.button} ${styles.primary}`}>
            Edit User
          </button> */}
        </div>
      </div>
    </div>
  );
}

function getUserInitials(user: any): string {
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
