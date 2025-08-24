"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@keystone/ui";
import styles from "./page.module.css";
import { getRolesByCategory } from "@keystone/rbac";

interface SendInviteForm {
   email: string;
   firstName: string;
   lastName: string;
   roles: string[];
}

export default function SendInvitePage() {
   const [form, setForm] = useState<SendInviteForm>({
      email: "",
      firstName: "",
      lastName: "",
      roles: [],
   });
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const router = useRouter();

   // Load roles on component mount
   const [rolesByCategory, setRolesByCategory] = useState<Record<string, Array<{ value: string; label: string; description: string }>>>({});

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

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setForm(prev => ({
         ...prev,
         [name]: value
      }));
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      try {
         // Use the invite endpoint instead of create user
         const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/invite`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
               email: form.email,
               firstName: form.firstName,
               lastName: form.lastName,
               roles: form.roles,
            }),
         });

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to send invite");
         }

         // Redirect to users list on success
         router.push("/users");
      } catch (err) {
         setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
         setLoading(false);
      }
   };

   const handleCancel = () => {
      router.push("/users");
   };

   return (
      <div className={styles.container}>
         <div className={styles.header}>
            <h1>Send User Invite</h1>
            <p>Invite a new user to join your tenant</p>
         </div>

         <Card className={styles.formCard}>
            <form onSubmit={handleSubmit} className={styles.form}>
               <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>
                     Email Address *
                  </label>
                  <input
                     type="email"
                     id="email"
                     name="email"
                     value={form.email}
                     onChange={handleInputChange}
                     required
                     className={styles.input}
                     placeholder="user@example.com"
                     disabled={loading}
                  />
               </div>

               <div className={styles.formGroup}>
                  <label htmlFor="firstName" className={styles.label}>
                     First Name *
                  </label>
                  <input
                     type="text"
                     id="firstName"
                     name="firstName"
                     value={form.firstName}
                     onChange={handleInputChange}
                     required
                     className={styles.input}
                     placeholder="John"
                     disabled={loading}
                  />
               </div>

               <div className={styles.formGroup}>
                  <label htmlFor="lastName" className={styles.label}>
                     Last Name *
                  </label>
                  <input
                     type="text"
                     id="lastName"
                     name="lastName"
                     value={form.lastName}
                     onChange={handleInputChange}
                     required
                     className={styles.input}
                     placeholder="Doe"
                     disabled={loading}
                  />
               </div>

               <div className={styles.formGroup}>
                  <label className={styles.label}>
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
                                          disabled={loading || isDisabled}
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

               <div className={styles.formActions}>
                  <button
                     type="button"
                     onClick={handleCancel}
                     className={styles.cancelButton}
                     disabled={loading}
                  >
                     Cancel
                  </button>
                  <button
                     type="submit"
                     className={styles.submitButton}
                     disabled={loading || !form.email.trim() || !form.firstName.trim() || !form.lastName.trim()}
                  >
                     {loading ? "Sending Invite..." : "Send Invite"}
                  </button>
               </div>
            </form>
         </Card>
      </div>
   );
}
