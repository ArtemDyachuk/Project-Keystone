"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@keystone/ui";
import styles from "./page.module.css";

interface CreateUserForm {
   email: string;
   displayName: string;
   roles: string[];
}

export default function CreateUserPage() {
   const [form, setForm] = useState<CreateUserForm>({
      email: "",
      displayName: "",
      roles: [],
   });
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const router = useRouter();

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
         const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/users`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(form),
         });

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to create user");
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
            <h1>Create New User</h1>
            <p>Add a new user to your tenant</p>
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
                  <label htmlFor="displayName" className={styles.label}>
                     Display Name
                  </label>
                  <input
                     type="text"
                     id="displayName"
                     name="displayName"
                     value={form.displayName}
                     onChange={handleInputChange}
                     className={styles.input}
                     placeholder="John Doe"
                     disabled={loading}
                  />
                  <p className={styles.helpText}>
                     Optional. If not provided, the email will be used as the display name.
                  </p>
               </div>

               <div className={styles.formGroup}>
                  <label htmlFor="roles" className={styles.label}>
                     User Roles
                  </label>
                  <input
                     type="text"
                     id="roles"
                     name="roles"
                     placeholder="Enter roles separated by commas (e.g., admin, user, moderator)"
                     value={form.roles.join(", ")}
                     onChange={(e) => {
                        const roles = e.target.value.split(",").map(role => role.trim()).filter(role => role.length > 0);
                        setForm(prev => ({ ...prev, roles }));
                     }}
                     className={styles.input}
                     disabled={loading}
                  />
                  <p className={styles.helpText}>
                     Optional. Enter roles separated by commas. These will be stored in the database.
                  </p>
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
                     disabled={loading || !form.email.trim()}
                  >
                     {loading ? "Creating..." : "Create User"}
                  </button>
               </div>
            </form>
         </Card>
      </div>
   );
}
