import { TenantService, connectToDatabase } from "@keystone/database";
import { ITenant } from "@keystone/database";
import { getUserDataFromJWT } from "@/lib/auth-utils";

interface SerializedTenant {
  _id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Service for tenant operations that can run server-side
 * This service directly uses the database module without API calls
 */
export class TenantServiceClient {
  /**
   * Ensure database connection is established
   */
  private static async ensureConnection() {
    try {
      await connectToDatabase();
    } catch (error) {
      console.error("Failed to connect to database:", error);
      throw new Error("Database connection failed");
    }
  }

  /**
   * Convert MongoDB object to plain object for React serialization
   */
  private static serializeTenant(tenant: ITenant): SerializedTenant {
    return {
      _id: tenant._id?.toString() || "",
      name: tenant.name,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Get tenants by their IDs
   * @param tenantIds Array of tenant IDs to fetch
   * @returns Promise<Tenant[]> Array of tenant objects
   */
  static async getTenantsByIds(tenantIds: string[]): Promise<SerializedTenant[]> {
    try {
      await this.ensureConnection();
      const tenants = await TenantService.getTenantsByIds(tenantIds);
      return tenants.map(tenant => this.serializeTenant(tenant));
    } catch (error) {
      console.error("Failed to fetch tenants by IDs:", error);
      throw new Error(`Failed to fetch tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a single tenant by ID with user access validation
   * @param tenantId The tenant ID to fetch
   * @returns Promise<Tenant | null> Tenant object or null if not found/unauthorized
   */
  static async getTenantById(tenantId: string): Promise<SerializedTenant | null> {
    try {
      await this.ensureConnection();
      
      // SECURITY: Validate user has access to this tenant
      const userData = await getUserDataFromJWT();
      if (!userData?.tenantIds || !userData.tenantIds.includes(tenantId)) {
        console.warn(`Unauthorized tenant access attempt blocked for user: ${userData?.username || 'unknown'}`);
        return null; // Return null instead of throwing error to avoid information disclosure
      }
      
      const tenant = await TenantService.getTenantById(tenantId);
      
      if (!tenant) {
        return null;
      }
      
      return this.serializeTenant(tenant);
    } catch (error) {
      console.error("Failed to fetch tenant by ID:", error);
      throw new Error(`Failed to fetch tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all tenants - REMOVED FOR SECURITY
   * In a multi-tenant system, users should only access their assigned tenants
   * Use getTenantsByIds() instead with proper user tenant filtering
   */
  // static async getAllTenants(): Promise<SerializedTenant[]> {
  //   try {
  //     await this.ensureConnection();
  //     const tenants = await TenantService.getAllTenants();
  //     return tenants.map(tenant => this.serializeTenant(tenant));
  //   } catch (error) {
  //     console.error("Failed to fetch all tenants:", error);
  //     throw new Error(`Failed to fetch all tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //   }
  // }
}
