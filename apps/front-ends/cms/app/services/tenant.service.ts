import { config } from "@/lib/config";
import { getCurrentUser } from "@/app/actions/user.actions";
import { TenantService, connectToDatabase } from "@keystone/database";
import { getSessionCookie } from "@/lib/auth/cookies";

export interface SerializedTenant {
  _id: string;
  name: string;
  firebaseTenantId?: string; // Firebase Auth tenant ID
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
  private static serializeTenant(tenant: any): SerializedTenant {
    return {
      _id: tenant._id?.toString() || "",
      name: tenant.name,
      firebaseTenantId: tenant.firebaseTenantId,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Create a new tenant in the database
   * This is the main method for creating tenants in MongoDB
   */
  static async createTenantInDatabase(name: string): Promise<SerializedTenant> {
    try {
      await this.ensureConnection();

      // Create new tenant using the database service
      const newTenant = await TenantService.createTenant(name.trim());

      return this.serializeTenant(newTenant);
    } catch (error) {
      console.error("Failed to create tenant in database:", error);
      throw new Error(`Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync Firebase tenant to existing database
   * This ensures backward compatibility with existing components
   */
  static async syncFirebaseTenantToDatabase(firebaseTenant: any): Promise<SerializedTenant> {
    try {
      await this.ensureConnection();

      // Check if tenant already exists in database
      const existingTenant = await TenantService.getTenantById(firebaseTenant.id);

      if (existingTenant) {
        // Update existing tenant
        const updatedTenant = await TenantService.updateTenant(existingTenant._id!, {
          name: firebaseTenant.name,
          firebaseTenantId: firebaseTenant.id,
          updatedAt: new Date(),
        });

        if (!updatedTenant) {
          throw new Error("Failed to update tenant");
        }

        return this.serializeTenant(updatedTenant);
      } else {
        // Create new tenant in database
        const newTenant = await TenantService.createTenant(firebaseTenant.name);
        return this.serializeTenant(newTenant);
      }
    } catch (error) {
      console.error("Failed to sync Firebase tenant to database:", error);
      throw new Error(`Failed to sync tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      const userData = await getCurrentUser();

      // If user doesn't have tenant access, try to refresh claims from backend
      if (!userData?.tenantIds || !userData.tenantIds.includes(tenantId)) {
        console.warn(`User ${userData?.username || 'unknown'} doesn't have access to tenant ${tenantId}, attempting to refresh claims...`);

        try {
          // Try to get fresh claims from backend
          const response = await fetch(`${config.apiBaseUrl}/api/tenants/user/me`, {
            method: "GET",
            headers: {
              "Cookie": `fb_session=${await getSessionCookie()}`,
            },
          });

          if (response.ok) {
            const result = await response.json();
            if (result.tenants?.some((t: any) => t._id === tenantId)) {
              console.log("✅ User access verified via backend, proceeding with tenant fetch");
            } else {
              console.warn(`❌ Backend confirms user has no access to tenant ${tenantId}`);
              return null;
            }
          } else {
            console.warn("❌ Failed to verify tenant access via backend");
            return null;
          }
        } catch (refreshError) {
          console.warn("❌ Failed to refresh claims:", refreshError);
          return null;
        }
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
   * Update a tenant via backend API
   * @param tenantId The tenant ID to update
   * @param updates Tenant data to update (any fields)
   * @returns Promise<SerializedTenant | null> Updated tenant or null if failed
   */
  static async updateTenant(tenantId: string, updates: Record<string, any>): Promise<SerializedTenant | null> {
    try {
      // Get tokens from HTTP-only cookies
      const sessionCookie = await getSessionCookie();

      if (!sessionCookie) {
        throw new Error("No access token found. Please log in again.");
      }

      // Update tenant via backend API
      const response = await fetch(`${config.apiBaseUrl}/api/tenants/${tenantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionCookie}`,
        },
        body: JSON.stringify({
          ...updates,
          refreshToken: sessionCookie || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update organization");
      }

      const result = await response.json();

      // Convert the result to our serialized format
      return this.serializeTenant(result);
    } catch (error) {
      console.error("Failed to update tenant via API:", error);
      throw new Error(`Failed to update tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a tenant via backend API
   * @param tenantId The tenant ID to delete
   * @returns Promise<boolean> True if successful
   */
  static async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      // Get tokens from HTTP-only cookies
      const sessionCookie = await getSessionCookie();

      if (!sessionCookie) {
        throw new Error("No access token found. Please log in again.");
      }

      // Delete tenant via backend API
      const response = await fetch(`${config.apiBaseUrl}/api/tenants/${tenantId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${sessionCookie}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: sessionCookie || undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete organization");
      }

      return true;
    } catch (error) {
      console.error("Failed to delete tenant via API:", error);
      throw new Error(`Failed to delete tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}
