"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PermissionGuard } from "@/app/components/rbac/guards/PermissionGuard";
import { PERMISSIONS } from "@keystone/rbac";


interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  roles: string[];
  inviteStatus: "invited" | "active";
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
}

import styles from "./page.module.css";

export default function UsersPage() {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userToCancel, setUserToCancel] = useState<FirebaseUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${backendUrl}/api/user/users`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
      setError(null);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    router.push("/users/invite");
  };

  const handleEditUser = (user: FirebaseUser) => {
    router.push(`/users/${user.uid}`);
  };

  const handleCancelInvite = (user: FirebaseUser) => {
    setUserToCancel(user);
    setShowConfirmation(true);
  };

  const confirmCancelInvite = async () => {
    if (!userToCancel) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${backendUrl}/api/user/invite/${userToCancel.uid}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to cancel invite: ${response.status}`);
      }

      // Refresh the users list
      await fetchUsers();
      setShowConfirmation(false);
      setUserToCancel(null);
    } catch (error) {
      console.error("Error canceling invite:", error);
      alert("Failed to cancel invite");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const getStatusLabels = (user: FirebaseUser) => {
    const labels = [];

    if (user.disabled) {
      labels.push(
        <span key="disabled" className={styles.statusLabel + " " + styles.statusDisabled}>
          Disabled
        </span>
      );
    } else {
      labels.push(
        <span key="active" className={styles.statusLabel + " " + styles.statusActive}>
          Active
        </span>
      );
    }

    if (!user.emailVerified) {
      labels.push(
        <span key="unverified" className={styles.statusLabel + " " + styles.statusUnverified}>
          Unverified
        </span>
      );
    } else {
      labels.push(
        <span key="verified" className={styles.statusLabel + " " + styles.statusActive}>
          Verified
        </span>
      );
    }

    if (user.inviteStatus === "invited") {
      labels.push(
        <span key="invited" className={styles.statusLabel + " " + styles.statusInvited}>
          Invited
        </span>
      );
    }

    return labels;
  };

  if (loading) {
    return (
      <div className={styles.usersContainer}>
        <div className={styles.usersCard}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateTitle}>Loading users...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.usersContainer}>
        <div className={styles.usersCard}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateTitle}>Error</div>
            <div className={styles.emptyStateDescription}>{error}</div>
            <button onClick={fetchUsers} className={styles.sendInviteButton}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.usersContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Management</h1>
        <PermissionGuard
          permission={PERMISSIONS.USER_INVITE}
          fallback={null} // Hide button if no permission
        >
          <button onClick={handleCreateUser} className={styles.sendInviteButton}>
            Send Invite
          </button>
        </PermissionGuard>
      </div>

      <div className={styles.usersCard}>
        <h2 className={styles.usersHeader}>Users ({users.length})</h2>

        {users.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateTitle}>No users yet</div>
            <div className={styles.emptyStateDescription}>
              Get started by sending your first invite to a new user.
            </div>
            <button onClick={handleCreateUser} className={styles.sendInviteButton}>
              Send Your First Invite
            </button>
          </div>
        ) : (
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th className={styles.nameColumn}>Name</th>
                <th className={styles.statusColumn}>Status</th>
                <th className={styles.roleColumn}>Role</th>
                <th className={styles.createdColumn}>Created</th>
                <th className={styles.lastSignInColumn}>Last Sign In</th>
                <th className={styles.actionsColumn}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uid}>
                  <td className={styles.nameColumn}>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>
                        {user.displayName || user.email}
                      </div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                  </td>
                  <td className={styles.statusColumn}>
                    <div className={styles.statusLabels}>
                      {getStatusLabels(user)}
                    </div>
                  </td>
                  <td className={styles.roleColumn}>
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((role: string, index: number) => (
                        <span key={index} className={styles.roleLabel}>
                          {role}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>No role</span>
                    )}
                  </td>
                  <td className={styles.createdColumn}>
                    <div className={styles.metadata}>
                      {formatDate(user.metadata?.creationTime)}
                    </div>
                  </td>
                  <td className={styles.lastSignInColumn}>
                    <div className={styles.metadata}>
                      {formatDate(user.metadata?.lastSignInTime)}
                    </div>
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEditUser(user)}
                        className={styles.editButton}
                      >
                        Edit
                      </button>
                      {user.inviteStatus === "invited" && (
                        <button
                          onClick={() => handleCancelInvite(user)}
                          className={styles.cancelInviteButton}
                        >
                          Cancel Invite
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className={styles.confirmationModal}>
          <div className={styles.confirmationContent}>
            <h3 className={styles.confirmationTitle}>Cancel Invite</h3>
            <p className={styles.confirmationMessage}>
              Are you sure you want to cancel the invite for{" "}
              <strong>{userToCancel?.email}</strong>? This will permanently delete the user
              and invalidate the invite link.
            </p>
            <div className={styles.confirmationActions}>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setUserToCancel(null);
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button onClick={confirmCancelInvite} className={styles.confirmButton}>
                Yes, Cancel Invite
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
