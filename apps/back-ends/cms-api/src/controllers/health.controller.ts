import { Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { sessionStore } from '../lib/session/session.store';
import { SkipCsrf } from '../guards/csrf.guard';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    redis: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
  };
}

@Controller('health')
export class HealthController {
  /**
   * Redis health check endpoint
   * GET /health/redis
   */
  @Get('redis')
  @SkipCsrf()
  async checkRedisHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    let redisStatus: 'up' | 'down' = 'down';
    let responseTime: number | undefined;
    let error: string | undefined;

    try {
      const isHealthy = await sessionStore.isHealthy();
      responseTime = Date.now() - startTime;

      if (isHealthy) {
        redisStatus = 'up';
      } else {
        error = 'Redis ping failed';
      }
    } catch (err) {
      responseTime = Date.now() - startTime;
      error = err instanceof Error ? err.message : 'Unknown Redis error';
    }

    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
      redisStatus === 'up' ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          status: redisStatus,
          responseTime,
          error,
        },
      },
    };
  }

  /**
   * Overall health check
   * GET /health
   */
  @Get()
  @SkipCsrf()
  async checkHealth(): Promise<HealthStatus> {
    // For now, just delegate to Redis health
    return this.checkRedisHealth();
  }

  /**
   * Test Redis session creation (for debugging)
   * POST /health/test-session
   */
  @Post('test-session')
  @SkipCsrf()
  async testSession(@Res({ passthrough: true }) res: Response): Promise<any> {
    try {
      const { createUserSession } = await import('../lib/session/session.helper');

      // Create a test session
      const { sid, defaultTenantId } = await createUserSession(
        'test-user-123',
        res,
        { deviceId: 'test-device' }
      );

      return {
        success: true,
        sessionId: sid,
        defaultTenantId,
        message: 'Test Redis session created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
