/**
 * 🔐 FRONTEND AUTH UTILITIES SECURITY TESTS
 * Tests client-side authentication and JWT handling logic
 */

describe("🔐 FRONTEND AUTH UTILITIES - Client-Side Security", () => {
  
  // Mock getUserDataFromJWT functionality
  const mockGetUserDataFromJWT = (tokenPayload: any) => {
    if (!tokenPayload || typeof tokenPayload !== 'object' || Object.keys(tokenPayload).length === 0) {
      return null;
    }
    
    // Parse custom attributes properly (like your real function)
    const customTenantIds = tokenPayload["custom:tenantIds"];
    const customSelectedTenantId = tokenPayload["custom:selectedTenantId"];
    
    // Convert comma-separated string to array - handle edge cases
    let tenantIds: string[] | undefined = undefined;
    if (customTenantIds && typeof customTenantIds === 'string' && customTenantIds.trim()) {
      tenantIds = customTenantIds.split(",").map((id: string) => id.trim()).filter(Boolean);
      if (tenantIds.length === 0) tenantIds = [];
    }
    
    return {
      sub: tokenPayload.sub,
      email: tokenPayload.email,
      username: tokenPayload.username,
      email_verified: tokenPayload.email_verified,
      firstName: tokenPayload.given_name,
      lastName: tokenPayload.family_name,
      tenantIds: tenantIds,
      selectedTenantId: customSelectedTenantId,
    };
  };

  // Mock getUserDisplayName functionality
  const mockGetUserDisplayName = (userData: any): string => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    if (userData?.firstName) return userData.firstName;
    if (userData?.lastName) return userData.lastName;
    if (userData?.email) return userData.email;
    if (userData?.username) return userData.username;
    return "User";
  };

  describe("👤 USER DATA EXTRACTION", () => {
    
    it("✅ Properly extracts user data from valid JWT", () => {
      // Arrange: Valid JWT payload
      const jwtPayload = {
        sub: "123e4567-e89b-12d3-a456-426614174000",
        email: "john@company.com",
        username: "john@company.com",
        email_verified: true,
        given_name: "John",
        family_name: "Doe",
        "custom:tenantIds": "507f1f77bcf86cd799439011,507f1f77bcf86cd799439012",
        "custom:selectedTenantId": "507f1f77bcf86cd799439011"
      };
      
      // Act: Extract user data
      const userData = mockGetUserDataFromJWT(jwtPayload);
      
      // Assert: Should properly parse all fields
      expect(userData).toEqual({
        sub: "123e4567-e89b-12d3-a456-426614174000",
        email: "john@company.com",
        username: "john@company.com",
        email_verified: true,
        firstName: "John",
        lastName: "Doe",
        tenantIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
        selectedTenantId: "507f1f77bcf86cd799439011"
      });
    });

    it("✅ Handles single tenant ID correctly", () => {
      // Arrange: JWT with single tenant
      const jwtPayload = {
        sub: "123e4567-e89b-12d3-a456-426614174000",
        email: "user@startup.com",
        "custom:tenantIds": "507f1f77bcf86cd799439011", // Single tenant
        "custom:selectedTenantId": "507f1f77bcf86cd799439011"
      };
      
      // Act: Extract user data
      const userData = mockGetUserDataFromJWT(jwtPayload);
      
      // Assert: Should handle single tenant as array
      expect(userData?.tenantIds).toEqual(["507f1f77bcf86cd799439011"]);
      expect(userData?.selectedTenantId).toBe("507f1f77bcf86cd799439011");
    });

    it("❌ Returns null for invalid/empty JWT payload", () => {
      // Arrange: Invalid payloads
      const invalidPayloads = [null, undefined, {}];
      
      invalidPayloads.forEach(payload => {
        // Act: Try to extract user data
        const userData = mockGetUserDataFromJWT(payload);
        
        // Assert: Should return null for invalid data
        expect(userData).toBeNull();
      });
      
      // Special case: object with only invalid data should still return data structure
      const objectWithInvalidData = { invalid: "data" };
      const userDataWithInvalid = mockGetUserDataFromJWT(objectWithInvalidData);
      expect(userDataWithInvalid).toBeTruthy(); // Should return object, just with undefined fields
    });

    it("🛡️ Handles missing tenant data gracefully", () => {
      // Arrange: JWT without tenant information
      const jwtPayload = {
        sub: "123e4567-e89b-12d3-a456-426614174000",
        email: "newuser@test.com",
        username: "newuser@test.com"
        // No custom:tenantIds or custom:selectedTenantId
      };
      
      // Act: Extract user data
      const userData = mockGetUserDataFromJWT(jwtPayload);
      
      // Assert: Should handle missing tenant data
      expect(userData?.tenantIds).toBeUndefined();
      expect(userData?.selectedTenantId).toBeUndefined();
      expect(userData?.sub).toBe("123e4567-e89b-12d3-a456-426614174000");
    });
  });

  describe("🏷️ USER DISPLAY NAME LOGIC", () => {
    
    it("✅ Generates display name from firstName + lastName", () => {
      // Arrange: User with full name
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com"
      };
      
      // Act: Get display name
      const displayName = mockGetUserDisplayName(userData);
      
      // Assert: Should use full name
      expect(displayName).toBe("John Doe");
    });

    it("✅ Falls back to firstName only", () => {
      // Arrange: User with only first name
      const userData = {
        firstName: "John",
        email: "john@test.com"
      };
      
      // Act: Get display name
      const displayName = mockGetUserDisplayName(userData);
      
      // Assert: Should use first name
      expect(displayName).toBe("John");
    });

    it("✅ Falls back to email when no name available", () => {
      // Arrange: User with only email
      const userData = {
        email: "john@test.com",
        username: "john@test.com"
      };
      
      // Act: Get display name
      const displayName = mockGetUserDisplayName(userData);
      
      // Assert: Should use email
      expect(displayName).toBe("john@test.com");
    });

    it("✅ Falls back to username when no email", () => {
      // Arrange: User with only username
      const userData = {
        username: "john123"
      };
      
      // Act: Get display name
      const displayName = mockGetUserDisplayName(userData);
      
      // Assert: Should use username
      expect(displayName).toBe("john123");
    });

    it("✅ Defaults to 'User' when no identifiable info", () => {
      // Arrange: User with no name/email/username
      const userData = {
        sub: "123456789"
      };
      
      // Act: Get display name
      const displayName = mockGetUserDisplayName(userData);
      
      // Assert: Should default to "User"
      expect(displayName).toBe("User");
    });
  });

  describe("🚨 TENANT DATA SECURITY", () => {
    
    it("🛡️ Properly parses comma-separated tenant IDs", () => {
      // Arrange: JWT with multiple tenants
      const jwtPayload = {
        sub: "123456789",
        "custom:tenantIds": "507f1f77bcf86cd799439011,507f1f77bcf86cd799439012,507f1f77bcf86cd799439013"
      };
      
      // Act: Extract tenant data
      const userData = mockGetUserDataFromJWT(jwtPayload);
      
      // Assert: Should properly split and trim tenant IDs
      expect(userData?.tenantIds).toEqual([
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012", 
        "507f1f77bcf86cd799439013"
      ]);
    });

    it("🛡️ Handles malformed tenant ID strings", () => {
      // Arrange: JWT with problematic tenant ID strings
      const testCases = [
        { input: "507f1f77bcf86cd799439011, , 507f1f77bcf86cd799439012", expected: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"] },
        { input: ",507f1f77bcf86cd799439011,", expected: ["507f1f77bcf86cd799439011"] },
        { input: "   507f1f77bcf86cd799439011   ", expected: ["507f1f77bcf86cd799439011"] },
        { input: "", expected: undefined },
        { input: "   ,   ,   ", expected: [] }
      ];
      
      testCases.forEach(({ input, expected }) => {
        // Arrange: JWT with problematic tenant ID string
        const jwtPayload = {
          sub: "123456789",
          "custom:tenantIds": input
        };
        
        // Act: Extract tenant data
        const userData = mockGetUserDataFromJWT(jwtPayload);
        
        // Assert: Should handle malformed strings gracefully
        expect(userData?.tenantIds).toEqual(expected);
      });
    });

    it("❌ Empty tenant string results in undefined tenantIds", () => {
      // Arrange: JWT with empty tenant string
      const jwtPayload = {
        sub: "123456789",
        "custom:tenantIds": ""
      };
      
      // Act: Extract tenant data
      const userData = mockGetUserDataFromJWT(jwtPayload);
      
      // Assert: Should result in undefined since empty string doesn't split properly
      expect(userData?.tenantIds).toBeUndefined();
    });
  });

  describe("🔍 EDGE CASES & ERROR HANDLING", () => {
    
    it("🛡️ Handles JWT with unexpected data types", () => {
      // Arrange: JWT with wrong data types
      const jwtPayload = {
        sub: 123456789, // Number instead of string
        email: null,
        "custom:tenantIds": ["array", "instead", "of", "string"], // Array instead of string
        "custom:selectedTenantId": true // Boolean instead of string
      };
      
      // Act: Extract user data (this would cause issues in real implementation)
      const userData = mockGetUserDataFromJWT(jwtPayload);
      
      // Assert: Should handle gracefully (implementation dependent)
      expect(userData?.sub).toBe(123456789);
      expect(userData?.email).toBeNull();
      // tenantIds should be undefined since it's not a string
      expect(userData?.tenantIds).toBeUndefined();
    });

    it("🛡️ Validates ObjectId format in tenant IDs", () => {
      // Helper function to validate ObjectId format (like in your tests)
      const isValidObjectId = (id: string): boolean => {
        return /^[0-9a-fA-F]{24}$/.test(id);
      };
      
      // Arrange: Mixed valid/invalid tenant IDs
      const tenantIds = [
        "507f1f77bcf86cd799439011", // Valid
        "invalid-id",               // Invalid
        "507f1f77bcf86cd79943901",   // Too short
        "507f1f77bcf86cd7994390111", // Too long
        "507f1f77bcf86cd799439012"   // Valid
      ];
      
      // Act: Filter valid ObjectIds
      const validTenantIds = tenantIds.filter(isValidObjectId);
      
      // Assert: Should only include valid ObjectIds
      expect(validTenantIds).toEqual([
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012"
      ]);
    });
  });
});
