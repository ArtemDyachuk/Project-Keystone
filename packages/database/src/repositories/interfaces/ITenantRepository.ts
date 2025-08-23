import { ITenant } from "../../models/Tenant";

export interface ITenantRepository {
  /**
   * Create a new tenant
   */
  create(tenant: Omit<ITenant, '_id' | 'createdAt' | 'updatedAt'>): Promise<ITenant>;

  /**
   * Find all tenants
   */
  findAll(): Promise<ITenant[]>;

  /**
   * Find tenant by ID
   */
  findById(id: string): Promise<ITenant | null>;

  /**
   * Find tenant by name
   */
  findByName(name: string): Promise<ITenant | null>;

  /**
   * Find tenant by Google Identity Platform tenant ID
   */
  findByGipId(gipTenantId: string): Promise<ITenant | null>;

  /**
   * Find tenants by IDs (for filtering user's tenants)
   */
  findByIds(tenantIds: string[]): Promise<ITenant[]>;

  /**
   * Update tenant by ID
   */
  updateById(id: string, updates: Partial<ITenant>): Promise<ITenant | null>;

  /**
   * Delete tenant by ID
   */
  deleteById(id: string): Promise<boolean>;

  /**
   * Check if tenant exists by name
   */
  existsByName(name: string): Promise<boolean>;

  /**
   * Check if tenant exists by Google Identity Platform tenant ID
   */
  existsByGipId(gipTenantId: string): Promise<boolean>;
}
