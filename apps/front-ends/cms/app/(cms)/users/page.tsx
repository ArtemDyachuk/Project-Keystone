import { getTenantUsers } from "@/app/actions/user.actions";
import { cookies } from "next/headers";
import styles from "./page.module.css";

export default async function UsersPage() {
  let users;
  let error;
  let currentUser;

  try {
    // First try to get current user info to check tenant status
    try {
      const cookieStore = await cookies();
      const fbSession = cookieStore.get("fb_session")?.value;
      
      if (fbSession) {
        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/user/me`, {
          method: "GET",
          headers: {
            "Cookie": `fb_session=${fbSession}`,
          },
        });
        
        if (userResponse.ok) {
          currentUser = await userResponse.json();
        }
      }
    } catch (userError) {
      console.warn("Could not get current user info:", userError);
    }

    users = await getTenantUsers();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load users";
    console.error("Error loading users:", err);
  }

  if (error) {
    // Check if it's a tenant selection error
    const isTenantError = error.includes("403") || error.includes("No tenant selected");
    
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Users</h1>
        </div>
        <div className={styles.error}>
          <h2>❌ Error Loading Users</h2>
          <p>{error}</p>
          {isTenantError && (
            <div className={styles.tenantHelp}>
              <h3>🔑 Tenant Access Required</h3>
              <p>You need to select a tenant to view users. Please:</p>
              <ol>
                <li>Go to the <a href="/tenants">Tenants</a> page</li>
                <li>Select a tenant from the dropdown</li>
                <li>Return to this page</li>
              </ol>
              {currentUser && (
                <div className={styles.userInfo}>
                  <p><strong>Current User:</strong> {currentUser.email}</p>
                  {currentUser.tenantIds && currentUser.tenantIds.length > 0 ? (
                    <p><strong>Available Tenants:</strong> {currentUser.tenantIds.length} tenant(s)</p>
                  ) : (
                    <p><strong>No Tenants:</strong> You don't have access to any tenants yet.</p>
                  )}
                  {!currentUser.selectedTenantId && (
                    <p><strong>Status:</strong> No tenant currently selected</p>
                  )}
                </div>
              )}
              <p>If you don't see any tenants, you may need to create one or be invited to an existing tenant.</p>
              
              <div className={styles.troubleshooting}>
                <h4>🔍 Troubleshooting</h4>
                <p><strong>Common Issue:</strong> The 403 error usually means you haven't selected a tenant yet.</p>
                <p><strong>Solution:</strong> Use the tenant switcher in the sidebar to select a tenant, then refresh this page.</p>
                <p><strong>Note:</strong> You need to be a member of at least one tenant to view users.</p>
                <p><strong>Authentication Flow:</strong> Firebase login → Select Tenant → Backend Session Created → Access Resources</p>
                <p><strong>Tenant Switcher Location:</strong> Look for the tenant dropdown in the left sidebar navigation</p>
                <p><strong>Backend Session:</strong> The 403 error suggests your backend session doesn't have a tenant selected</p>
                <p><strong>Session Status:</strong> Check if you have both Firebase session (fb_session) and backend session (sid) cookies</p>
              </div>
              
              <div className={styles.resolutionSteps}>
                <h4>✅ Resolution Steps</h4>
                <ol>
                  <li><strong>Check Sidebar:</strong> Look for the tenant switcher dropdown in the left navigation</li>
                  <li><strong>Select Tenant:</strong> Click the dropdown and choose a tenant from the list</li>
                  <li><strong>Wait for Switch:</strong> The system will create/update your backend session</li>
                  <li><strong>Refresh Page:</strong> Come back to this page and refresh</li>
                  <li><strong>Verify Cookies:</strong> Check that you now have both fb_session and sid cookies</li>
                </ol>
                <p><strong>If No Tenants:</strong> You'll need to create a tenant first or be invited to an existing one.</p>
              </div>
              
              <div className={styles.actions}>
                <a href="/tenants" className={styles.primaryButton}>
                  🏢 Go to Tenants
                </a>
                <a href="/tenants/create" className={styles.primaryButton}>
                  ➕ Create Tenant
                </a>
                <a href="/dashboard" className={styles.secondaryButton}>
                  📊 Go to Dashboard
                </a>
                <a href="/users" className={styles.secondaryButton}>
                  🔄 Refresh Page
                </a>
              </div>
            </div>
          )}
          <p>Please try refreshing the page or contact support if the issue persists.</p>
          
          <div className={styles.debugInfo}>
            <details>
              <summary>🔧 Debug Information</summary>
              <div className={styles.debugContent}>
                <p><strong>Error Details:</strong> {error}</p>
                <p><strong>Status Code:</strong> 403 Forbidden</p>
                <p><strong>Likely Cause:</strong> No tenant selected in backend session</p>
                <p><strong>Check Console:</strong> Open browser dev tools to see detailed error logs</p>
                <p><strong>Backend Logs:</strong> Check the CMS API server logs for more details</p>
                <p><strong>What 403 Means:</strong> The server understood your request but refuses to authorize it</p>
                <p><strong>Why It Happens:</strong> The TenantGuard is rejecting the request because req.sessionCtx.tenantId is undefined</p>
                <p><strong>Root Cause:</strong> Your backend session was created without a tenant, or the tenant selection didn't update the session</p>
                <p><strong>Cookie Check:</strong> In browser dev tools → Application → Cookies, look for both fb_session and sid cookies</p>
                <p><strong>Expected Cookies:</strong> fb_session (Firebase) + sid (backend session with tenantId)</p>
              </div>
            </details>
          </div>
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
