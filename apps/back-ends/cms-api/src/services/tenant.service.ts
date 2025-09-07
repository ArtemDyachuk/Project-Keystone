import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { FirebaseServerClient } from "@keystone/auth";
import { Tenant, Corporation, TenantMembership } from "@keystone/database";
import { getRoleDefinition, getAllRoleNames } from "@keystone/rbac";
import mongoose from "mongoose";

export interface CreateTenantRequest {
  name: string;
  userId: string; // Firebase UID of the user creating the tenant
  userEmail: string;
}

export interface CreateTenantResponse {
  success: boolean;
  tenantId: string;
  corporationId: string;
  message: string;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private readonly firebaseClient: FirebaseServerClient;

  constructor() {
    this.firebaseClient = new FirebaseServerClient();
  }

  /**
   * Create a new tenant with corporation and set up user as owner
   * This method handles both Firebase GIP tenant creation and local database setup
   */
  async createTenant(request: CreateTenantRequest): Promise<CreateTenantResponse> {
    try {
      this.logger.log(`🔄 Starting tenant creation for user ${request.userId}`);

      // Validate tenant name (no special characters)
      if (!this.isValidTenantName(request.name)) {
        throw new HttpException(
          "Tenant name can only contain letters, numbers, and spaces",
          HttpStatus.BAD_REQUEST
        );
      }

      // Check if user already has a tenant
      const existingMembership = await TenantMembership.findOne({
        userId: request.userId,
        isActive: true
      });

      if (existingMembership) {
        throw new HttpException(
          "User already belongs to a tenant",
          HttpStatus.CONFLICT
        );
      }

      // Step 1: Create tenant in Google Identity Platform
      this.logger.log("🔄 Creating tenant in Google Identity Platform...");
      
      // Sanitize display name for Firebase (Firebase has stricter requirements)
      const sanitizedDisplayName = this.sanitizeFirebaseDisplayName(request.name);
      
      const tenantConfig = {
        displayName: sanitizedDisplayName
      };

      const gipTenant = await this.firebaseClient.createTenant(tenantConfig);
      const gipTenantId = (gipTenant as any).tenantId;
      
      this.logger.log(`✅ GIP tenant created with ID: ${gipTenantId}`);

      // Step 2: Create local tenant record
      this.logger.log("🔄 Creating local tenant record...");
      const tenant = new Tenant({
        name: request.name,
        gipTenantId: gipTenantId,
        isActive: true,
        createdAt: new Date()
      });

      await tenant.save();
      this.logger.log(`✅ Local tenant record created with ID: ${tenant._id}`);

      // Step 3: Create corporation
      this.logger.log("🔄 Creating corporation...");
      const corporation = new Corporation({
        name: request.name,
        tenantId: tenant._id.toString(),
        isActive: true,
        createdAt: new Date()
      });

      await corporation.save();
      this.logger.log(`✅ Corporation created with ID: ${corporation._id}`);

      // Step 4: Create tenant membership for user (as owner)
      // Note: User will be created in Firebase later during signup
      this.logger.log("🔄 Creating tenant membership for user...");
      const membership = new TenantMembership({
        userId: request.userId,
        tenantId: tenant._id.toString(),
        roles: ["Tenant:Owner"],
        isActive: true
      });

      await membership.save();
      this.logger.log(`✅ Tenant membership created for user`);

      this.logger.log(`✅ Tenant creation completed successfully`);

      return {
        success: true,
        tenantId: tenant._id.toString(),
        corporationId: corporation._id.toString(),
        message: `Tenant "${request.name}" created successfully`
      };

    } catch (error) {
      this.logger.error(`❌ Tenant creation failed:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to create tenant: ${error instanceof Error ? error.message : "Unknown error"}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check if user needs to create a tenant
   */
  async checkTenantRequirement(userId: string): Promise<{ needsTenant: boolean; existingTenantId?: string }> {
    try {
      const membership = await TenantMembership.findOne({
        userId: userId,
        isActive: true
      });

      if (membership) {
        return {
          needsTenant: false,
          existingTenantId: membership.tenantId
        };
      }

      return { needsTenant: true };
    } catch (error) {
      this.logger.error(`❌ Failed to check tenant requirement:`, error);
      // Default to requiring tenant creation if check fails
      return { needsTenant: true };
    }
  }

  /**
   * Get user's active tenant and corporation
   */
  async getUserActiveTenant(userId: string): Promise<{
    tenantId: string;
    corporationId: string;
    roles: string[];
  } | null> {
    try {
      const membership = await TenantMembership.findOne({
        userId: userId,
        isActive: true
      }).populate("tenantId corporationId");

      if (!membership) {
        return null;
      }

      return {
        tenantId: membership.tenantId,
        corporationId: membership.corporationId || "",
        roles: membership.roles
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get user active tenant:`, error);
      return null;
    }
  }

