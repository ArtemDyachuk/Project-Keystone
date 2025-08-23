import { ITenant } from "../models/Tenant";
import { ITenantRepository } from "../repositories/interfaces/ITenantRepository";
import { TenantRepository } from "../repositories/TenantRepository";

export class TenantService {
  private static tenantRepository: ITenantRepository = new TenantRepository();

  /**
   * Create a new tenant with validation
   */
  static async createTenant(name: string, gipTenantId: string): Promise<ITenant> {
    // Business logic: Validate name
    if (!name || name.trim().length === 0) {
      throw new Error("Tenant name is required");
    }

    if (!gipTenantId) {
      throw new Error("Google Identity Platform tenant ID is required");
    }

    const trimmedName = name.trim();

    // Business logic: Check if tenant already exists
    const exists = await this.tenantRepository.existsByName(trimmedName);
    if (exists) {
      throw new Error(`Tenant with name "${trimmedName}" already exists`);
    }

    return await this.tenantRepository.create({
      name: trimmedName,
      gipTenantId
    });
  }

  /**
   * Get tenants by IDs (for filtering user's tenants)
   */
  static async getTenantsByIds(tenantIds: string[]): Promise<ITenant[]> {
    if (!tenantIds || tenantIds.length === 0) {
      return [];
    }

    return await this.tenantRepository.findByIds(tenantIds);
  }

  /**
   * Get tenant by ID
   */
  static async getTenantById(id: string): Promise<ITenant | null> {
    if (!id) {
      throw new Error("Tenant ID is required");
    }
    return await this.tenantRepository.findById(id);
  }

  /**
   * Get tenant by name
   */
  static async getTenantByName(name: string): Promise<ITenant | null> {
    if (!name) {
      throw new Error("Tenant name is required");
    }
    return await this.tenantRepository.findByName(name.trim());
  }

  /**
   * Get tenant by GIP tenant ID
   */
  static async getTenantByGipId(gipTenantId: string): Promise<ITenant | null> {
    if (!gipTenantId) {
      throw new Error("GIP tenant ID is required");
    }
    return await this.tenantRepository.findByGipId(gipTenantId);
  }

  /**
   * Update tenant with validation
   */
  static async updateTenant(id: string, updates: Partial<ITenant>): Promise<ITenant | null> {
    if (!id) {
      throw new Error("Tenant ID is required");
    }

    // Business logic: If updating name, check for duplicates
    if (updates.name) {
      const trimmedName = updates.name.trim();
      if (trimmedName.length === 0) {
        throw new Error("Tenant name cannot be empty");
      }

      const existingTenant = await this.tenantRepository.findByName(trimmedName);
      if (existingTenant && existingTenant._id !== id) {
        throw new Error(`Tenant with name "${trimmedName}" already exists`);
      }

      updates.name = trimmedName;
    }

    return await this.tenantRepository.updateById(id, updates);
  }

  /**
   * Delete tenant
   */
  static async deleteTenant(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Tenant ID is required");
    }
    return await this.tenantRepository.deleteById(id);
  }

  /**
   * Check if tenant name exists
   */
  static async tenantExists(name: string): Promise<boolean> {
    if (!name) {
      return false;
    }
    return await this.tenantRepository.existsByName(name.trim());
  }

  /**
   * Check if GIP tenant ID exists
   */
  static async gipTenantExists(gipTenantId: string): Promise<boolean> {
    if (!gipTenantId) {
      return false;
    }
    return await this.tenantRepository.existsByGipId(gipTenantId);
  }
}
