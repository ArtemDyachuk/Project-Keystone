# 🧪 Security Tests for Project Keystone

## What These Tests Do

These tests verify the **most critical security features** of your multi-tenant CMS:

### 🔒 Tenant Security Tests (`tenant-security.test.ts`)

- ✅ **Blocks users** from accessing tenants they don't belong to
- ✅ **Allows users** to access their own tenants  
- ✅ **Validates** tenant IDs in requests
- ✅ **Checks** authorization headers

### 🔐 Authentication Tests (`auth-security.test.ts`)

- ✅ **Rejects** requests without proper authentication
- ✅ **Validates** JWT token format and content
- ✅ **Handles** Cognito service failures gracefully
- ✅ **Ensures** users without tenants get empty results

## How to Run Tests

```bash
# Run all security tests
npm run test:security

# Run all tests
npm run test

# Run tests in watch mode (re-runs when code changes)
npm run test:watch
```

## What Success Looks Like

When you run the tests, you should see:

```
✅ TENANT SECURITY TESTS
  ✅ should BLOCK access when user has NO access to tenant
  ✅ should ALLOW access when user belongs to tenant
  ✅ should BLOCK access when no tenant ID provided
  
✅ AUTHENTICATION SECURITY TESTS  
  ✅ should REJECT requests without authorization header
  ✅ should REJECT requests with invalid authorization header
```

## Why These Tests Matter

1. **Tenant Isolation**: The #1 security requirement for your multi-tenant system
2. **Authentication**: Ensures only valid users can access the system
3. **Regression Prevention**: Catches security bugs before they reach production
4. **Confidence**: Proves your security actually works

## Beginner Tips

- **Green ✅ = Good**: Test passed, security works
- **Red ❌ = Problem**: Test failed, security broken
- **Run tests before deploying**: Always check security before going live
- **Add new tests**: When you add features, add security tests too

These tests are your **security safety net** - they catch problems before users do!
