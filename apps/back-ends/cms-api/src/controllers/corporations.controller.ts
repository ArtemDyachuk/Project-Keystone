import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import { Corporation, TenantMembership } from '@keystone/database';
import { SessionService } from '../services/session.service';
import { CorporationService } from '../services/corporation.service';
import { SessionGuard } from '../guards/session.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';

// DTOs for request validation
export class CreateCorporationDto {
   name!: string;
}

export class UpdateCorporationDto {
   name?: string;
}

@Controller('corporations')
export class CorporationsController {
   private readonly logger = new Logger(CorporationsController.name);

   constructor(
      private readonly sessionService: SessionService,
      private readonly corporationService: CorporationService
   ) { }

   /**
    * Get all corporations for the authenticated user
    * GET /corporations/user/me
    */
   @Get('user/me')
   @UseGuards(SessionGuard, RbacGuard)
   @RequirePermission('corporation:read')
   async getUserCorporations(@Req() request: Request & { user?: { uid: string }; sessionId?: string }) {
      if (!request.user?.uid) {
         throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      const result = await this.corporationService.getUserCorporations(request.user.uid);
      return result;
   }

   /**
    * Get corporation by ID
    * GET /corporations/:id
    */
   @Get(':id')
   @UseGuards(SessionGuard, RbacGuard)
   @RequirePermission('corporation:read')
   async getCorporationById(@Param('id') id: string, @Req() request: Request & { user?: { uid: string }; sessionId?: string }) {
      if (!request.user?.uid) {
         throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      const result = await this.corporationService.getCorporationById(id, request.user.uid);
      return result;
   }

   /**
    * Create new corporation
    * POST /corporations
    */
   @Post()
   @UseGuards(SessionGuard, RbacGuard)
   @RequirePermission('corporation:create')
   async createCorporation(@Body() createCorporationDto: CreateCorporationDto, @Req() request: Request & { user?: { uid: string }; sessionId?: string }) {
      if (!request.user?.uid) {
         throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      if (!createCorporationDto.name?.trim()) {
         throw new HttpException("Corporation name is required", HttpStatus.BAD_REQUEST);
      }

      // Get user's tenant automatically
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

      // Create corporation using service
      const result = await this.corporationService.createCorporation({
         name: createCorporationDto.name.trim(),
         tenantId: membership.tenantId,
         userId: request.user.uid
      });

      // Auto-select the newly created corporation
      if (request.sessionId && result.corporation) {
         await this.sessionService.switchCorporation(request.sessionId, result.corporation._id.toString());
      }

      return result;
   }

   /**
    * Update corporation
    * PUT /corporations/:id
    */
   @Put(':id')
   @UseGuards(SessionGuard, RbacGuard)
   @RequirePermission('corporation:update')
   async updateCorporation(
      @Param('id') id: string,
      @Body() updateCorporationDto: UpdateCorporationDto,
      @Req() request: Request & { user?: { uid: string }; sessionId?: string }
   ) {
      if (!request.user?.uid) {
         throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      const result = await this.corporationService.updateCorporation(id, updateCorporationDto, request.user.uid);
      return result;
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
         this.logger.error('Select corporation failed', error);
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
   @UseGuards(SessionGuard, RbacGuard)
   @RequirePermission('corporation:delete')
   async deleteCorporation(@Param('id') id: string, @Req() request: Request & { user?: { uid: string; selectedCorporationId?: string }; sessionId?: string }) {
      if (!request.user?.uid) {
         throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      // Get corporation info before deletion for session management
      const corporation = await Corporation.findById(id);
      if (!corporation) {
         throw new HttpException(`Corporation with ID "${id}" not found`, HttpStatus.NOT_FOUND);
      }

      // Check if this was the selected corporation
      const wasSelected = request.user.selectedCorporationId === id;

      // Delete corporation using service
      const result = await this.corporationService.deleteCorporation(id, request.user.uid);

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

      return result;
   }
}
