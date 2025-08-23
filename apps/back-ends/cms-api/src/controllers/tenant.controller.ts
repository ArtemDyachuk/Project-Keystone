import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Headers, UnauthorizedException, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { TenantService as DatabaseTenantService } from '@keystone/database';
import { SessionGuard } from '../guards/session.guard';
import { TenantService, CreateTenantRequest } from '../services/tenant.service';
import { SessionService } from '../services/session.service';

// DTOs for request validation
export class CreateTenantDto {
  name!: string;
}

export class UpdateTenantDto {
  name?: string;
}

@Controller('tenants')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly sessionService: SessionService
  ) { }

  /**
   * Get all tenants (filtered by user)
   * GET /tenants
   */
  @Get()
  async getAllTenants(@Headers('authorization') authHeader: string): Promise<any[]> {
    try {
      if (!authHeader) {
        throw new UnauthorizedException("Authorization header required");
      }

      // TODO: Implement Firebase session-based tenant filtering
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      throw new HttpException(
        `Failed to fetch tenants: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get tenant by ID
   * GET /tenants/:id
   */
  @Get(':id')
  @UseGuards(SessionGuard)
  async getTenantById(@Param('id') id: string, @Req() request: Request & { user?: any; sessionId?: string }): Promise<any> {
    try {
      if (!request.user?.uid) {
        throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      // Check if user has access to this tenant via TenantMembership
      const { TenantMembership } = await import('@keystone/database');
      const membership = await TenantMembership.findOne({
        userId: request.user.uid,
        tenantId: id,
        isActive: true
      });

      if (!membership) {
        throw new HttpException(
          "Access denied to this tenant",
          HttpStatus.FORBIDDEN
        );
      }

      const tenant = await DatabaseTenantService.getTenantById(id);

      if (!tenant) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        tenant: tenant
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Create new tenant and associate with user
   * POST /tenants
   */
  @Post()
  @UseGuards(SessionGuard)
  async createTenant(@Body() createTenantDto: CreateTenantDto, @Req() request: Request & { user?: any; sessionId?: string }): Promise<any> {
    try {
      if (!request.user?.uid) {
        throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      if (!createTenantDto.name?.trim()) {
        throw new HttpException("Tenant name is required", HttpStatus.BAD_REQUEST);
      }

      const createRequest: CreateTenantRequest = {
        name: createTenantDto.name.trim(),
        userId: request.user.uid,
        userEmail: request.user.email
      };

      const result = await this.tenantService.createTenant(createRequest);

      // Update user's session to select the newly created corporation
      if (request.sessionId && result.corporationId) {
        await this.sessionService.switchCorporation(request.sessionId, result.corporationId);
      }

      return {
        success: true,
        tenantId: result.tenantId,
        corporationId: result.corporationId,
        message: result.message
      };
    } catch (error) {
      console.error('❌ Tenant creation failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Check if user needs to create a tenant
   * GET /tenants/check-requirement
   */
  @UseGuards(SessionGuard)
  @Get('check-requirement')
  async checkTenantRequirement(@Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      if (!request.user?.uid) {
        throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      const result = await this.tenantService.checkTenantRequirement(request.user.uid);

      return {
        success: true,
        needsTenant: result.needsTenant,
        existingTenantId: result.existingTenantId
      };
    } catch (error) {
      console.error("❌ Check tenant requirement failed:", error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Failed to check tenant requirement",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's active tenant information
   * GET /tenants/active
   */
  @UseGuards(SessionGuard)
  @Get('active')
  async getActiveTenant(@Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      if (!request.user?.uid) {
        throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      const activeTenant = await this.tenantService.getUserActiveTenant(request.user.uid);

      if (!activeTenant) {
        return {
          success: true,
          hasActiveTenant: false,
          message: "No active tenant found"
        };
      }

      return {
        success: true,
        hasActiveTenant: true,
        tenant: activeTenant
      };
    } catch (error) {
      console.error("❌ Get active tenant failed:", error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Failed to get active tenant",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's corporations (for navigation)
   * GET /tenants/user/me
   */
  @UseGuards(SessionGuard)
  @Get('user/me')
  async getUserCorporations(@Req() request: Request & { user?: any; sessionId?: string }): Promise<{
    corporations: any[];
    selectedCorporationId: string | null;
  }> {
    try {
      if (!request.user?.uid) {
        throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      // Get user's tenant memberships
      const { TenantMembership } = await import('@keystone/database');

      const memberships = await TenantMembership.find({
        userId: request.user.uid,
        isActive: true
      }).populate('tenantId');

      if (!memberships || memberships.length === 0) {
        return {
          corporations: [],
          selectedCorporationId: null
        };
      }

      // Get corporations for each tenant
      const { Corporation } = await import('@keystone/database');
      const tenantIds = memberships.map(m => m.tenantId.toString());
      const corporations = await Corporation.find({
        tenantId: { $in: tenantIds }
      }).sort({ createdAt: -1 });

      // Get selected corporation from user's session or first corporation
      const selectedCorporationId = request.user.selectedCorporationId || (corporations.length > 0 ? corporations[0]._id.toString() : null);

      return {
        corporations: corporations,
        selectedCorporationId: selectedCorporationId
      };
    } catch (error) {
      console.error('❌ Get user corporations failed:', error);
      throw new HttpException(
        `Failed to fetch user corporations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's actual tenants (for tenant management page)
   * GET /tenants/management/list
   */
  @UseGuards(SessionGuard)
  @Get('management/list')
  async getUserTenants(@Req() request: Request & { user?: any; sessionId?: string }): Promise<{
    tenants: any[];
  }> {
    try {
      if (!request.user?.uid) {
        throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      // Get user's tenant memberships
      const { TenantMembership } = await import('@keystone/database');

      const memberships = await TenantMembership.find({
        userId: request.user.uid,
        isActive: true
      }).populate('tenantId');

      if (!memberships || memberships.length === 0) {
        return {
          tenants: []
        };
      }

      // Get full tenant details for each membership
      const { Tenant } = await import('@keystone/database');
      const tenantIds = memberships.map(m => m.tenantId.toString());
      const tenants = await Tenant.find({
        _id: { $in: tenantIds }
      }).sort({ createdAt: -1 });

      return {
        tenants: tenants
      };
    } catch (error) {
      console.error('❌ Get user tenants failed:', error);
      throw new HttpException(
        `Failed to fetch user tenants: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update tenant
   * PUT /tenants/:id
   */
  @Put(':id')
  @UseGuards(SessionGuard)
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Req() request: Request & { user?: any; sessionId?: string }
  ): Promise<{ success: boolean; tenant: any }> {
    try {
      if (!request.user?.uid) {
        throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      // Check if user has access to this tenant via TenantMembership
      const { TenantMembership } = await import('@keystone/database');
      const membership = await TenantMembership.findOne({
        userId: request.user.uid,
        tenantId: id,
        isActive: true
      });

      if (!membership) {
        throw new HttpException(
          "Access denied to this tenant",
          HttpStatus.FORBIDDEN
        );
      }

      // Check if user is the tenant owner (has owner role)
      if (!membership.roles.includes('owner')) {
        throw new HttpException(
          "Only tenant owners can update tenants",
          HttpStatus.FORBIDDEN
        );
      }

      const updatedTenant = await DatabaseTenantService.updateTenant(id, updateTenantDto);

      if (!updatedTenant) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        tenant: updatedTenant
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Delete tenant
   * DELETE /tenants/:id
   */
  @Delete(':id')
  @UseGuards(SessionGuard)
  async deleteTenant(@Param('id') id: string, @Req() request: Request & { user?: any; sessionId?: string }): Promise<{ success: boolean; message: string }> {
    try {
      if (!request.user?.uid) {
        throw new HttpException("Authentication required", HttpStatus.UNAUTHORIZED);
      }

      // Check if user has access to this tenant via TenantMembership
      const { TenantMembership } = await import('@keystone/database');
      const membership = await TenantMembership.findOne({
        userId: request.user.uid,
        tenantId: id,
        isActive: true
      });

      if (!membership) {
        throw new HttpException(
          "Access denied to this tenant",
          HttpStatus.FORBIDDEN
        );
      }

      // Check if user is the tenant owner (has owner role)
      if (!membership.roles.includes('owner')) {
        throw new HttpException(
          "Only tenant owners can delete tenants",
          HttpStatus.FORBIDDEN
        );
      }

      // Get the tenant to find its GIP tenant ID
      const tenant = await DatabaseTenantService.getTenantById(id);
      if (!tenant) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      // Delete tenant from both GIP and local database using TenantService
      const result = await this.tenantService.deleteTenant(id, tenant.gipTenantId);

      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Check if tenant name exists
   * GET /tenants/check/:name
   */
  @Get('check/:name')
  async checkTenantExists(@Param('name') name: string): Promise<{ exists: boolean; name: string }> {
    try {
      const exists = await DatabaseTenantService.tenantExists(name);
      return { exists, name };
    } catch (error) {
      throw new HttpException(
        `Failed to check tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update user's selected tenant
   * PUT /tenants/user/selected
   */
  @Put("user/selected")
  async updateUserSelectedTenant(@Body() _body: { tenantId: string }) {
    try {
      // TODO: Implement Firebase session-based tenant selection
      return { message: "Selected tenant updated successfully" };
    } catch (error) {
      console.error("Error updating selected tenant:", error);
      throw error;
    }
  }

  /**
   * Refresh user tokens
   * POST /tenants/user/refresh-tokens
   */
  @Post("user/refresh-tokens")
  async refreshUserTokens(@Body() _body: { refreshToken: string }) {
    try {
      // TODO: Implement Firebase token refresh
      return { message: "Token refresh not implemented yet" };
    } catch (error) {
      console.error("Error refreshing tokens:", error);
      throw error;
    }
  }

  /**
   * Get user attributes
   * GET /tenants/user/attributes
   */
  @Get("user/attributes")
  async getUserAttributes() {
    try {
      // TODO: Implement Firebase session-based user attributes
      return {
        success: true,
        attributes: {
          tenantIds: [],
          selectedTenantId: null
        }
      };
    } catch (error) {
      console.error("❌ Error fetching user attributes:", error);
      throw new HttpException(
        `Failed to fetch user attributes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
