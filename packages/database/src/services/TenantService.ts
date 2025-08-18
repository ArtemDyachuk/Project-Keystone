import { ITenant } from "../models/Tenant";
import { ITenantRepository } from "../repositories/interfaces/ITenantRepository";
import { TenantRepository } from "../repositories/TenantRepository";
import { TenantMember, ITenantMember } from "../models/TenantMember";
import { ROLES, UserRole } from "@keystone/auth";

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
   * Get user's membership in a specific tenant
   */
  static async getMembership(userId: string, tenantId: string): Promise<ITenantMember | null> {
    if (!userId || !tenantId) {
      return null;
    }

    try {
      const membership = await TenantMember.findOne({ userId, tenantId }).exec();
      return membership;
    } catch (error) {
      console.error("Error getting tenant membership:", error);
      return null;
    }
  }

  /**
   * Add a user as a member to a tenant
   */
  static async addMember(
    tenantId: string,
    userId: string,
    roles: UserRole[] | UserRole = [ROLES.TENANT_USER],
    invitedBy?: string
  ): Promise<ITenantMember> {
    if (!tenantId || !userId) {
      throw new Error("Tenant ID and User ID are required");
    }

    // Normalize roles to array
    const rolesArray = Array.isArray(roles) ? roles : [roles];

    // Check if membership already exists
    const existingMembership = await this.getMembership(userId, tenantId);
    if (existingMembership) {
      throw new Error("User is already a member of this tenant");
    }

    // Verify tenant exists
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const memberData: Partial<ITenantMember> = {
      userId,
      tenantId,
      roles: rolesArray,
      joinedAt: new Date(),
    };

    if (invitedBy) {
      memberData.invitedBy = invitedBy;
      memberData.invitedAt = new Date();
    }

    const member = new TenantMember(memberData);
    return await member.save();
  }

  /**
   * Update a user's role in a tenant
   */
  static async updateMemberRole(userId: string, tenantId: string, role: UserRole): Promise<ITenantMember | null> {
    if (!userId || !tenantId || !role) {
      throw new Error("User ID, Tenant ID, and Role are required");
    }

    try {
      const updatedMember = await TenantMember.findOneAndUpdate(
        { userId, tenantId },
        { role },
        { new: true }
      ).exec();

      return updatedMember;
    } catch (error) {
      console.error("Error updating member role:", error);
      return null;
    }
  }

  /**
   * Remove a user from a tenant
   */
  static async removeMember(userId: string, tenantId: string): Promise<boolean> {
    if (!userId || !tenantId) {
      return false;
    }

    try {
      const result = await TenantMember.deleteOne({ userId, tenantId }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error removing tenant member:", error);
      return false;
    }
  }

  /**
   * Get all members of a tenant
   */
  static async getTenantMembers(tenantId: string): Promise<ITenantMember[]> {
    if (!tenantId) {
      return [];
    }

    try {
      const members = await TenantMember.find({ tenantId }).exec();
      return members;
    } catch (error) {
      console.error("Error getting tenant members:", error);
      return [];
    }
  }

  /**
   * Get all tenants a user is a member of
   */
  static async getUserTenants(userId: string): Promise<{ tenant: ITenant; membership: ITenantMember }[]> {
    if (!userId) {
      return [];
    }

    try {
      const memberships = await TenantMember.find({ userId }).exec();
      const results: { tenant: ITenant; membership: ITenantMember }[] = [];

      for (const membership of memberships) {
        const tenant = await this.getTenantById(membership.tenantId);
        if (tenant) {
          results.push({ tenant, membership });
        }
      }

      return results;
    } catch (error) {
      console.error("Error getting user tenants:", error);
      return [];
    }
  }
}
