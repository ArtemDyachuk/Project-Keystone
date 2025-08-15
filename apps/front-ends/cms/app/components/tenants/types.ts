import { SerializedTenant } from "@/app/services/tenant.service";

export interface UserData {
  sub: string;
  email?: string;
  username?: string;
  email_verified?: boolean;
  firstName?: string;  // Cleaner than given_name
  lastName?: string;   // Cleaner than family_name
  tenantIds?: string[];  // Array of tenant IDs
  selectedTenantId?: string;  // Single selected tenant ID
}

// Use serialized types for client components to ensure proper JSON serialization
export type Tenant = SerializedTenant;
