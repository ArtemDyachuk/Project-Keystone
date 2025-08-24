"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@keystone/ui";
import { FullPageLoader } from "@/components/loaders";
import styles from "./page.module.css";

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

interface UserListResponse {
   users: FirebaseUser[];
   total: number;
   nextPageToken?: string;
}

export default function UsersPage() {
   const [users, setUsers] = useState<FirebaseUser[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const router = useRouter();

   useEffect(() => {
      fetchUsers();
   }, []);

   const fetchUsers = async () => {
      try {
         setLoading(true);
         const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/users`, {
            credentials: "include",
         });

         if (!response.ok) {
            throw new Error("Failed to fetch users");
         }

         const data: UserListResponse = await response.json();
         setUsers(data.users);
      } catch (err) {
         setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
         setLoading(false);
      }
   };

   const handleCreateUser = () => {
      router.push("/users/create");
   };

   const handleEditUser = (userId: string) => {
      router.push(`/users/${userId}`);
   };

   const formatDate = (dateString: string) => {
      if (!dateString) return "Never";
      return new Date(dateString).toLocaleDateString();
   };

   if (loading) {
      return <FullPageLoader isVisible={true} />;
   }

   if (error) {
      return (
         <div className={styles.errorContainer}>
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={fetchUsers} className={styles.retryButton}>
               Retry
            </button>
         </div>
      );
   }

   return (
      <div className={styles.container}>
         <div className={styles.header}>
            <h1>User Management</h1>
            <button onClick={handleCreateUser} className={styles.createButton}>
               Create User
            </button>
         </div>

         <Card className={styles.usersCard}>
            <div className={styles.usersHeader}>
               <h2>Users ({users.length})</h2>
            </div>

            {users.length === 0 ? (
               <div className={styles.emptyState}>
                  <p>No users found in this tenant.</p>
                  <button onClick={handleCreateUser} className={styles.createFirstButton}>
                     Create Your First User
                  </button>
               </div>
            ) : (
               <div className={styles.usersList}>
                  {users.map((user) => (
                     <div key={user.uid} className={styles.userItem}>
                        <div className={styles.userInfo}>
                           <div className={styles.userMain}>
                              <h3>{user.displayName || user.email || "Unnamed User"}</h3>
                              <p className={styles.userEmail}>{user.email}</p>
                              {user.roles && user.roles.length > 0 && (
                                 <div className={styles.userRoles}>
                                    {user.roles.map((role, index) => (
                                       <span key={index} className={styles.roleBadge}>
                                          {role}
                                       </span>
                                    ))}
                                 </div>
                              )}
                           </div>
                           <div className={styles.userMeta}>
                              <span className={`${styles.status} ${user.disabled ? styles.disabled : styles.active}`}>
                                 {user.disabled ? "Disabled" : "Active"}
                              </span>
                              <span className={`${styles.verified} ${user.emailVerified ? styles.verified : styles.unverified}`}>
                                 {user.emailVerified ? "Verified" : "Unverified"}
                              </span>
                           </div>
                        </div>
                        <div className={styles.userDetails}>
                           <p>Created: {formatDate(user.metadata.creationTime)}</p>
                           <p>Last Sign In: {formatDate(user.metadata.lastSignInTime)}</p>
                        </div>
                        <div className={styles.userActions}>
                           <button
                              onClick={() => handleEditUser(user.uid)}
                              className={styles.editButton}
                           >
                              Edit
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </Card>
      </div>
   );
}
