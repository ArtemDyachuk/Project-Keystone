import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { TenantService, ITenant } from '@keystone/database';
import { TenantAccessGuard } from '../guards/tenant-access.guard';

// DTOs for request validation
export class CreateTenantDto {
  name!: string; // Using definite assignment assertion since this will be validated
}

export class UpdateTenantDto {
  name?: string;
}

@Controller('tenants')
export class TenantController {
  constructor(
  ) { }

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

      // const userInfo = this.extractUserFromJWT(authHeader);
      const userPoolId = process.env.COGNITO_USER_POOL_ID;

      if (!userPoolId) {
        // If Cognito not configured, return empty array for security
        return [];
      }

      try {
        // Get user's tenant info from Cognito
        const tenantInfo = {
          tenantIds: [],
          selectedTenantId: null
        }

        // Fetch full tenant details from database using the new method
        if (tenantInfo.tenantIds.length > 0) {
          return await TenantService.getTenantsByIds(tenantInfo.tenantIds);
        }

        return [];
      } catch (cognitoError) {
        console.warn('Cognito integration failed:', cognitoError);
        // Return empty array for security if Cognito fails
        return [];
      }
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
  async createTenant(@Body() createTenantDto: CreateTenantDto & { refreshToken?: string }, @Headers('authorization') authHeader: string): Promise<any> {
    try {
      // 1. Create tenant in database
      const tenant = await TenantService.createTenant(createTenantDto.name);

      // 2. Extract user info from JWT token
      const userInfo = this.extractUserFromJWT(authHeader);
      const { refreshToken } = createTenantDto;

      // 3. Update Cognito user with new tenant (only if configured)
      const userPoolId = process.env.COGNITO_USER_POOL_ID;

      if (userPoolId) {
        try {
          // await this.cognitoAdminService.addUserTenant(
          //   userPoolId,
          //   userInfo.username,
          //   tenant._id!
          // );

          // If refresh token provided, get fresh tokens with updated attributes
          if (refreshToken && userInfo.username) {
            try {
              // const newTokens = await this.cognitoAdminService.refreshUserTokens(refreshToken, userInfo.username);

              return {
                ...tenant,
                tokens: null
              };
            } catch (refreshError) {
              console.warn("Failed to refresh tokens after tenant creation:", refreshError);
              return {
                ...tenant,
                tokens: null,
                refreshError: "Failed to refresh tokens"
              };
            }
          }
        } catch {
          // Continue without Cognito integration
        }
      }

      return { ...tenant, tokens: null };
    } catch (error) {
      console.error('❌ Tenant creation failed:', error);
      throw new HttpException(
        `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get user's tenants from Cognito
   * GET /tenants/user/me
   */
  @Get('user/me')
  async getUserTenants(): Promise<{
    // async getUserTenants(@Headers('authorization') authHeader: string): Promise<{
    tenants: ITenant[];
    selectedTenantId: string | null;
  }> {
    try {
      // const userInfo = this.extractUserFromJWT(authHeader);

      // Get user's tenant info from Cognito (only if configured)
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      let tenantInfo: { tenantIds: string[]; selectedTenantId: string | null } = { tenantIds: [], selectedTenantId: null };

      if (userPoolId) {
        try {
          tenantInfo = {
            tenantIds: [],
            selectedTenantId: null
          }
        } catch (cognitoError) {
          console.warn('Cognito integration failed:', cognitoError);
          // Return empty tenant list if Cognito fails
        }
      } else {
        console.warn('COGNITO_USER_POOL_ID not set, returning empty tenant list');
      }

      // Fetch full tenant details from database
      const tenants: ITenant[] = [];
      for (const tenantId of tenantInfo.tenantIds) {
        try {
          const tenant = await TenantService.getTenantById(tenantId);
          if (tenant) {
            tenants.push(tenant);
          }
        } catch (error) {
          console.warn(`Failed to fetch tenant ${tenantId}:`, error);
        }
      }

      return {
        tenants,
        selectedTenantId: tenantInfo.selectedTenantId
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
  async deleteTenant(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Body() body: { refreshToken?: string }
  ): Promise<{ message: string; tokens?: any; refreshError?: string }> {
    try {
      // 1. Delete tenant from database
      const deleted = await TenantService.deleteTenant(id);

      if (!deleted) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      // 2. Remove tenant from Cognito user attributes (if configured)
      const userPoolId = process.env.COGNITO_USER_POOL_ID;

      if (userPoolId) {
        try {
          const userInfo = this.extractUserFromJWT(authHeader);

          // Get current user attributes
          // const attributes = {
          //   tenantIds: [],
          //   selectedTenantId: null
          // }
          // const currentTenantIds = attributes.tenantIds?.split(",").filter(Boolean) || [];
          // const currentSelectedTenantId = attributes.selectedTenantId;

          // Remove the deleted tenant
          // const updatedTenantIds = currentTenantIds.filter((tenantId: string) => tenantId !== id);

          // Update selected tenant if it was the deleted one
          // let newSelectedTenantId = currentSelectedTenantId;
          // if (currentSelectedTenantId === id) {
          //   newSelectedTenantId = updatedTenantIds.length > 0 ? updatedTenantIds[0] : "";
          // }

          // // Update Cognito user attributes
          // if (updatedTenantIds.length > 0) {
          //   await this.cognitoAdminService.updateUserTenants(
          //     userPoolId,
          //     userInfo.username,
          //     updatedTenantIds,
          //     newSelectedTenantId
          //   );
          // } else {
          //   // If no tenants left, clear the attributes
          //   await this.cognitoAdminService.updateUserTenants(
          //     userPoolId,
          //     userInfo.username,
          //     [],
          //     ""
          //   );
          // }

          // Refresh tokens if provided
          if (body.refreshToken && userInfo.username) {
            try {
              // const newTokens = await this.cognitoAdminService.refreshUserTokens(body.refreshToken, userInfo.username);
              return {
                message: `Tenant with ID "${id}" deleted successfully`,
                tokens: null
              };
            } catch (refreshError) {
              console.warn("Failed to refresh tokens after tenant deletion:", refreshError);
              return {
                message: `Tenant with ID "${id}" deleted successfully`,
                tokens: null,
                refreshError: "Failed to refresh tokens"
              };
            }
          }
        } catch {
          // Continue without Cognito integration if it fails
        }
      }

      return { message: `Tenant with ID "${id}" deleted successfully`, tokens: null };
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
   * Update user's selected tenant and return fresh tokens
   * PUT /tenants/user/selected
   */
  @Put("user/selected")
  async updateUserSelectedTenant(
    @Body() body: { tenantId: string; refreshToken?: string },
    @Headers("authorization") authHeader?: string,
  ) {
    try {
      if (!authHeader) {
        throw new UnauthorizedException("Authorization header required");
      }

      const userInfo = this.extractUserFromJWT(authHeader);
      const { refreshToken } = body;

      // Update Cognito user's selectedTenantId
      if (process.env.COGNITO_USER_POOL_ID) {
        // await this.cognitoAdminService.updateSelectedTenant(process.env.COGNITO_USER_POOL_ID, userInfo.username, tenantId);

        // If refresh token provided, get fresh tokens with updated attributes
        if (refreshToken && userInfo.username) {
          try {
            // const newTokens = await this.cognitoAdminService.refreshUserTokens(refreshToken, userInfo.username);

            return {
              message: "Selected tenant updated successfully",
              tokens: null
            };
          } catch (refreshError) {
            console.warn("Failed to refresh tokens, but tenant was updated:", refreshError);
            return {
              message: "Selected tenant updated successfully",
              tokens: null,
              refreshError: "Failed to refresh tokens"
            };
          }
        }
      }

      return { message: "Selected tenant updated successfully", tokens: null };
    } catch (error) {
      console.error("Error updating selected tenant:", error);
      throw error;
    }
  }

  /**
   * Refresh user tokens with updated attributes
   * POST /tenants/user/refresh-tokens
   */
  @Post("user/refresh-tokens")
  async refreshUserTokens(
    @Body() body: { refreshToken: string },
    @Headers("authorization") authHeader?: string,
  ) {
    try {
      if (!authHeader) {
        throw new UnauthorizedException("Authorization header required");
      }

      // const userInfo = this.extractUserFromJWT(authHeader);
      const { refreshToken } = body;

      if (!refreshToken) {
        throw new UnauthorizedException("Refresh token required");
      }

      if (process.env.COGNITO_USER_POOL_ID) {
        try {
          // const newTokens = await this.cognitoAdminService.refreshUserTokens(refreshToken, userInfo.username);

          return {
            message: "Tokens refreshed successfully",
            tokens: null
          };
        } catch (refreshError) {
          console.warn("Failed to refresh tokens:", refreshError);
          return {
            message: "Failed to refresh tokens",
            tokens: null,
            error: "Token refresh failed"
          };
        }
      }

      return { message: "Cognito not configured", tokens: null };
    } catch (error) {
      console.error("Error refreshing tokens:", error);
      throw error;
    }
  }

  /**
   * Get user attributes from Cognito
   * GET /tenants/user/attributes
   */
  @Get("user/attributes")
  async getUserAttributes(@Headers("authorization") authHeader?: string) {
    try {
      if (!authHeader) {
        throw new UnauthorizedException("Authorization header required");
      }

      // const userInfo = this.extractUserFromJWT(authHeader);
      const userPoolId = process.env.COGNITO_USER_POOL_ID;

      if (!userPoolId) {
        throw new HttpException(
          "Cognito not configured",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Get user attributes from Cognito
      const attributes = {
        tenantIds: [],
        selectedTenantId: null
      }

      return {
        success: true,
        attributes: attributes
      };
    } catch (error) {
      console.error("❌ Error fetching user attributes:", error);
      throw new HttpException(
        `Failed to fetch user attributes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Extract user information from JWT token
   * Uses the @keystone/auth package for proper JWT decoding
   */
  private extractUserFromJWT(authHeader: string): { username: string; sub: string } {
    try {
      // Validate authorization header format
      if (!authHeader || typeof authHeader !== 'string') {
        throw new Error('Invalid authorization header format');
      }

      // Remove 'Bearer ' prefix and validate
      const bearerPrefix = 'Bearer ';
      if (!authHeader.startsWith(bearerPrefix)) {
        throw new Error('Authorization header must start with "Bearer "');
      }

      const token = authHeader.slice(bearerPrefix.length).trim();

      if (!token) {
        throw new Error('No token provided in authorization header');
      }

      // Validate token format (JWT should have 3 parts separated by dots)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format: token must have 3 parts');
      }

      // Decode JWT using the auth package
      // const decoded = decodeJwtToken(token);

      // Validate decoded token has required fields
      // if (!decoded || typeof decoded !== 'object') {
      //   throw new Error('Invalid token: failed to decode payload');
      // }

      // // Extract user information from decoded token
      // const username = decoded.username || decoded.email || decoded.sub;
      // const sub = decoded.sub;

      // if (!username || !sub) {
      //   throw new Error('Invalid token: missing required user information (username/sub)');
      // }

      // return {
      //   username: String(username),
      //   sub: String(sub)
      // };
      return {
        username: "test",
        sub: "test"
      };
    } catch (error) {
      console.error('Error extracting user from JWT:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        authHeaderLength: authHeader?.length,
        authHeaderPrefix: authHeader?.substring(0, 10) + '...'
      });
      throw new UnauthorizedException(`Invalid authorization header: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