  /**
   * Add a user to a tenant with specified roles (used for invite acceptance)
   */
  async addUserToTenant(userId: string, tenantId: string, roles: string[]): Promise<void> {
    try {
      this.logger.log(`Adding user ${userId} to tenant ${tenantId} with roles: ${roles.join(", ")}`);

      // Check if user already has a membership for this tenant
      const existingMembership = await TenantMembership.findOne({
        userId: userId,
        tenantId: tenantId
      });

      if (existingMembership) {
        // Update existing membership
        existingMembership.roles = roles;
        existingMembership.isActive = true;
        await existingMembership.save();
        this.logger.log(`✅ Updated existing tenant membership for user ${userId}`);
      } else {
        // Create new membership
        const membership = new TenantMembership({
          userId: userId,
          tenantId: tenantId,
          roles: roles,
          isActive: true
        });

        await membership.save();
        this.logger.log(`✅ Created new tenant membership for user ${userId}`);
      }

      // Add user to Firebase GIP tenant if available
      try {
        const tenant = await Tenant.findById(tenantId);
        if (tenant?.gipTenantId) {
          await this.firebaseClient.addUserToTenant(userId, tenant.gipTenantId);
          this.logger.log(`✅ User added to Firebase GIP tenant`);
        }
      } catch (firebaseError) {
        this.logger.error(`❌ Failed to add user to Firebase GIP tenant:`, firebaseError);
        // Don't fail the entire operation, but log the error
      }

    } catch (error) {
      this.logger.error(`❌ Failed to add user to tenant:`, error);
      throw error;
    }
  }

  /**
   * Validate tenant name (no special characters)
   */
  private isValidTenantName(name: string): boolean {
    // Allow letters, numbers, spaces, and common punctuation
    const validNameRegex = /^[a-zA-Z0-9\s\-_&.()]+$/;
    return validNameRegex.test(name) && name.trim().length >= 2 && name.trim().length <= 100;
  }

  /**
   * Validate if a role exists in the system
   */
  private validateRole(roleName: string): boolean {
    return getRoleDefinition(roleName) !== undefined;
  }

  /**
   * Get all available roles for validation
   */
  private getAllAvailableRoles(): string[] {
    return getAllRoleNames();
  }

  /**
   * Get all available roles in the system
   */
  async getAvailableRoles(): Promise<string[]> {
    try {
      const roles = this.getAllAvailableRoles();
      this.logger.log(`✅ Retrieved ${roles.length} available roles`);
      return roles;
    } catch (error) {
      this.logger.error(`❌ Failed to get available roles:`, error);
      return [];
    }
  }

  /**
   * Validate and sanitize roles, filtering out invalid ones
   */
  private validateAndSanitizeRoles(roles: string[]): string[] {
    if (!Array.isArray(roles)) {
      return [];
    }
    
    return roles.filter(role => this.validateRole(role));
  }

