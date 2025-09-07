/**
 * 🧪 MFA Phase 0 Simple Testing
 * Tests for SessionService MFA methods and StepUpGuard without Firebase dependencies
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../../services/session.service';
import { RedisService } from '../../services/redis.service';
import { StepUpGuard } from '../../guards/step-up.guard';
import { UserSession } from '@keystone/auth';

describe('🔐 MFA Phase 0 - Simple Infrastructure Testing', () => {
  let sessionService: SessionService;
  let redisService: RedisService;
  let stepUpGuard: StepUpGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn().mockResolvedValue(true),
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(true),
            isConnected: jest.fn().mockReturnValue(true),
            getClient: jest.fn().mockReturnValue({
              sadd: jest.fn().mockResolvedValue(1),
              expire: jest.fn().mockResolvedValue(1),
            }),
          },
        },
        StepUpGuard,
      ],
    }).compile();

    sessionService = module.get<SessionService>(SessionService);
    redisService = module.get<RedisService>(RedisService);
    stepUpGuard = module.get<StepUpGuard>(StepUpGuard);
  });

  describe('📊 SessionService MFA Methods', () => {
    const mockUser: Omit<UserSession, 'createdAt' | 'expiresAt'> = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      tenantId: 'tenant-123',
      selectedCorporationId: 'corp-123',
      roles: ['user'],
      disabled: false,
      mfa: false,
      authTime: Math.floor(Date.now() / 1000),
      mfaEnrolledAt: undefined,
    };

    it('✅ should create session with default MFA values', async () => {
      const sessionId = await sessionService.createSession(mockUser);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(10);
    });

    it('✅ should update MFA status correctly', async () => {
      // Create a session first
      const sessionId = await sessionService.createSession(mockUser);
      
      // Mock the getSession method to return our mock session
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId,
        user: { ...mockUser, createdAt: new Date(), expiresAt: new Date() },
        isValid: true,
      });

      const result = await sessionService.updateMfaStatus(
        sessionId,
        true, // Enable MFA
        Math.floor(Date.now() / 1000), // Current auth time
        Math.floor(Date.now() / 1000) // Enrollment time
      );

      expect(result).toBe(true);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('✅ should check MFA validity correctly', async () => {
      const sessionId = 'test-session-123';
      const currentTime = Math.floor(Date.now() / 1000);
      const recentAuthTime = currentTime - 300; // 5 minutes ago

      // Mock session with recent MFA auth
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId,
        user: {
          ...mockUser,
          mfa: true,
          authTime: recentAuthTime,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
        isValid: true,
      });

      const isValid = await sessionService.isMfaValid(sessionId, 600); // 10 minutes max age
      expect(isValid).toBe(true);

      // Test with old auth time
      const oldAuthTime = currentTime - 1200; // 20 minutes ago
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId,
        user: {
          ...mockUser,
          mfa: true,
          authTime: oldAuthTime,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
        isValid: true,
      });

      const isOldValid = await sessionService.isMfaValid(sessionId, 600);
      expect(isOldValid).toBe(false);
    });

    it('✅ should rotate session with MFA fields', async () => {
      const oldSessionId = 'old-session-123';
      const currentTime = Math.floor(Date.now() / 1000);

      // Mock existing session
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId: oldSessionId,
        user: { ...mockUser, createdAt: new Date(), expiresAt: new Date() },
        isValid: true,
      });

      // Mock createSession to return new session ID
      jest.spyOn(sessionService, 'createSession').mockResolvedValue('new-session-456');
      jest.spyOn(sessionService, 'deleteSession').mockResolvedValue(true);

      const newSessionId = await sessionService.rotateSessionWithMfa(
        oldSessionId,
        true, // Enable MFA
        currentTime,
        currentTime // Enrollment time
      );

      expect(newSessionId).toBe('new-session-456');
      expect(sessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          mfa: true,
          authTime: currentTime,
          mfaEnrolledAt: currentTime,
        })
      );
      expect(sessionService.deleteSession).toHaveBeenCalledWith(oldSessionId);
    });
  });

  describe('🛡️ StepUpGuard Testing', () => {
    const mockRequest = {
      cookies: { session: 'test-session-123' },
    };

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as any;

    it('❌ should reject when no session cookie', async () => {
      const requestWithoutCookie = { cookies: {} };
      const context = {
        switchToHttp: () => ({
          getRequest: () => requestWithoutCookie,
        }),
      } as any;

      await expect(stepUpGuard.canActivate(context)).rejects.toThrow('Authentication required');
    });

    it('❌ should reject when session is invalid', async () => {
      jest.spyOn(sessionService, 'getSession').mockResolvedValue(null);

      await expect(stepUpGuard.canActivate(mockExecutionContext)).rejects.toThrow('Session expired');
    });

    it('❌ should reject when MFA is not enabled', async () => {
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId: 'test-session-123',
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          tenantId: 'tenant-123',
          selectedCorporationId: 'corp-123',
          roles: ['user'],
          disabled: false,
          mfa: false, // MFA not enabled
          authTime: Math.floor(Date.now() / 1000),
          mfaEnrolledAt: undefined,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
        isValid: true,
      });

      await expect(stepUpGuard.canActivate(mockExecutionContext)).rejects.toThrow('MFA not enabled');
    });

    it('❌ should reject when MFA verification is stale', async () => {
      const oldAuthTime = Math.floor(Date.now() / 1000) - 1200; // 20 minutes ago
      
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId: 'test-session-123',
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          tenantId: 'tenant-123',
          selectedCorporationId: 'corp-123',
          roles: ['user'],
          disabled: false,
          mfa: true,
          authTime: oldAuthTime,
          mfaEnrolledAt: oldAuthTime,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
        isValid: true,
      });

      jest.spyOn(sessionService, 'isMfaValid').mockResolvedValue(false);

      await expect(stepUpGuard.canActivate(mockExecutionContext)).rejects.toThrow('Fresh MFA verification required for this action');
    });

    it('✅ should allow when MFA is valid and fresh', async () => {
      const recentAuthTime = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
      
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId: 'test-session-123',
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          tenantId: 'tenant-123',
          selectedCorporationId: 'corp-123',
          roles: ['user'],
          disabled: false,
          mfa: true,
          authTime: recentAuthTime,
          mfaEnrolledAt: recentAuthTime,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
        isValid: true,
      });

      jest.spyOn(sessionService, 'isMfaValid').mockResolvedValue(true);

      const result = await stepUpGuard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });
  });

  describe('🔧 Integration Testing', () => {
    it('✅ should handle complete MFA flow simulation', async () => {
      const mockUser: Omit<UserSession, 'createdAt' | 'expiresAt'> = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
        tenantId: 'tenant-123',
        selectedCorporationId: 'corp-123',
        roles: ['user'],
        disabled: false,
        mfa: false,
        authTime: Math.floor(Date.now() / 1000),
        mfaEnrolledAt: undefined,
      };

      // 1. Create initial session without MFA
      const sessionId = await sessionService.createSession(mockUser);
      expect(sessionId).toBeDefined();

      // 2. Update session to enable MFA
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId,
        user: { ...mockUser, createdAt: new Date(), expiresAt: new Date() },
        isValid: true,
      });

      const updateResult = await sessionService.updateMfaStatus(
        sessionId,
        true,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000)
      );

      expect(updateResult).toBe(true);

      // 3. Verify MFA is valid
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        sessionId,
        user: {
          ...mockUser,
          mfa: true,
          authTime: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
          mfaEnrolledAt: Math.floor(Date.now() / 1000) - 300,
          createdAt: new Date(),
          expiresAt: new Date(),
        },
        isValid: true,
      });

      const isValid = await sessionService.isMfaValid(sessionId, 600);
      expect(isValid).toBe(true);
    });
  });
});
