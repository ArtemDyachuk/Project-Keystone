import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { Corporation } from '@keystone/database';
import { SessionService } from '../services/session.service';
import { SessionGuard } from '../guards/session.guard';

// DTOs for request validation
export class CreateCorporationDto {
   name!: string;
}

export class UpdateCorporationDto {
   name?: string;
}

@Controller('corporations')
export class CorporationsController {
   constructor(
      private readonly sessionService: SessionService
   ) { }

   /**
    * Get all corporations for the authenticated user
    * GET /corporations/user/me
    */
   @Get('user/me')
   @UseGuards(SessionGuard)
   async getUserCorporations(@Req() request: Request & { user?: any; sessionId?: string }) {
      try {
         if (!request.user?.uid) {
            throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
         }

         // Get user's tenant memberships to find their corporations
         const { TenantMembership } = await import('@keystone/database');

         const memberships = await TenantMembership.find({
            userId: request.user.uid,
            isActive: true
         });

         if (!memberships || memberships.length === 0) {
            return {
               success: true,
               corporations: []
            };
         }

         // Get corporations for all user's tenants
         const tenantIds = memberships.map(m => m.tenantId);
         const corporations = await Corporation.find({
            tenantId: { $in: tenantIds }
         }).sort({ createdAt: -1 });

         return {
            success: true,
            corporations: corporations
         };
      } catch (error) {
         console.error('❌ Get user corporations failed:', error);
         throw new HttpException(
            `Failed to fetch corporations: ${error instanceof Error ? error.message : 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Get corporation by ID
    * GET /corporations/:id
    */
   @Get(':id')
   @UseGuards(SessionGuard)
   async getCorporationById(@Param('id') id: string, @Req() request: Request & { user?: any; sessionId?: string }) {
      try {
         if (!request.user?.uid) {
            throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
         }

         const corporation = await Corporation.findById(id);

         if (!corporation) {
            throw new HttpException(
               `Corporation with ID "${id}" not found`,
               HttpStatus.NOT_FOUND
            );
         }

         // Check if user has access to this corporation's tenant
         const { TenantMembership } = await import('@keystone/database');
         const membership = await TenantMembership.findOne({
            userId: request.user.uid,
            tenantId: corporation.tenantId,
            isActive: true
         });

         if (!membership) {
            throw new HttpException(
               "Access denied to this corporation",
               HttpStatus.FORBIDDEN
            );
         }

         return {
            success: true,
            corporation: corporation
         };
      } catch (error) {
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to fetch corporation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Create new corporation
    * POST /corporations
    */
   @Post()
   @UseGuards(SessionGuard)
   async createCorporation(@Body() createCorporationDto: CreateCorporationDto, @Req() request: Request & { user?: any; sessionId?: string }) {
      try {
         if (!request.user?.uid) {
            throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
         }

         if (!createCorporationDto.name?.trim()) {
            throw new HttpException("Corporation name is required", HttpStatus.BAD_REQUEST);
         }

         // Get user's tenant automatically
         const { TenantMembership } = await import('@keystone/database');
         const membership = await TenantMembership.findOne({
            userId: request.user.uid,
            isActive: true
         });

         if (!membership) {
            throw new HttpException(
               "You must belong to a tenant to create corporations",
               HttpStatus.FORBIDDEN
            );
         }

         // Create corporation
         const corporation = new Corporation({
            name: createCorporationDto.name.trim(),
            tenantId: membership.tenantId
         });

         await corporation.save();

         // Auto-select the newly created corporation
         if (request.sessionId) {
            await this.sessionService.switchCorporation(request.sessionId, corporation._id.toString());
         }

         return {
            success: true,
            corporation: corporation,
            message: `Corporation "${corporation.name}" created successfully`
         };
      } catch (error) {
         console.error('❌ Create corporation failed:', error);
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to create corporation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Update corporation
    * PUT /corporations/:id
    */
   @Put(':id')
   @UseGuards(SessionGuard)
   async updateCorporation(
      @Param('id') id: string,
      @Body() updateCorporationDto: UpdateCorporationDto,
      @Req() request: Request & { user?: any; sessionId?: string }
   ) {
      try {
         if (!request.user?.uid) {
            throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
         }

         const corporation = await Corporation.findById(id);

         if (!corporation) {
            throw new HttpException(
               `Corporation with ID "${id}" not found`,
               HttpStatus.NOT_FOUND
            );
         }

         // Check if user has access to this corporation's tenant
         const { TenantMembership } = await import('@keystone/database');
         const membership = await TenantMembership.findOne({
            userId: request.user.uid,
            tenantId: corporation.tenantId,
            isActive: true
         });

         if (!membership) {
            throw new HttpException(
               "Access denied to this corporation",
               HttpStatus.FORBIDDEN
            );
         }

         // Update corporation
         if (updateCorporationDto.name?.trim()) {
            corporation.name = updateCorporationDto.name.trim();
         }

         await corporation.save();

         return {
            success: true,
            corporation: corporation,
            message: "Corporation updated successfully"
         };
      } catch (error) {
         console.error('❌ Update corporation failed:', error);
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to update corporation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Select corporation (update user's selected corporation)
    * POST /corporations/:id/select
    */
   @Post(':id/select')
   @UseGuards(SessionGuard)
   async selectCorporation(@Param('id') id: string, @Req() request: Request & { user?: any; sessionId?: string }) {
      try {
         if (!request.user?.uid) {
            throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
         }

         // Check if user has access to this corporation via TenantMembership
         const { TenantMembership, Corporation } = await import('@keystone/database');
         const corporation = await Corporation.findById(id);

         if (!corporation) {
            throw new HttpException("Corporation not found", HttpStatus.NOT_FOUND);
         }

         const membership = await TenantMembership.findOne({
            userId: request.user.uid,
            tenantId: corporation.tenantId,
            isActive: true
         });

         if (!membership) {
            throw new HttpException("Access denied to this corporation", HttpStatus.FORBIDDEN);
         }

         // Update user's session to select this corporation
         if (request.sessionId) {
            await this.sessionService.switchCorporation(request.sessionId, id);
         }

         return {
            success: true,
            message: `Selected corporation: ${corporation.name}`,
            corporationId: id
         };
      } catch (error) {
         console.error('❌ Select corporation failed:', error);
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to select corporation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }

   /**
    * Delete corporation
    * DELETE /corporations/:id
    */
   @Delete(':id')
   @UseGuards(SessionGuard)
   async deleteCorporation(@Param('id') id: string, @Req() request: Request & { user?: any; sessionId?: string }) {
      try {
         if (!request.user?.uid) {
            throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
         }

         const corporation = await Corporation.findById(id);

         if (!corporation) {
            throw new HttpException(
               `Corporation with ID "${id}" not found`,
               HttpStatus.NOT_FOUND
            );
         }

         // Check if user has access to this corporation's tenant
         const { TenantMembership } = await import('@keystone/database');
         const membership = await TenantMembership.findOne({
            userId: request.user.uid,
            tenantId: corporation.tenantId,
            isActive: true
         });

         if (!membership) {
            throw new HttpException(
               "Access denied to this corporation",
               HttpStatus.FORBIDDEN
            );
         }

         // Check if this was the selected corporation
         const wasSelected = request.user.selectedCorporationId === id;

         // Delete corporation
         await Corporation.findByIdAndDelete(id);

         // If this was the selected corporation, update the session
         if (wasSelected && request.sessionId) {
            // Find next available corporation or clear selection
            const remainingCorporations = await Corporation.find({
               tenantId: corporation.tenantId
            }).sort({ createdAt: -1 });

            if (remainingCorporations.length > 0) {
               // Select the first remaining corporation
               await this.sessionService.switchCorporation(request.sessionId, remainingCorporations[0]._id.toString());
            } else {
               // No corporations left, clear selection
               await this.sessionService.clearSelectedCorporation(request.sessionId);
            }
         }

         return {
            success: true,
            message: `Corporation "${corporation.name}" deleted successfully`
         };
      } catch (error) {
         console.error('❌ Delete corporation failed:', error);
         if (error instanceof HttpException) {
            throw error;
         }
         throw new HttpException(
            `Failed to delete corporation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }
}
