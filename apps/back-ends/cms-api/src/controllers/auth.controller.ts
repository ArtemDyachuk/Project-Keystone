import { Controller, Post, Body, Res, HttpStatus, Get, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('organizations')
  async getOrganizations(@Res() res: Response) {
    try {
      const organizations = await this.authService.getOrganizations();
      res.status(HttpStatus.OK).json({
        success: true,
        organizations
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : 'Failed to get organizations'
      });
    }
  }

  @Post('organizations/create')
  async createOrganization(@Body() body: { name: string }, @Res() res: Response) {
    try {
      const organization = await this.authService.createOrganization(body.name);
      res.status(HttpStatus.CREATED).json({
        success: true,
        organization
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : 'Failed to create organization'
      });
    }
  }

  @Post('signup')
  async signUp(
    @Body() body: { email: string; password: string; name?: string },
    @Res() res: Response
  ) {
    try {
      const result = await this.authService.signUp(body.email, body.password, body.name);
      
      if (result.session_token) {
        res.cookie('stytch_session', result.session_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
          path: '/',
        });
      }

      res.status(HttpStatus.CREATED).json({
        success: true,
        user_id: result.user.user_id,
        message: 'User created successfully'
      });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: error instanceof Error ? error.message : 'Signup failed'
      });
    }
  }

  @Post('signin')
  async signIn(
    @Body() body: { email: string; password: string },
    @Res() res: Response
  ) {
    try {
      const result = await this.authService.signIn(body.email, body.password);
      
      if (result.session_token) {
        res.cookie('stytch_session', result.session_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
          path: '/',
        });
      }

      res.status(HttpStatus.OK).json({
        success: true,
        user_id: result.user.user_id,
        user: result.user,
        message: 'Authentication successful'
      });
    } catch (error) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        error: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  }

  @Post('signout')
  async signOut(
    @Headers('cookie') cookies: string,
    @Res() res: Response
  ) {
    const sessionToken = this.extractSessionToken(cookies);
    
    if (sessionToken) {
      await this.authService.signOut(sessionToken);
    }

    res.clearCookie('stytch_session', { path: '/' });
    
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  @Get('me')
  async getMe(
    @Headers('cookie') cookies: string,
    @Res() res: Response
  ): Promise<void> {
    const sessionToken = this.extractSessionToken(cookies);
    
    if (!sessionToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        error: 'No session token found'
      });
      return;
    }

    try {
      const session = await this.authService.validateSession(sessionToken);
      
      if (!session) {
        res.clearCookie('stytch_session', { path: '/' });
        res.status(HttpStatus.UNAUTHORIZED).json({
          error: 'Session validation failed'
        });
        return;
      }

      res.status(HttpStatus.OK).json({
        success: true,
        user: session.user,
        session_token: session.session_token
      });
    } catch {
      res.status(HttpStatus.UNAUTHORIZED).json({
        error: 'Session validation failed'
      });
    }
  }

  private extractSessionToken(cookies: string): string | null {
    if (!cookies) return null;
    
    const sessionCookie = cookies
      .split(';')
      .find(cookie => cookie.trim().startsWith('stytch_session='));
    
    return sessionCookie ? sessionCookie.split('=')[1] : null;
  }
}
