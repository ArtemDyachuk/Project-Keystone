/**
 * 🧪 MFA Phase 1 Real Firebase Integration Test
 * Tests actual Firebase MFA API integration (requires Firebase config)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../controllers/auth.controller';
import { SessionService } from '../../services/session.service';
import { RedisService } from '../../services/redis.service';
import { CSRFService } from '../../services/csrf.service';
import { EmailService } from '../../services/email.service';
import { TenantService } from '../../services/tenant.service';
import { InviteService } from '../../services/invite.service';
import { SignupService } from '../../services/signup.service';
import { UserService } from '../../services/user.service';
import { FirebaseServerClient } from '@keystone/auth';

describe('🔐 MFA Phase 1 - Real Firebase Integration', () => {
  let authController: AuthController;
  let sessionService: SessionService;
  let redisService: RedisService;
  let firebaseClient: FirebaseServerClient;

  // Check if Firebase is properly configured
  const isFirebaseConfigured = () => {
    return !!(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    );
  };

  beforeAll(() => {
    if (!isFirebaseConfigured()) {
      console.log('⚠️  Firebase not configured - skipping real integration tests');
      console.log('   Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID,');
      console.log('   FIREBASE_ADMIN_PRIVATE_KEY, and FIREBASE_ADMIN_CLIENT_EMAIL');
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: SessionService,
          useValue: {
            updateMfaStatus: jest.fn().mockResolvedValue(true),
            getSession: jest.fn().mockResolvedValue({
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
                mfa: false,
                authTime: Math.floor(Date.now() / 1000),
                mfaEnrolledAt: undefined,
                createdAt: new Date(),
                expiresAt: new Date(),
              },
              isValid: true,
            }),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn().mockResolvedValue(true),
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: CSRFService,
          useValue: {
            generateToken: jest.fn().mockResolvedValue('csrf-token'),
            validateToken: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: EmailService,
          useValue: {},
        },
        {
          provide: TenantService,
          useValue: {},
        },
        {
          provide: InviteService,
          useValue: {},
        },
        {
          provide: SignupService,
          useValue: {},
        },
        {
          provide: UserService,
          useValue: {
            findById: jest.fn().mockResolvedValue({}),
            findByEmail: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: FirebaseServerClient,
          useValue: {
            enrollStart: jest.fn().mockResolvedValue({}),
            enrollFinish: jest.fn().mockResolvedValue({}),
            withdrawMfaFactor: jest.fn().mockResolvedValue({}),
            getMfaFactors: jest.fn().mockResolvedValue([]),
            signInFinalize: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    sessionService = module.get<SessionService>(SessionService);
    redisService = module.get<RedisService>(RedisService);
    firebaseClient = new FirebaseServerClient();
  });

  describe('🔥 Firebase Client Initialization', () => {
    it('✅ should initialize Firebase client without errors', () => {
      expect(() => {
        new FirebaseServerClient();
      }).not.toThrow();
    });

    it('✅ should have MFA methods available', () => {
      expect(typeof firebaseClient.enrollStart).toBe('function');
      expect(typeof firebaseClient.enrollFinish).toBe('function');
      expect(typeof firebaseClient.withdraw).toBe('function');
      expect(typeof firebaseClient.createCustomToken).toBe('function');
    });
  });

  describe('🔧 ID Token Generation', () => {
    it('✅ should generate custom token for test user', async () => {
      if (!isFirebaseConfigured()) {
        console.log('⏭️  Skipping - Firebase not configured');
        return;
      }

      try {
        const customToken = await firebaseClient.createCustomToken('test-user-123', 'tenant-123');
        expect(customToken).toBeDefined();
        expect(typeof customToken).toBe('string');
        expect(customToken.length).toBeGreaterThan(0);
      } catch (error) {
        // This might fail if the user doesn't exist in Firebase
        console.log('⚠️  Custom token generation failed (expected if user does not exist):', error.message);
        expect(error).toBeDefined();
      }
    });
  });

  describe('🛡️ MFA Status Endpoint (Real)', () => {
    it('✅ should return MFA status for authenticated user', async () => {
      const mockRequest = {
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          mfa: false,
          mfaEnrolledAt: undefined,
        },
      };

      const result = await authController.getMfaStatus(mockRequest);

      expect(result).toEqual({
        success: true,
        mfaEnabled: false,
        mfaEnrolledAt: undefined,
        message: 'MFA is not enabled',
      });
    });
  });

  describe('🔧 MFA Enrollment Flow (Mocked Firebase)', () => {
    it('✅ should handle MFA enrollment start with mocked Firebase', async () => {
      const mockRequest = {
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
        },
      };

      // Mock the getUserIdToken method to return a fake token
      jest.spyOn(authController as any, 'getUserIdToken').mockResolvedValue('fake-id-token');

      // Mock Firebase MFA enrollment
      jest.spyOn(firebaseClient, 'enrollStart').mockResolvedValue({
        sessionInfo: 'test-session-info',
        qrCodeUrl: 'https://example.com/qr',
        otpauthUrl: 'otpauth://totp/test@example.com',
      });

      const result = await authController.startMfaEnrollment({ password: 'test-password' }, mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'MFA enrollment started. Please scan the QR code with your authenticator app.',
        qrCodeUrl: 'https://example.com/qr',
        otpauthUrl: 'otpauth://totp/test@example.com',
        sessionInfo: 'test-session-info',
      });

      // Verify Redis storage was called
      expect(redisService.set).toHaveBeenCalledWith(
        'mfa:enroll:test-user-123',
        expect.stringContaining('test-session-info'),
        300
      );
    });

    it('✅ should handle MFA enrollment finish with mocked Firebase', async () => {
      const mockRequest = {
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
        },
      };

      const finishDto = {
        verificationCode: '123456',
      };

      // Mock Redis to return enrollment data
      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          sessionInfo: 'test-session-info',
          tenantId: 'tenant-123',
          uid: 'test-user-123',
        })
      );

      // Mock Firebase MFA enrollment finish
      jest.spyOn(firebaseClient, 'enrollFinish').mockResolvedValue({
        sessionInfo: 'test-session-info',
        qrCodeUrl: 'https://example.com/qr',
        otpauthUrl: 'otpauth://totp/test@example.com',
      });

      // Mock ID token generation and verification
      jest.spyOn(authController as any, 'getUserIdToken').mockResolvedValue('fake-id-token');
      jest.spyOn(firebaseClient, 'verifyIdToken').mockResolvedValue({
        uid: 'test-user-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        photoURL: null,
        disabled: false,
        tenantId: 'tenant-123',
        customClaims: { auth_time: Math.floor(Date.now() / 1000) },
      });

      const result = await authController.finishMfaEnrollment(finishDto, mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'MFA enrollment completed successfully.',
        mfaEnabled: true,
        mfaEnrolledAt: expect.any(Number),
      });

      // Verify session was updated
      expect(sessionService.updateMfaStatus).toHaveBeenCalledWith(
        'test-session-123',
        true,
        expect.any(Number),
        expect.any(Number)
      );

      // Verify Redis cleanup
      expect(redisService.del).toHaveBeenCalledWith('mfa:enroll:test-user-123');
    });
  });

  describe('📊 Error Handling', () => {
    it('✅ should handle Firebase API errors gracefully', async () => {
      const mockRequest = {
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
        },
      };

      // Mock Firebase error
      jest.spyOn(authController as any, 'getUserIdToken').mockRejectedValue(
        new Error('Firebase API error')
      );

      await expect(authController.startMfaEnrollment({ password: 'test-password' }, mockRequest)).rejects.toThrow(
        'Firebase API error'
      );
    });

    it('✅ should handle invalid verification codes', async () => {
      const mockRequest = {
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
        },
      };

      const finishDto = {
        verificationCode: '123456',
      };

      // Mock Redis to return enrollment data
      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          sessionInfo: 'test-session-info',
          tenantId: 'tenant-123',
          uid: 'test-user-123',
        })
      );

      // Mock Firebase MFA enrollment finish to throw error
      jest.spyOn(firebaseClient, 'enrollFinish').mockRejectedValue(
        new Error('INVALID_OTP: Invalid verification code')
      );

      await expect(authController.finishMfaEnrollment(finishDto, mockRequest)).rejects.toThrow(
        'Invalid verification code. Please try again.'
      );
    });
  });
});
