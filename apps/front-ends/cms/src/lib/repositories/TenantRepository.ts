import { ITenantRepository } from "./interfaces/ITenantRepository";
import { Tenant, ITenant } from "../models/Tenant";

export class TenantRepository implements ITenantRepository {
  /**
   * Create a new tenant
   */
  async create(tenantData: Omit<ITenant, '_id' | 'createdAt' | 'updatedAt'>): Promise<ITenant> {
    const tenant = new Tenant(tenantData);
    return await tenant.save();
  }

  /**
   * Find all tenants
   */
  async findAll(): Promise<ITenant[]> {
    return await Tenant.find().sort({ createdAt: -1 });
  }

  /**
   * Find tenant by ID
   */
  async findById(id: string): Promise<ITenant | null> {
    return await Tenant.findById(id);
  }

  /**
   * Find tenant by name
   */
  async findByName(name: string): Promise<ITenant | null> {
    return await Tenant.findOne({ name });
  }

  /**
   * Update tenant by ID
   */
  async updateById(id: string, updates: Partial<ITenant>): Promise<ITenant | null> {
    return await Tenant.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete tenant by ID
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await Tenant.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Check if tenant exists by name
   */
  async existsByName(name: string): Promise<boolean> {
    const tenant = await Tenant.findOne({ name });
    return tenant !== null;
  }
}
