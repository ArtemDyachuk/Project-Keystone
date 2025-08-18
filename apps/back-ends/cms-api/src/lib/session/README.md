# Redis Session Security Guide

This guide explains the Redis-backed session system with comprehensive security hardening features.

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
SESSION_COOKIE_NAME=sid
SESSION_TTL_SECONDS=86400

# Cookie Security
COOKIE_DOMAIN=yourdomain.com  # Optional: set for subdomain sharing
NODE_ENV=production          # Enables secure cookies and strict SameSite

# Security Features
# CSRF protection is automatically enabled
# MFA step-up is time-based (30 minutes default)
```

## Integration with Authentication Flow

### 1. After Successful Firebase Authentication

When a user successfully authenticates (e.g., in your signin API route), create a Redis session:

```typescript
import { createUserSession } from '../lib/session/session.helper';

// After verifying Firebase token...
const { sid, defaultTenantId } = await createUserSession(
  user.uid, 
  res,
  {
    deviceId: req.get('User-Agent'), // Optional: for device tracking
    mfaStrong: false, // Set to true if MFA was completed
  }
);

// The session cookie is automatically set
// defaultTenantId will be set if user has exactly one tenant
```

### 2. Guard Chain for Protected Routes

Use this guard chain for tenant-scoped routes:

```typescript
@Controller('your-resource')
@UseGuards(FirebaseSessionGuard, SessionGuard, TenantGuard)
export class YourController {
  // All methods now have:
  // - req.user (Firebase user info)
  // - req.sessionCtx (Redis session data)
  // - req.tenantId (current tenant ID)
  // - req.tenantRole (user's role in current tenant)
}
```

### 3. MFA Integration

When MFA is completed, update the session with time-based expiration:

```typescript
import { updateMfaStatus } from '../lib/session/session.helper';
import { setMfaStrongUntil } from '../lib/security/mfa.helper';

// After successful MFA verification (30 minutes validity)
const mfaStrongUntil = setMfaStrongUntil(); // Default: 30 minutes
await updateMfaStatus(req.sessionId!, mfaStrongUntil);

// Custom duration (e.g., 1 hour)
const customMfaUntil = setMfaStrongUntil(60 * 60 * 1000);
await updateMfaStatus(req.sessionId!, customMfaUntil);
```

### 4. Logout

Use the logout endpoint or clear session manually:

```typescript
import { clearUserSession } from '../lib/session/session.helper';

await clearUserSession(req.sessionId!, res);
```

## Security Features

### Core Session Security
- **Rolling Sessions**: TTL is refreshed on each request
- **Session Rotation**: Session ID changes on tenant switch for security
- **Opaque Session IDs**: Cryptographically secure random tokens
- **User Session Indexing**: Efficient session management per user

### CSRF Protection
- **Double-Submit Cookie**: CSRF tokens in both cookie and header
- **Automatic Protection**: All mutating endpoints protected
- **Token Endpoint**: `GET /auth/csrf` provides tokens for clients

### MFA & Authorization
- **Time-Based MFA**: `mfaStrongUntil` with configurable expiration
- **Step-Up Authentication**: Required for admin/owner roles
- **Role-Based Checks**: Automatic validation in `requireStepUp()`

### Data Protection
- **Tenant Isolation**: Automatic `tenantId` filtering on all queries
- **Body Enforcement**: Prevents cross-tenant data injection
- **Idempotent Operations**: Safe retry of tenant switches

### Monitoring & Audit
- **Comprehensive Logging**: All tenant switches logged to MongoDB
- **Health Monitoring**: Redis connectivity checks via `/health/redis`
- **Rate Limiting**: Prevents abuse (10 switches/minute per user)

### Failure Handling
- **Redis Resilience**: Graceful degradation when Redis is unavailable
- **Service Status**: 503 responses for critical session-dependent routes
- **Optional Routes**: Some routes can work without Redis (`@RedisOptional`)

### Session Management
- **Multi-Session Support**: Users can have multiple active sessions
- **Session Revocation**: Revoke all sessions or just others
- **Session Listing**: View all active sessions with metadata

## Migration Notes

- The old Firebase custom claims approach is deprecated
- `POST /tenants/switch` replaces the old selected tenant update
- All tenant context now comes from Redis, not Firebase claims
- Firebase is still used for identity verification only

## API Endpoints

### CSRF Protection
```bash
# Get CSRF token for client-side requests
GET /auth/csrf
# Returns: { "csrfToken": "uuid-token" }

# Include token in requests
POST /tenants/switch
Headers: 
  X-CSRF-Token: uuid-token
  Cookie: csrf_token=uuid-token
```

### Session Management
```bash
# Get current user's sessions
GET /sessions
# Returns: { "sessions": [...], "total": 3 }

# Revoke all sessions (including current)
POST /sessions/revoke-all
# Returns: { "message": "All sessions revoked", "revokedSessions": 3 }

# Revoke other sessions (keep current)
POST /sessions/revoke-others
# Returns: { "revokedSessions": 2, "currentSessionPreserved": true }
```

### Health Monitoring
```bash
# Check Redis connectivity
GET /health/redis
# Returns: { "status": "healthy", "services": { "redis": { "status": "up" } } }
```

### Tenant Operations
```bash
# Switch tenant (idempotent)
POST /tenants/switch
Body: { "tenantId": "tenant-123" }
# Returns: { "message": "Successfully switched tenant", "tenantId": "tenant-123", "role": "admin" }

# Logout and clear session
POST /tenants/logout
# Returns: { "message": "Successfully logged out" }
```

## Client Integration

### CSRF Token Flow
```typescript
// 1. Get CSRF token on app init
const response = await fetch('/auth/csrf', { credentials: 'include' });
const { csrfToken } = await response.json();

// 2. Include token in all mutating requests
await fetch('/tenants/switch', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ tenantId: 'new-tenant-id' }),
});
```

## Security Considerations

- **HttpOnly Cookies**: Session and CSRF cookies cannot be accessed via JavaScript
- **Secure Cookies**: Only sent over HTTPS in production
- **SameSite Strict**: Maximum CSRF protection in production
- **Session Rotation**: New session ID on every tenant switch
- **Time-Based MFA**: Automatic expiration of elevated privileges
- **Audit Trails**: Complete logging of all tenant operations
- **Rate Limiting**: Prevents brute force and abuse
- **Redis Resilience**: Graceful handling of infrastructure failures
