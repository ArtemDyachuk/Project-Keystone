import { TenantService, connectToDatabase } from "@keystone/database";

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
  private static serializeTenant(tenant: any): any {
    return {
      _id: tenant._id?.toString(),
      name: tenant.name,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      // Add any other fields you need
    };
  }

  /**
   * Get tenants by their IDs
   * @param tenantIds Array of tenant IDs to fetch
   * @returns Promise<Tenant[]> Array of tenant objects
   */
  static async getTenantsByIds(tenantIds: string[]): Promise<any[]> {
    try {
      if (!tenantIds || tenantIds.length === 0) {
        return [];
      }

      // Ensure database connection is established
      await this.ensureConnection();

      // Use the database service directly
      const tenants = await TenantService.getTenantsByIds(tenantIds);
      
      // Serialize MongoDB objects to plain objects
      return tenants.map(tenant => this.serializeTenant(tenant));
    } catch (error) {
      console.error("Failed to fetch tenants by IDs:", error);
      throw new Error(`Failed to fetch tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a single tenant by ID
   * @param tenantId The tenant ID to fetch
   * @returns Promise<Tenant | null> Tenant object or null if not found
   */
  static async getTenantById(tenantId: string): Promise<any | null> {
    try {
      if (!tenantId) {
        return null;
      }

      // Ensure database connection is established
      await this.ensureConnection();

      // Use the database service directly
      const tenant = await TenantService.getTenantById(tenantId);
      
      // Serialize MongoDB object to plain object
      return tenant ? this.serializeTenant(tenant) : null;
    } catch (error) {
      console.error("Failed to fetch tenant by ID:", error);
      throw new Error(`Failed to fetch tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all tenants (for admin purposes)
   * @returns Promise<Tenant[]> Array of all tenant objects
   */
  static async getAllTenants(): Promise<any[]> {
    try {
      // Ensure database connection is established
      await this.ensureConnection();

      // Use the database service directly
      const tenants = await TenantService.getAllTenants();
      
      // Serialize MongoDB objects to plain objects
      return tenants.map(tenant => this.serializeTenant(tenant));
    } catch (error) {
      console.error("Failed to fetch all tenants:", error);
      throw new Error(`Failed to fetch all tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
