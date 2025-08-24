import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { Corporation, TenantMembership } from "@keystone/database";
import { getRoleDefinition, getAllRoleNames } from "@keystone/rbac";

export interface CreateCorporationRequest {
   name: string;
   tenantId: string;
   userId: string; // Firebase UID of the user creating the corporation
}

export interface UpdateCorporationRequest {
   name?: string;
}

export interface CorporationResponse {
   success: boolean;
   corporation?: any;
   corporations?: any[];
   message: string;
}

@Injectable()
export class CorporationService {
   private readonly logger = new Logger(CorporationService.name);

   constructor() { }

   /**
    * Create a new corporation
    */
   async createCorporation(request: CreateCorporationRequest): Promise<CorporationResponse> {
      try {
         this.logger.log(`🔄 Creating corporation "${request.name}" for tenant ${request.tenantId}`);

         // Check if user has permission to create corporations in this tenant
         const membership = await TenantMembership.findOne({
            userId: request.userId,
            tenantId: request.tenantId,
            isActive: true
         });

         if (!membership) {
            throw new HttpException("User not found in this tenant", HttpStatus.NOT_FOUND);
         }

         // Check if user has permission to create corporations
         const canCreate = membership.roles.some((role: string) =>
            this.roleHasPermission(role, "corporation:create")
         );

         if (!canCreate) {
            throw new HttpException("Insufficient permissions to create corporation", HttpStatus.FORBIDDEN);
         }

         // Create the corporation
         const corporation = new Corporation({
            name: request.name,
            tenantId: request.tenantId
         });

         await corporation.save();

         this.logger.log(`✅ Corporation created successfully with ID: ${corporation._id}`);
         return {
            success: true,
            corporation,
            message: `Corporation "${request.name}" created successfully`
         };
      } catch (error) {
         this.logger.error(`❌ Corporation creation failed:`, error);
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to create corporation: ${error instanceof Error ? error.message : "Unknown error"}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Get all corporations for a user
    */
   async getUserCorporations(userId: string): Promise<CorporationResponse> {
      try {
         this.logger.log(`🔄 Fetching corporations for user ${userId}`);

         // Get user's tenant memberships
         const memberships = await TenantMembership.find({
            userId: userId,
            isActive: true
         });

         if (!memberships || memberships.length === 0) {
            return {
               success: true,
               corporations: [],
               message: "No corporations found"
            };
         }

         // Get corporations for all user's tenants
         const tenantIds = memberships.map(m => m.tenantId);
         const corporations = await Corporation.find({
            tenantId: { $in: tenantIds }
         }).sort({ createdAt: -1 });

         this.logger.log(`✅ Found ${corporations.length} corporations for user`);
         return {
            success: true,
            corporations,
            message: `Found ${corporations.length} corporations`
         };
      } catch (error) {
         this.logger.error(`❌ Failed to get user corporations:`, error);
         throw new HttpException(
            `Failed to fetch corporations: ${error instanceof Error ? error.message : "Unknown error"}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Get corporation by ID
    */
   async getCorporationById(id: string, userId: string): Promise<CorporationResponse> {
      try {
         this.logger.log(`🔄 Fetching corporation ${id} for user ${userId}`);

         const corporation = await Corporation.findById(id);
         if (!corporation) {
            throw new HttpException(
               `Corporation with ID "${id}" not found`,
               HttpStatus.NOT_FOUND
            );
         }

         // Check if user has access to this corporation's tenant
         const membership = await TenantMembership.findOne({
            userId: userId,
            tenantId: corporation.tenantId,
            isActive: true
         });

         if (!membership) {
            throw new HttpException("Access denied to this corporation", HttpStatus.FORBIDDEN);
         }

         this.logger.log(`✅ Corporation retrieved successfully`);
         return {
            success: true,
            corporation,
            message: "Corporation retrieved successfully"
         };
      } catch (error) {
         this.logger.error(`❌ Failed to get corporation:`, error);
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to fetch corporation: ${error instanceof Error ? error.message : "Unknown error"}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Update corporation
    */
   async updateCorporation(id: string, updates: UpdateCorporationRequest, userId: string): Promise<CorporationResponse> {
      try {
         this.logger.log(`🔄 Updating corporation ${id} for user ${userId}`);

         const corporation = await Corporation.findById(id);
         if (!corporation) {
            throw new HttpException(
               `Corporation with ID "${id}" not found`,
               HttpStatus.NOT_FOUND
            );
         }

         // Check if user has access to this corporation's tenant
         const membership = await TenantMembership.findOne({
            userId: userId,
            tenantId: corporation.tenantId,
            isActive: true
         });

         if (!membership) {
            throw new HttpException("Access denied to this corporation", HttpStatus.FORBIDDEN);
         }

         // Check if user has permission to update corporations
         const canUpdate = membership.roles.some((role: string) =>
            this.roleHasPermission(role, "corporation:update")
         );

         if (!canUpdate) {
            throw new HttpException("Insufficient permissions to update corporation", HttpStatus.FORBIDDEN);
         }

         // Update the corporation
         const updatedCorporation = await Corporation.findByIdAndUpdate(
            id,
            updates,
            { new: true }
         );

         this.logger.log(`✅ Corporation updated successfully`);
         return {
            success: true,
            corporation: updatedCorporation,
            message: "Corporation updated successfully"
         };
      } catch (error) {
         this.logger.error(`❌ Failed to update corporation:`, error);
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to update corporation: ${error instanceof Error ? error.message : "Unknown error"}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Delete corporation
    */
   async deleteCorporation(id: string, userId: string): Promise<CorporationResponse> {
      try {
         this.logger.log(`🔄 Deleting corporation ${id} for user ${userId}`);

         const corporation = await Corporation.findById(id);
         if (!corporation) {
            throw new HttpException(
               `Corporation with ID "${id}" not found`,
               HttpStatus.NOT_FOUND
            );
         }

         // Check if user has access to this corporation's tenant
         const membership = await TenantMembership.findOne({
            userId: userId,
            tenantId: corporation.tenantId,
            isActive: true
         });

         if (!membership) {
            throw new HttpException("Access denied to this corporation", HttpStatus.FORBIDDEN);
         }

         // Check if user has permission to delete corporations
         const canDelete = membership.roles.some((role: string) =>
            this.roleHasPermission(role, "corporation:delete")
         );

         if (!canDelete) {
            throw new HttpException("Insufficient permissions to delete corporation", HttpStatus.FORBIDDEN);
         }

         // Delete the corporation
         await Corporation.findByIdAndDelete(id);

         this.logger.log(`✅ Corporation deleted successfully`);
         return {
            success: true,
            message: `Corporation "${corporation.name}" deleted successfully`
         };
      } catch (error) {
         this.logger.error(`❌ Failed to delete corporation:`, error);
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to delete corporation: ${error instanceof Error ? error.message : "Unknown error"}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }



   /**
    * Get all available roles for validation
    */
   private getAllAvailableRoles(): string[] {
      return getAllRoleNames();
   }

   /**
    * Check if a role has a specific permission
    */
   private roleHasPermission(roleName: string, permission: string): boolean {
      const role = getRoleDefinition(roleName);
      if (!role) return false;

      // Check direct permissions
      if (role.permissions.includes(permission)) {
         return true;
      }

      // Check inherited permissions
      if (role.inheritsFrom) {
         return role.inheritsFrom.some(inheritedRole =>
            this.roleHasPermission(inheritedRole, permission)
         );
      }

      return false;
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
}
