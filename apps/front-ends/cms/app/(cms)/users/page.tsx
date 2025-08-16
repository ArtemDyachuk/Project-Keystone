import { getTenantUsers } from "@/app/actions/user.actions";
import styles from "./page.module.css";

export default async function UsersPage() {
  let users;
  let error;

  try {
    users = await getTenantUsers();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load users";
    console.error("Error loading users:", err);
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Users</h1>
        </div>
        <div className={styles.error}>
          <h2>❌ Error Loading Users</h2>
          <p>{error}</p>
          <p>Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Users</h1>
        </div>
        <div className={styles.emptyState}>
          <h2>No Users Found</h2>
          <p>There are no users in the current tenant or you may need to select a tenant first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Users</h1>
        <p className={styles.subtitle}>Manage users in your current tenant</p>
      </div>
      
      <div className={styles.userGrid}>
        {users.map((user) => (
          <a key={user.sub} href={`/users/${user.sub}`} className={styles.userCard}>
            <div className={styles.userHeader}>
              <div className={styles.userInitials}>
                {getUserInitials(user)}
              </div>
              <div className={styles.userInfo}>
                <h3 className={styles.userName}>
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.username || user.email || "Unknown User"
                  }
                </h3>
                <p className={styles.userEmail}>{user.email}</p>
              </div>
            </div>
            
            <div className={styles.userDetails}>
              <div className={styles.detailRow}>
                <span className={styles.label}>User ID:</span>
                <span className={styles.value}>{user.sub}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.label}>Email Verified:</span>
                <span className={`${styles.value} ${user.email_verified ? styles.verified : styles.unverified}`}>
                  {user.email_verified ? "✅ Verified" : "❌ Not Verified"}
                </span>
              </div>
              
              {user.tenantRoles && Object.keys(user.tenantRoles).length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.label}>Roles:</span>
                  <div className={styles.roles}>
                    {Object.entries(user.tenantRoles).map(([tenantId, role]) => (
                      <span key={tenantId} className={styles.role}>
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {user.tenantIds && user.tenantIds.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.label}>Tenant Access:</span>
                  <span className={styles.value}>{user.tenantIds.length} tenant(s)</span>
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
      
      <div className={styles.summary}>
        <p>Total users: <strong>{users.length}</strong></p>
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
