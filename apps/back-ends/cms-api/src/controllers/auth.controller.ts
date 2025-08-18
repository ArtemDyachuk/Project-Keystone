import { Controller, Get, Res, Req, UseGuards, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { CsrfService } from '../lib/security/csrf.service';
import { SkipCsrf } from '../guards/csrf.guard';
import { SessionGuard } from '../guards/session.guard';
import { TenantService } from '@keystone/database';

@Controller('auth')
export class AuthController {
  constructor(private readonly csrfService: CsrfService) { }

  /**
   * Get session-bound CSRF token for client-side use
   * GET /auth/csrf
   */
  @Get('csrf')
  @SkipCsrf() // This endpoint doesn't need CSRF protection
  @UseGuards(SessionGuard) // But it needs a session to bind the token
  getCsrfToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): { csrfToken: string } {
    const sessionId = (req as any).sessionId;
    if (!sessionId) {
      throw new Error('Session required for CSRF token generation');
    }

    const token = this.csrfService.setTokenCookie(res, sessionId);
    return { csrfToken: token };
  }

  /**
   * Resolve tenant by subdomain/domain for GIP tenant discovery
   * GET /auth/tenant-resolve?domain=<subdomain>
   */
  @Get('tenant-resolve')
  @SkipCsrf()
  async resolveTenant(@Query('domain') domain: string): Promise<{ gipTenantId?: string; appTenantId?: string; error?: string }> {
    if (!domain) {
      return { error: 'Domain parameter required' };
    }

    try {
      // For now, look up tenant by name (assuming subdomain matches tenant name)
      // In production, you'd have a proper domain mapping table
      const tenant = await TenantService.getTenantByName(domain);

      if (!tenant) {
        return { error: 'Tenant not found for domain' };
      }

      return {
        gipTenantId: (tenant as any).firebaseTenantId || undefined,
        appTenantId: tenant._id!,
      };
    } catch (error) {
      console.error('Tenant resolve error:', error);
      return { error: 'Failed to resolve tenant' };
    }
  }
}
