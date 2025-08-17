"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { 
  getAvailableRoles, 
  updateUserRole, 
  type UserData, 
  type RoleDefinition, 
  type UpdateUserRoleData 
} from "@/app/actions/user.actions";
import styles from "./UserRoleManager.module.css";

interface UserRoleManagerProps {
  user: UserData;
  onUserUpdated: (updatedUser: UserData) => void;
  onCancel: () => void;
}

export function UserRoleManager({ user, onUserUpdated, onCancel }: UserRoleManagerProps) {
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Get current user's roles in the selected tenant
  const currentRoles = user.selectedTenantId ? user.tenantRoles?.[user.selectedTenantId] : null;
  const currentRoleArray = useMemo(() => {
    return Array.isArray(currentRoles) ? currentRoles : currentRoles ? [currentRoles] : [];
  }, [currentRoles]);

  useEffect(() => {
    async function loadRoles() {
      try {
        const roles = await getAvailableRoles();
        setAvailableRoles(roles);
        // Initialize with current user roles
        setSelectedRoles(new Set(currentRoleArray));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roles");
      } finally {
        setLoading(false);
      }
    }

    loadRoles();
  }, [currentRoleArray]);

  const handleRoleToggle = (roleId: string) => {
    const newSelectedRoles = new Set(selectedRoles);
    if (newSelectedRoles.has(roleId)) {
      newSelectedRoles.delete(roleId);
    } else {
      newSelectedRoles.add(roleId);
    }
    setSelectedRoles(newSelectedRoles);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const selectedArray = Array.from(selectedRoles);
    const currentSet = new Set(currentRoleArray);
    const selectedSet = new Set(selectedArray);

    // Check if there are any changes
    const hasChanges = selectedArray.length !== currentRoleArray.length || 
                      !selectedArray.every(role => currentSet.has(role));

    if (!hasChanges) {
      onCancel();
      return;
    }

    // For now, we'll handle one role at a time - you could enhance this later
    // to support bulk role assignment
    const rolesToAdd = selectedArray.filter(role => !currentSet.has(role));
    const rolesToRemove = currentRoleArray.filter(role => !selectedSet.has(role));

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      onCancel();
      return;
    }

    // For simplicity, we'll apply the first change (either add or remove)
    const roleToUpdate = rolesToAdd.length > 0 ? rolesToAdd[0] : rolesToRemove[0];
    const updateData: UpdateUserRoleData = { role: roleToUpdate };

    startTransition(async () => {
      try {
        const updatedUser = await updateUserRole(user.sub, updateData);
        onUserUpdated(updatedUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update user roles");
      }
    });
  };

  const getRoleInfo = (roleId: string) => {
    return availableRoles.find(role => role.id === roleId);
  };

  if (loading) {
    return (
      <div className={styles.roleManager}>
        <div className={styles.loading}>
          <p>Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.roleManager}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3 className={styles.title}>Manage User Role</h3>
        
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        <div className={styles.currentRole}>
          <p className={styles.label}>Current Roles:</p>
          <div className={styles.currentRoleDisplay}>
            {currentRoleArray.length > 0 ? (
              <>
                <span className={styles.roleName}>
                  {currentRoleArray.map(role => getRoleInfo(role)?.name || role).join(", ")}
                </span>
                <span className={styles.roleDescription}>
                  {currentRoleArray.map(role => getRoleInfo(role)?.description).join("; ")}
                </span>
              </>
            ) : (
              <span className={styles.noRole}>No roles assigned</span>
            )}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Available Roles
          </label>
          <div className={styles.rolesGrid}>
            {availableRoles.map((role) => (
              <div key={role.id} className={styles.roleCard}>
                <label className={styles.roleCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedRoles.has(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                    disabled={isPending}
                    className={styles.checkbox}
                  />
                  <div className={styles.roleInfo}>
                    <div className={styles.roleName}>{role.name}</div>
                    <div className={styles.roleDescription}>{role.description}</div>
                    <div className={styles.rolePermissions}>
                      <span className={styles.permissionsLabel}>Permissions:</span>
                      <div className={styles.permissionsList}>
                        {role.permissions.map((permission) => (
                          <span key={permission} className={styles.permission}>
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={`${styles.button} ${styles.cancel}`}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.save}`}
            disabled={isPending || selectedRoles.size === 0}
          >
            {isPending ? "Updating..." : "Update Roles"}
          </button>
        </div>
      </form>
    </div>
  );
}
