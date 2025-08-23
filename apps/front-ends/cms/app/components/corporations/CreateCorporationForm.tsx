"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCorporation } from "@/app/actions/corporation.actions";
import styles from "./CreateCorporationForm.module.css";

interface Tenant {
   _id: string;
   name: string;
   gipTenantId: string;
}

interface CreateCorporationFormProps {
   userTenants: Tenant[];
}

export function CreateCorporationForm({ userTenants }: CreateCorporationFormProps) {
   const [isCreating, setIsCreating] = useState(false);
   const router = useRouter();
   const [formData, setFormData] = useState({
      name: "",
      tenantId: userTenants.length > 0 ? userTenants[0]._id : ""
   });

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name.trim()) {
         alert("Please enter a corporation name");
         return;
      }

      if (!formData.tenantId) {
         alert("Please select a tenant");
         return;
      }

      try {
         setIsCreating(true);

         // Create FormData for the server action
         const formDataObj = new FormData();
         formDataObj.append("name", formData.name.trim());
         formDataObj.append("tenantId", formData.tenantId);

         const result = await createCorporation(formDataObj);

         if (result?.success) {
            // Successfully created, navigate to dashboard to see updated navigation
            router.push("/dashboard");
         } else {
            throw new Error("Create operation failed");
         }
      } catch (error: any) {
         // Check if this is a Next.js redirect (which is not an error)
         if (error?.digest?.includes('NEXT_REDIRECT')) {
            // This is a successful redirect, not an error
            // The user will be redirected to /corporations
            return;
         }

         // This is a real error
         console.error("Failed to create corporation:", error);
         alert("Failed to create corporation. Please try again.");
         setIsCreating(false);
      }
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
         ...prev,
         [name]: value
      }));
   };

   return (
      <form onSubmit={handleSubmit} className={styles.form}>
         <div className={styles.formCard}>
            <h2>Corporation Information</h2>

            <div className={styles.formGroup}>
               <label htmlFor="name" className={styles.label}>
                  Corporation Name *
               </label>
               <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Enter corporation name"
                  required
                  maxLength={100}
                  disabled={isCreating}
               />
               <p className={styles.helpText}>
                  Choose a descriptive name for your corporation.
               </p>
            </div>

            <div className={styles.formGroup}>
               <label htmlFor="tenantId" className={styles.label}>
                  Assign to Tenant *
               </label>
               <select
                  id="tenantId"
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={handleInputChange}
                  className={styles.select}
                  required
                  disabled={isCreating}
               >
                  <option value="">Select a tenant</option>
                  {userTenants.map((tenant) => (
                     <option key={tenant._id} value={tenant._id}>
                        {tenant.name} (ID: {tenant._id})
                     </option>
                  ))}
               </select>
               <p className={styles.helpText}>
                  Select which tenant this corporation will belong to.
               </p>
            </div>
         </div>

         <div className={styles.actions}>
            <button
               type="submit"
               className={styles.createButton}
               disabled={isCreating}
            >
               {isCreating ? "🏗️ Creating..." : "🏗️ Create Corporation"}
            </button>
            <a href="/corporations" className={styles.cancelButton}>
               Cancel
            </a>
         </div>
      </form>
   );
}
