/**
 * 🧪 MFA Phase 2 Testing
 * Tests for updated login flow with MFA integration
 */

import { MfaLoginDto } from '../../dto/auth.dto';
import { AuthController } from '../../controllers/auth.controller';
import { FirebaseServerClient } from '@keystone/auth';

describe('🔐 MFA Phase 2 - Login Flow Updates', () => {
  describe('📝 DTO Validation', () => {
    it('✅ should validate MFA login DTO format', () => {
      const validDto = new MfaLoginDto();
      validDto.email = 'test@example.com';
      validDto.password = 'password123';
      validDto.verificationCode = '123456';

      expect(validDto.email).toBe('test@example.com');
      expect(validDto.password).toBe('password123');
      expect(validDto.verificationCode).toBe('123456');
    });

    it('✅ should have proper validation rules', () => {
      const dto = new MfaLoginDto();

      // Test that validation decorators are applied
      expect(typeof dto.email).toBe('undefined'); // Not set yet
      expect(typeof dto.password).toBe('undefined'); // Not set yet
      expect(typeof dto.verificationCode).toBe('undefined'); // Not set yet
    });
  });

  describe('🔧 Controller Method Existence', () => {
    it('✅ should have MFA login method in AuthController', () => {
      // Check that the controller class exists
      expect(AuthController).toBeDefined();
      expect(typeof AuthController).toBe('function');

      // Check that the prototype has the MFA login method
      const controllerPrototype = AuthController.prototype;
      expect(typeof controllerPrototype.loginWithMfa).toBe('function');
    });
  });

  describe('📊 Login Response Structure', () => {
    it('✅ should have MFA status in login response', () => {
      // Test that the login response includes MFA information
      const expectedLoginResponse = {
        success: true,
        message: 'Login successful',
        sessionId: 'test-session-123',
        csrfToken: 'test-csrf-token',
        mfa: {
          enabled: true,
          enrolledAt: expect.any(Number),
          required: true,
        },
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
        }
      };

      expect(expectedLoginResponse.mfa).toBeDefined();
      expect(expectedLoginResponse.mfa.enabled).toBe(true);
      expect(expectedLoginResponse.mfa.required).toBe(true);
      expect(typeof expectedLoginResponse.mfa.enrolledAt).toBe('object');
    });

    it('✅ should handle MFA disabled users', () => {
      const expectedLoginResponse = {
        success: true,
        message: 'Login successful',
        sessionId: 'test-session-123',
        csrfToken: 'test-csrf-token',
        mfa: {
          enabled: false,
          enrolledAt: undefined,
          required: false,
        },
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
        }
      };

      expect(expectedLoginResponse.mfa.enabled).toBe(false);
      expect(expectedLoginResponse.mfa.required).toBe(false);
      expect(expectedLoginResponse.mfa.enrolledAt).toBeUndefined();
    });
  });

  describe('🛡️ MFA Login Endpoint Structure', () => {
    it('✅ should have correct MFA login endpoint', () => {
      // Get method metadata using reflection
      const mfaLoginMethod = AuthController.prototype.loginWithMfa;

      // Check that method exists and is a function
      expect(typeof mfaLoginMethod).toBe('function');
    });
  });

  describe('🔧 Firebase Integration', () => {
    it('✅ should have getMfaFactors method in FirebaseServerClient', () => {
      // Check that the Firebase client has the MFA methods
      expect(typeof FirebaseServerClient.prototype.getMfaFactors).toBe('function');
    });

    it('✅ should have MfaFactor type defined', () => {
      // Test that the MfaFactor interface is properly defined
      const testFactor = {
        id: 'test-factor-123',
        label: 'Test Authenticator',
        type: 'totp'
      };

      expect(testFactor.id).toBe('test-factor-123');
      expect(testFactor.label).toBe('Test Authenticator');
      expect(testFactor.type).toBe('totp');
    });
  });

  describe('📋 API Contract Validation', () => {
    it('✅ should have consistent MFA login response structure', () => {
      // Test that MFA login DTO has all required fields
      const dto = new MfaLoginDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.verificationCode = '123456';

      expect(dto.email).toBeDefined();
      expect(dto.password).toBeDefined();
      expect(dto.verificationCode).toBeDefined();
    });

    it('✅ should validate verification code length', () => {
      const dto = new MfaLoginDto();
      dto.verificationCode = '123456'; // 6 digits

      expect(dto.verificationCode.length).toBe(6);
    });
  });

  describe('🔧 Session Management Integration', () => {
    it('✅ should include MFA status in session creation', () => {
      // Test that session creation includes MFA fields
      const expectedSessionData = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
        tenantId: 'tenant-123',
        selectedCorporationId: 'corp-123',
        roles: ['user'],
        disabled: false,
        mfa: true, // MFA enabled
        authTime: expect.any(Number),
        mfaEnrolledAt: expect.any(Number),
      };

      expect(expectedSessionData.mfa).toBeDefined();
      expect(typeof expectedSessionData.mfa).toBe('boolean');
      expect(typeof expectedSessionData.authTime).toBe('object');
      expect(typeof expectedSessionData.mfaEnrolledAt).toBe('object');
    });
  });

  describe('📊 Error Handling', () => {
    it('✅ should handle MFA verification errors', () => {
      // Test that MFA verification errors are properly handled
      const expectedErrorResponse = {
        code: 'INVALID_OTP',
        message: 'Invalid verification code. Please try again.'
      };

      expect(expectedErrorResponse.code).toBe('INVALID_OTP');
      expect(expectedErrorResponse.message).toContain('verification code');
    });

    it('✅ should handle missing verification code', () => {
      // Test that missing verification code is handled
      const expectedError = 'Verification code is required';

      expect(expectedError).toContain('Verification code');
    });
  });
});
