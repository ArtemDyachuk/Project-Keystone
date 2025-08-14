import { ITenant } from "@keystone/database";

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

// Use database types directly for single source of truth
export type Tenant = ITenant;
