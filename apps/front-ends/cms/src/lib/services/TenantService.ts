import { ITenant } from "../models/Tenant";
import { ITenantRepository } from "../repositories/interfaces/ITenantRepository";
import { TenantRepository } from "../repositories/TenantRepository";

export class TenantService {
  private static tenantRepository: ITenantRepository = new TenantRepository();

  /**
   * Create a new tenant with validation
   */
  static async createTenant(name: string): Promise<ITenant> {
    // Business logic: Validate name
    if (!name || name.trim().length === 0) {
      throw new Error("Tenant name is required");
    }

    const trimmedName = name.trim();

    // Business logic: Check if tenant already exists
    const exists = await this.tenantRepository.existsByName(trimmedName);
    if (exists) {
      throw new Error(`Tenant with name "${trimmedName}" already exists`);
    }

    return await this.tenantRepository.create({ name: trimmedName });
  }

  /**
   * Get all tenants
   */
  static async getAllTenants(): Promise<ITenant[]> {
    return await this.tenantRepository.findAll();
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
}
