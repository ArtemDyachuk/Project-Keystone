# 🌐 Frontend Security Tests for Project Keystone

## What These Tests Do

These tests verify the **security of your frontend (client-side)** components and utilities in your Next.js CMS:

### 🛡️ Middleware Security Tests (`security/middleware-security.test.ts`)

- ✅ **Tenant route protection** - Validates middleware blocks unauthorized tenant access
- ✅ **User flow validation** - Ensures proper redirects for users with/without tenants
- ✅ **Attack prevention** - Tests ObjectId enumeration and URL manipulation attacks
- ✅ **Business scenarios** - Validates consultant, admin, and new user workflows

### 🔐 Auth Utilities Tests (`security/auth-utils-security.test.ts`)

- ✅ **JWT data extraction** - Tests parsing of user data from Cognito tokens
- ✅ **Display name logic** - Validates user name fallback logic
- ✅ **Tenant data parsing** - Tests comma-separated tenant ID handling
- ✅ **Edge case handling** - Validates graceful handling of malformed data

### 🏢 Tenant Service Tests (`security/tenant-service-security.test.ts`)

- ✅ **Client-side access control** - Tests frontend tenant isolation logic
- ✅ **Data filtering** - Validates users only see their authorized tenants
- ✅ **Attack simulation** - Tests client-side manipulation attempts
- ✅ **Helper functions** - Validates utility functions for access checks

## How to Run Tests

Navigate to the `apps/front-ends/cms` directory in your terminal:

```bash
cd apps/front-ends/cms
```

Then run the tests:

### 1. Run All Frontend Security Tests

```bash
npm test
```

### 2. Run Only Security Tests

```bash
npm run test:security
```

### 3. Run Specific Test Files

```bash
# Middleware security
npm test middleware-security

# Auth utilities security
npm test auth-utils-security

# Tenant service security
npm test tenant-service-security
```

### 4. Run Tests in Watch Mode

```bash
npm run test:watch
```

## What Success Looks Like

When you run the security tests, you should see:

```
✅ FRONTEND SECURITY - Middleware Protection
  ✅ TENANT ACCESS VALIDATION
    ✅ Users with NO tenants are forced to tenant creation
    ✅ Users with tenants can access their own tenant pages
    ✅ Users CANNOT access other tenants' pages
    ✅ Users with tenants are blocked from tenant creation
  ✅ ATTACK SCENARIOS
    ✅ ATTACK: User guesses tenant ObjectId in URL
    ✅ ATTACK: Malicious user with empty tenantIds array
    ✅ ATTACK: User with null/undefined tenantIds

✅ FRONTEND AUTH UTILITIES - Client-Side Security
  ✅ USER DATA EXTRACTION
    ✅ Properly extracts user data from valid JWT
    ✅ Handles single tenant ID correctly
    ✅ Returns null for invalid/empty JWT payload
  ✅ USER DISPLAY NAME LOGIC
    ✅ Generates display name from firstName + lastName
    ✅ Falls back to email when no name available

✅ FRONTEND TENANT SERVICE - Client-Side Security
  ✅ CLIENT-SIDE TENANT ACCESS CONTROL
    ✅ User can access their authorized tenants
    ✅ User CANNOT access unauthorized tenants
    ✅ getTenantsByIds returns only user's authorized tenants
```

## Why Frontend Security Testing Matters

### 🎯 **Complements Backend Testing**

- **Backend tests** verify server-side security (API endpoints, database queries)
- **Frontend tests** verify client-side security (routing, data parsing, UI logic)

### 🛡️ **Critical Frontend Security Areas**

1. **Route Protection** - Ensures middleware properly blocks unauthorized access
2. **Data Parsing** - Validates JWT token parsing doesn't introduce vulnerabilities  
3. **Client-side Validation** - Tests helper functions that filter/validate tenant access
4. **Attack Prevention** - Simulates client-side manipulation attempts

### ⚡ **Speed Advantage**

- **Frontend security tests**: Run in milliseconds
- **Manual frontend testing**: Hours of clicking through different user scenarios
- **E2E testing**: Minutes per scenario, complex setup

## Frontend vs Backend Testing

| Aspect | Frontend Tests | Backend Tests |
|--------|---------------|---------------|
| **Focus** | Client-side logic, routing, data parsing | API security, database queries, server logic |
| **Speed** | ⚡ Very fast (jsdom) | ⚡ Fast (node) |
| **Coverage** | UI flows, middleware, utilities | API endpoints, services, guards |
| **Mocking** | Browser APIs, Next.js router | Database, external APIs |

## Test Categories

### 🔴 **Critical (Must Pass)**
- Tenant access validation in middleware
- JWT data extraction security
- Client-side tenant filtering

### 🟡 **Important (Should Pass)**  
- Display name logic
- Edge case handling
- Helper function validation

### 🟢 **Nice to Have (Good Practice)**
- Business scenario validation
- Attack simulation documentation
- Error handling gracefully

## Adding New Frontend Security Tests

When you add new frontend features, add corresponding security tests:

### 1. New Route/Page → Add Middleware Test
```typescript
it("✅ New protected route requires proper access", () => {
  const result = validateTenantAccess("/new-route/tenant-123", userData);
  expect(result.shouldRedirect).toBe(false); // Should allow access
});
```

### 2. New Auth Logic → Add Auth Utils Test
```typescript
it("✅ New auth function handles edge cases", () => {
  const result = newAuthFunction(malformedData);
  expect(result).toBeNull(); // Should handle gracefully
});
```

### 3. New Tenant Feature → Add Service Test
```typescript
it("✅ New tenant feature respects access control", () => {
  const result = newTenantFeature(tenantId, userTenantIds);
  expect(hasProperAccess(result)).toBe(true);
});
```

## Key Differences from Backend Tests

### ✅ **What Frontend Tests Focus On**
- Next.js middleware logic
- Client-side data transformation
- Browser-based routing security
- JWT parsing on the client
- UI component access control

### ❌ **What Frontend Tests Don't Cover**
- Actual network requests (mocked)
- Real database queries (mocked)
- Server-side JWT verification (backend responsibility)
- Cookie management (browser/server responsibility)

## 🎯 Bottom Line

Your frontend now has **comprehensive security testing** covering:

- ✅ **Middleware protection** (route-level security)
- ✅ **Data parsing security** (JWT handling)
- ✅ **Client-side validation** (tenant access control)
- ✅ **Attack prevention** (manipulation attempts)

Combined with your backend tests, you now have **full-stack security coverage**! 🛡️
