import { TenantService, connectToDatabase } from "@keystone/database";
import { ITenant } from "@keystone/database";
import { getUserDataFromJWT } from "@/lib/auth-utils";
import { config } from "@/lib/config";
import { getAuthCookies, setAuthCookiesInAction } from "@/lib/auth-cookies";

export interface SerializedTenant {
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
   * Update a tenant via backend API
   * @param tenantId The tenant ID to update
   * @param updates Tenant data to update (any fields)
   * @returns Promise<SerializedTenant | null> Updated tenant or null if failed
   */
  static async updateTenant(tenantId: string, updates: Record<string, any>): Promise<SerializedTenant | null> {
    try {
      // Get tokens from HTTP-only cookies
      const { accessToken, refreshToken } = await getAuthCookies();

      if (!accessToken) {
        throw new Error("No access token found. Please log in again.");
      }

      // Update tenant via backend API
      const response = await fetch(`${config.apiBaseUrl}/api/tenants/${tenantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...updates,
          refreshToken: refreshToken || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update organization");
      }

      const result = await response.json();

      // If backend returned fresh tokens, update cookies
      if (result.tokens) {
        await setAuthCookiesInAction(result.tokens);
      }

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
      const { accessToken, refreshToken } = await getAuthCookies();

      if (!accessToken) {
        throw new Error("No access token found. Please log in again.");
      }

      // Delete tenant via backend API
      const response = await fetch(`${config.apiBaseUrl}/api/tenants/${tenantId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: refreshToken || undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete organization");
      }

      const result = await response.json();

      // If backend returned fresh tokens, update cookies
      if (result.tokens) {
        await setAuthCookiesInAction(result.tokens);
      }

      return true;
    } catch (error) {
      console.error("Failed to delete tenant via API:", error);
      throw new Error(`Failed to delete tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}
