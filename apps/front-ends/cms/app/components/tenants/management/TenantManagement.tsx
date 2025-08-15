import { Tenant } from "../types";
import { TenantEditForm } from "./TenantEditForm";
import { TenantDeleteButton } from "./TenantDeleteButton";
import styles from "./TenantManagement.module.css";

interface TenantManagementProps {
  tenant: Tenant;
}

export function TenantManagement({ tenant }: TenantManagementProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>⚙️ Manage Organization</h1>
        <p>Edit settings for "{tenant.name}"</p>
      </div>

      <TenantEditForm tenant={tenant} />

      <div className={styles.info}>
        <div className={styles.field}>
          <label>Organization ID</label>
          <div className={styles.value}>{tenant._id}</div>
        </div>

        <div className={styles.field}>
          <label>Created</label>
          <div className={styles.value}>
            {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "Unknown"}
          </div>
        </div>
      </div>

      <TenantDeleteButton tenant={tenant} />

      <div className={styles.backSection}>
        <a href="/tenants" className={styles.backButton}>
          ← Back to Organizations
        </a>
      </div>
    </div>
  );
}