  /**
   * Update user roles in a tenant
   */
  async updateUserRoles(userId: string, tenantId: string, newRoles: string[]): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔄 Updating roles for user ${userId} in tenant ${tenantId}`);

      // Validate the roles
      const validatedRoles = this.validateAndSanitizeRoles(newRoles);
      if (validatedRoles.length === 0) {
        throw new HttpException("No valid roles provided", HttpStatus.BAD_REQUEST);
      }

      // Check if user has membership in this tenant
      const membership = await TenantMembership.findOne({
        userId: userId,
        tenantId: tenantId,
        isActive: true
      });

      if (!membership) {
        throw new HttpException("User not found in this tenant", HttpStatus.NOT_FOUND);
      }

      // Update the roles
      membership.roles = validatedRoles;
      await membership.save();

      this.logger.log(`✅ User roles updated successfully`);
      return {
        success: true,
        message: `User roles updated successfully`
      };
    } catch (error) {
      this.logger.error(`❌ Failed to update user roles:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update user roles: ${error instanceof Error ? error.message : "Unknown error"}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Sanitize display name for Firebase tenant creation
   * Firebase has very strict requirements for tenant display names:
   * - 1-63 characters
   * - Only alphanumeric, hyphens, and underscores (NO SPACES)
   * - Must start with a letter or number
   * - Cannot end with a hyphen
   */
  private sanitizeFirebaseDisplayName(name: string): string {
    // For debugging, let's try the most basic approach first
    // Convert to lowercase alphanumeric only
    let sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // If too short, add prefix
    if (sanitized.length < 3) {
      sanitized = 'org' + sanitized;
    }

    // Limit to reasonable length
    sanitized = sanitized.substring(0, 20);

    // If empty after sanitization, use a default
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'organization';
    }

    return sanitized;
  }

  /**
   * Delete a tenant from both GIP and local database
   * This method handles both Firebase GIP tenant deletion and local database cleanup
   */
  async deleteTenant(tenantId: string, gipTenantId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔄 Starting tenant deletion for tenant ${tenantId} (GIP: ${gipTenantId})`);

      // Step 1: Delete tenant from Google Identity Platform (Firebase)
      if (gipTenantId) {
        this.logger.log("🔄 Deleting tenant from Google Identity Platform...");

        try {
          await this.firebaseClient.deleteTenant(gipTenantId);
          this.logger.log(`✅ GIP tenant deleted successfully: ${gipTenantId}`);
        } catch (firebaseError) {
          this.logger.error(`❌ Firebase tenant deletion failed:`, firebaseError);
          // Continue with local deletion even if GIP deletion fails
          this.logger.warn(`⚠️ Proceeding with local deletion despite GIP failure`);
        }
      }

      // Step 2: Delete local tenant record and related data
      this.logger.log("🔄 Deleting local tenant data...");

      // Delete tenant memberships first (foreign key constraint)
      const deletedMemberships = await TenantMembership.deleteMany({ tenantId: new mongoose.Types.ObjectId(tenantId) });
      this.logger.log(`✅ Deleted ${deletedMemberships.deletedCount} tenant memberships`);

      // Delete corporations associated with this tenant
      const deletedCorporations = await Corporation.deleteMany({ tenantId: new mongoose.Types.ObjectId(tenantId) });
      this.logger.log(`✅ Deleted ${deletedCorporations.deletedCount} corporations`);

      // Delete the tenant itself
      const deletedTenant = await Tenant.findByIdAndDelete(tenantId);
      if (!deletedTenant) {
        throw new HttpException(
          `Tenant with ID "${tenantId}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      this.logger.log(`✅ Local tenant deleted successfully: ${tenantId}`);

      return {
        success: true,
        message: `Tenant "${deletedTenant.name}" deleted successfully from both GIP and local database`
      };
    } catch (error) {
      this.logger.error(`❌ Tenant deletion failed:`, error);
      throw error;
    }
  }
}
