import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';

// Simple in-memory store for testing (we'll connect to database later)
let tenants: Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }> = [];
let idCounter = 1;

export class CreateTenantDto {
  name!: string; // Using definite assignment assertion since this will be validated
}

export class UpdateTenantDto {
  name?: string;
}

@Controller('tenants')
export class TenantSimpleController {
  
  /**
   * Get all tenants
   * GET /tenants
   */
  @Get()
  async getAllTenants() {
    return {
      success: true,
      data: tenants,
      count: tenants.length
    };
  }

  /**
   * Get tenant by ID
   * GET /tenants/:id
   */
  @Get(':id')
  async getTenantById(@Param('id') id: string) {
    const tenant = tenants.find(t => t.id === id);
    
    if (!tenant) {
      throw new HttpException(
        `Tenant with ID "${id}" not found`,
        HttpStatus.NOT_FOUND
      );
    }
    
    return {
      success: true,
      data: tenant
    };
  }

  /**
   * Create new tenant
   * POST /tenants
   */
  @Post()
  async createTenant(@Body() createTenantDto: CreateTenantDto) {
    if (!createTenantDto.name || createTenantDto.name.trim().length === 0) {
      throw new HttpException(
        'Tenant name is required',
        HttpStatus.BAD_REQUEST
      );
    }

    const trimmedName = createTenantDto.name.trim();
    
    // Check if tenant already exists
    const exists = tenants.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      throw new HttpException(
        `Tenant with name "${trimmedName}" already exists`,
        HttpStatus.CONFLICT
      );
    }

    const newTenant = {
      id: String(idCounter++),
      name: trimmedName,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    tenants.push(newTenant);

    return {
      success: true,
      data: newTenant,
      message: 'Tenant created successfully'
    };
  }

  /**
   * Update tenant
   * PUT /tenants/:id
   */
  @Put(':id')
  async updateTenant(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    const tenantIndex = tenants.findIndex(t => t.id === id);
    
    if (tenantIndex === -1) {
      throw new HttpException(
        `Tenant with ID "${id}" not found`,
        HttpStatus.NOT_FOUND
      );
    }

    if (updateTenantDto.name) {
      const trimmedName = updateTenantDto.name.trim();
      if (trimmedName.length === 0) {
        throw new HttpException(
          'Tenant name cannot be empty',
          HttpStatus.BAD_REQUEST
        );
      }

      // Check if name already exists (exclude current tenant)
      const exists = tenants.find(t => t.id !== id && t.name.toLowerCase() === trimmedName.toLowerCase());
      if (exists) {
        throw new HttpException(
          `Tenant with name "${trimmedName}" already exists`,
          HttpStatus.CONFLICT
        );
      }

      tenants[tenantIndex].name = trimmedName;
      tenants[tenantIndex].updatedAt = new Date();
    }

    return {
      success: true,
      data: tenants[tenantIndex],
      message: 'Tenant updated successfully'
    };
  }

  /**
   * Delete tenant
   * DELETE /tenants/:id
   */
  @Delete(':id')
  async deleteTenant(@Param('id') id: string) {
    const tenantIndex = tenants.findIndex(t => t.id === id);
    
    if (tenantIndex === -1) {
      throw new HttpException(
        `Tenant with ID "${id}" not found`,
        HttpStatus.NOT_FOUND
      );
    }

    const deletedTenant = tenants.splice(tenantIndex, 1)[0];

    return {
      success: true,
      data: deletedTenant,
      message: 'Tenant deleted successfully'
    };
  }

  /**
   * Clear all tenants (for testing)
   * DELETE /tenants
   */
  @Delete()
  async clearAllTenants() {
    const count = tenants.length;
    tenants = [];
    idCounter = 1;

    return {
      success: true,
      message: `Cleared ${count} tenants`,
      count
    };
  }
}
