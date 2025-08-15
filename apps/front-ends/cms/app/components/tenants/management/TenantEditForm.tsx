"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateTenant } from "@/app/actions";
import { Tenant } from "../types";
import styles from "./TenantManagement.module.css";

interface TenantEditFormProps {
  tenant: Tenant;
}

export function TenantEditForm({ tenant }: TenantEditFormProps) {
  const [updateData, setUpdateData] = useState({
    name: tenant.name,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const result = await updateTenant(tenant._id, updateData);

      if (result.success) {
        toast.success("Organization updated successfully!");
      } else {
        toast.error(`${result.error || "Failed to update organization"}`);
      }
    } catch (error) {
      toast.error("Failed to update organization");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="name">Organization Name</label>
        <input
          id="name"
          type="text"
          value={updateData.name}
          onChange={(e) => setUpdateData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter your organization name"
          disabled={isLoading}
        />
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleSave}
          className={styles.editButton}
          disabled={isLoading || !updateData.name.trim()}
        >
          {isLoading ? "Updating..." : "💾 Save Changes"}
        </button>
      </div>
    </div>
  );
}
