import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TenantService, ITenant } from '@keystone/database';

// DTOs for request validation
export class CreateTenantDto {
  name!: string; // Using definite assignment assertion since this will be validated
}

export class UpdateTenantDto {
  name?: string;
}

@Controller('tenants')
export class TenantController {
  
  /**
   * Debug endpoint to check TenantService import
   * GET /tenants/debug
   */
  @Get('debug')
  async debugTenantService(): Promise<any> {
    return {
      tenantServiceType: typeof TenantService,
      methods: Object.getOwnPropertyNames(TenantService),
      message: 'TenantService imported successfully'
    };
  }

  /**
   * Test endpoint - just return static data
   * GET /tenants/test
   */
  @Get('test')
  async testEndpoint(): Promise<any> {
    return {
      message: 'Tenant controller is working!',
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Get all tenants
   * GET /tenants
   */
  @Get()
  async getAllTenants(): Promise<ITenant[]> {
    try {
      return await TenantService.getAllTenants();
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
   * Create new tenant
   * POST /tenants
   */
  @Post()
  async createTenant(@Body() createTenantDto: CreateTenantDto): Promise<ITenant> {
    try {
      return await TenantService.createTenant(createTenantDto.name);
    } catch (error) {
      throw new HttpException(
        `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Update tenant
   * PUT /tenants/:id
   */
  @Put(':id')
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
}
