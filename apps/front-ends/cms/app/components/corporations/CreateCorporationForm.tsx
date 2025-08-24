"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCorporation } from "@/app/actions/corporation.actions";
import styles from "./CreateCorporationForm.module.css";

export function CreateCorporationForm() {
   const [isCreating, setIsCreating] = useState(false);
   const router = useRouter();
   const [formData, setFormData] = useState({
      name: ""
   });

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name.trim()) {
         alert("Please enter a corporation name");
         return;
      }

      try {
         setIsCreating(true);

         // Create FormData for the server action
         const formDataObj = new FormData();
         formDataObj.append("name", formData.name.trim());

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
