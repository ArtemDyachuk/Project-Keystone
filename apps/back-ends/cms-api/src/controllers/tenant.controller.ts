import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { TenantService, ITenant } from '@keystone/database';
import { TenantAccessGuard } from '../guards/tenant-access.guard';

// DTOs for request validation
export class CreateTenantDto {
  name!: string;
}

export class UpdateTenantDto {
  name?: string;
}

@Controller('tenants')
export class TenantController {
  constructor() { }

  /**
   * Get all tenants (filtered by user)
   * GET /tenants
   */
  @Get()
  async getAllTenants(@Headers('authorization') authHeader: string): Promise<ITenant[]> {
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
  @UseGuards(TenantAccessGuard)
  async getTenantById(@Param('id') id: string): Promise<ITenant> {
    try {
      const tenant = await TenantService.getTenantById(id);

      if (!tenant) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return tenant;
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
  async createTenant(@Body() createTenantDto: CreateTenantDto, @Headers('authorization') authHeader: string): Promise<any> {
    try {
      if (!authHeader) {
        throw new UnauthorizedException("Authorization header required");
      }

      // TODO: Implement Firebase session-based user association
      const tenant = await TenantService.createTenant(createTenantDto.name);

      return { ...tenant, message: "Tenant created successfully" };
    } catch (error) {
      console.error('❌ Tenant creation failed:', error);
      throw new HttpException(
        `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get user's tenants
   * GET /tenants/user/me
   */
  @Get('user/me')
  async getUserTenants(): Promise<{
    tenants: ITenant[];
    selectedTenantId: string | null;
  }> {
    try {
      // TODO: Implement Firebase session-based tenant retrieval
      // For now, return empty arrays as placeholder
      return {
        tenants: [],
        selectedTenantId: null
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch user tenants: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Update tenant
   * PUT /tenants/:id
   */
  @Put(':id')
  @UseGuards(TenantAccessGuard)
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto
  ): Promise<ITenant> {
    try {
      const updatedTenant = await TenantService.updateTenant(id, updateTenantDto);

      if (!updatedTenant) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return updatedTenant;
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
  @UseGuards(TenantAccessGuard)
  async deleteTenant(@Param('id') id: string): Promise<{ message: string }> {
    try {
      const deleted = await TenantService.deleteTenant(id);

      if (!deleted) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return { message: `Tenant with ID "${id}" deleted successfully` };
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
      const exists = await TenantService.tenantExists(name);
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
