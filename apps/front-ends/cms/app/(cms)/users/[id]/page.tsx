"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@keystone/ui";
import { FullPageLoader } from "@/components/loaders";
import styles from "./page.module.css";
import { getRolesByCategory } from "@keystone/rbac";
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
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
}

interface UpdateUserForm {
  displayName: string;
  disabled: boolean;
  roles: string[];
}

export default function EditUserPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [form, setForm] = useState<UpdateUserForm>({
    displayName: "",
    disabled: false,
    roles: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rolesByCategory, setRolesByCategory] = useState<Record<string, Array<{ value: string; label: string; description: string }>>>({});
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  // Load roles on component mount
  useEffect(() => {
    const loadRoles = () => {
      try {
        const rolesData = getRolesByCategory();
        setRolesByCategory(rolesData);
      } catch (error) {
        console.error("Failed to load roles:", error);
        setRolesByCategory({});
      }
    };

    loadRoles();
  }, []);



  // Check if a role can be added (no conflicts with existing roles)
  const canAddRole = (roleToAdd: string): boolean => {
    const roleToAddCategory = Object.entries(rolesByCategory).find(([_category, roles]) =>
      roles.some(role => role.value === roleToAdd)
    )?.[0];

    if (!roleToAddCategory) return false;

    // Check if we already have a role from the same category
    return !form.roles.some(existingRole => {
      const existingCategory = Object.entries(rolesByCategory).find(([_category, roles]) =>
        roles.some(role => role.value === existingRole)
      )?.[0];
      return existingCategory === roleToAddCategory;
    });
  };

  // Handle role selection
  const handleRoleToggle = (roleValue: string) => {
    if (form.roles.includes(roleValue)) {
      // Remove role
      setForm(prev => ({
        ...prev,
        roles: prev.roles.filter(role => role !== roleValue)
      }));
    } else if (canAddRole(roleValue)) {
      // Add role if no conflicts
      setForm(prev => ({
        ...prev,
        roles: [...prev.roles, roleValue]
      }));
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/users/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      const data = await response.json();
      setUser(data.user);



      setForm({
        displayName: data.user.displayName || "",
        disabled: data.user.disabled,
        roles: data.user.roles || [],
      });


    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;



    setForm(prev => {
      const newForm = {
        ...prev,
        [name]: type === "checkbox" ? checked : value
      };



      return newForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);



    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }

      setSuccess("User updated successfully");
      // Refresh user data
      await fetchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }

      // Redirect to users list on success
      router.push("/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setDeleting(false);
    }
  };

  const handleBack = () => {
    router.push("/users");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <FullPageLoader isVisible={true} />;
  }

  if (error && !user) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleBack} className={styles.backButton}>
          Back to Users
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.errorContainer}>
        <h2>User Not Found</h2>
        <p>The user you're looking for doesn't exist.</p>
        <button onClick={handleBack} className={styles.backButton}>
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Back to Users
        </button>
        <h1>Edit User</h1>
        <p>Manage user settings and permissions</p>
      </div>

      <div className={styles.content}>
        <Card className={styles.userInfoCard}>
          <h2>User Information</h2>
          <div className={styles.userDetails}>
            <div className={styles.detailRow}>
              <span className={styles.label}>User ID:</span>
              <span className={styles.value}>{user.uid}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Email:</span>
              <span className={styles.value}>{user.email}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Email Verified:</span>
              <span className={`${styles.value} ${styles.status} ${user.emailVerified ? styles.verified : styles.unverified}`}>
                {user.emailVerified ? "Yes" : "No"}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Created:</span>
              <span className={styles.value}>{formatDate(user.metadata.creationTime)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Last Sign In:</span>
              <span className={styles.value}>{formatDate(user.metadata.lastSignInTime)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Roles:</span>
              <div className={styles.rolesDisplay}>
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((role, index) => (
                    <span key={index} className={styles.roleBadge}>
                      {role}
                    </span>
                  ))
                ) : (
                  <span className={styles.noRoles}>No roles assigned</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <PermissionGuard
          permission={PERMISSIONS.USER_UPDATE}
          fallback={null}
        >
          <Card className={styles.editCard}>
            <h2>Edit User</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="displayName" className={styles.formLabel}>
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={form.displayName}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Enter display name"
                  disabled={saving}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="disabled"
                    checked={form.disabled}
                    onChange={handleInputChange}
                    disabled={saving}
                    className={styles.checkbox}
                  />
                  <span>Disable User Account</span>
                </label>
                <p className={styles.helpText}>
                  Disabled users cannot sign in to the system.
                </p>

              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  User Roles
                </label>
                <div className={styles.rolesContainer}>
                  {Object.entries(rolesByCategory).map(([category, roles]) => (
                    <div key={category} className={styles.roleCategory}>
                      <h4 className={styles.categoryTitle}>{category} Roles</h4>
                      <div className={styles.roleOptions}>
                        {roles.map((role) => {
                          const isSelected = form.roles.includes(role.value);
                          const isDisabled = !isSelected && !canAddRole(role.value);
                          return (
                            <label
                              key={role.value}
                              className={`${styles.roleOption} ${isSelected ? styles.selected : ""} ${isDisabled ? styles.disabled : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleRoleToggle(role.value)}
                                disabled={saving || isDisabled}
                                className={styles.roleCheckbox}
                              />
                              <div className={styles.roleInfo}>
                                <span className={styles.roleLabel}>{role.label}</span>
                                <span className={styles.roleDescription}>{role.description}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className={styles.helpText}>
                  Select one role per category. Users can have multiple roles from different categories.
                </p>
                {form.roles.length > 0 && (
                  <div className={styles.selectedRoles}>
                    <strong>Selected Roles:</strong> {form.roles.join(", ")}
                  </div>
                )}
              </div>

              {error && (
                <div className={styles.errorMessage}>
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className={styles.successMessage}>
                  <p>{success}</p>
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Card>

          <Card className={styles.dangerCard}>
            <h2>Danger Zone</h2>
            <p>These actions are irreversible. Please proceed with caution.</p>

            <div className={styles.dangerActions}>
              <div className={styles.dangerAction}>
                <h3>Delete User</h3>
                <p>Permanently remove this user from the system. This will also immediately log them out from all active sessions.</p>
                <button
                  onClick={handleDelete}
                  className={styles.deleteButton}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </div>
          </Card>
        </PermissionGuard>
      </div>
    </div>
  );
}
