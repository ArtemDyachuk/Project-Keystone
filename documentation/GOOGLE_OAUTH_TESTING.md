# Google OAuth Testing Guide

This guide provides instructions for testing the Google OAuth integration in the Keystone CMS.

## Prerequisites

1. **Google OAuth Setup**: Complete the Google OAuth setup as described in `GOOGLE_OAUTH_SETUP.md`
2. **Environment Variables**: Ensure you have the required environment variables set in `.env.local`
3. **Development Server**: The application should be running locally

## Quick Test Steps

### 1. Environment Setup
Ensure these environment variables are set in your `.env.local`:

```bash
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
```

### 2. Test Google OAuth Flow

#### Manual Testing
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page: `http://localhost:3000/login`

3. Click "Continue with Google" button

4. Complete the Google OAuth flow:
   - You should be redirected to Google's consent screen
   - Sign in with your Google account
   - Grant the requested permissions
   - You should be redirected back to the application

5. Verify the authentication:
   - Check that you're logged in (redirected to dashboard or tenant creation)
   - Verify JWT tokens are set in browser cookies
   - Test that `/api/auth/me` returns user data

#### API Testing
You can also test the API endpoints directly:

```bash
# Test Google OAuth initiation
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"provider": "google"}'

# Expected response: {"success": true, "redirectUrl": "https://accounts.google.com/oauth2/..."}
```

### 3. Test JWT Token Compatibility

After successful Google OAuth login, test that the tokens work with existing utilities:

```bash
# Test user data retrieval
curl http://localhost:3000/api/auth/me \
  -H "Cookie: idToken=your_google_id_token"

# Expected response: User data with Google OAuth provider
```

### 4. Test Multi-Tenant Flow

1. **New Google User**: After Google OAuth login, verify:
   - User is redirected to `/tenants/create` (since they have no tenants)
   - User can create a new tenant
   - User can access the tenant after creation

2. **Multi-Tenant Security**: Verify that:
   - Google OAuth users follow the same tenant isolation rules
   - Users can only access their own tenants
   - Middleware properly validates tenant access

## Expected Behavior

### Successful Google OAuth Flow
1. **Login Initiation**: Click "Continue with Google" → Redirect to Google
2. **Google OAuth**: Complete Google authentication and consent
3. **Callback Processing**: Redirect to `/api/auth/google/callback`
4. **Token Exchange**: Google authorization code exchanged for tokens
5. **Cookie Setting**: JWT tokens stored in secure HTTP-only cookies
6. **Final Redirect**: User redirected to dashboard or tenant creation

### Token Structure
Google OAuth tokens should contain:
```json
{
  "sub": "google_user_id",
  "email": "user@gmail.com",
  "email_verified": true,
  "given_name": "John",
  "family_name": "Doe",
  "provider": "google",
  "tenantIds": undefined,
  "selectedTenantId": undefined
}
```

## Troubleshooting

### Common Issues

1. **"OAuth client not found"**
   - Check `GOOGLE_OAUTH_CLIENT_ID` environment variable
   - Verify OAuth client exists in Google Cloud Console

2. **"Redirect URI mismatch"**
   - Ensure `http://localhost:3000/api/auth/google/callback` is added in Google Cloud Console
   - Check `NEXTAUTH_URL` environment variable

3. **"Token verification failed"**
   - Verify system time is correct (JWT tokens are time-sensitive)
   - Check that Google+ API is enabled in Google Cloud Console

4. **Infinite redirect loops**
   - Clear browser cookies and try again
   - Check middleware configuration

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

This will log OAuth flow details to the console.

### Browser Developer Tools
Check the following in browser developer tools:

1. **Network Tab**: Verify OAuth requests and responses
2. **Application Tab**: Check that cookies are set correctly
3. **Console**: Look for JavaScript errors during OAuth flow

## Comparison with Cognito

Both authentication methods should work identically after login:

| Feature | Cognito | Google OAuth |
|---------|---------|--------------|
| JWT Tokens | ✅ | ✅ |
| Multi-tenant | ✅ | ✅ |
| Middleware Auth | ✅ | ✅ |
| Tenant Isolation | ✅ | ✅ |
| Token Refresh | ✅ | ✅ |
| User Data | ✅ | ✅ |

The main differences:
- **Setup**: Google OAuth is simpler to configure
- **User Storage**: Cognito stores users in AWS, Google OAuth uses Google accounts
- **Tenant Assignment**: Both start with no tenants, users create them after first login

## Test Cases Checklist

- [ ] Google OAuth initiation works (`/api/auth/signin` with provider: google)
- [ ] Google consent screen appears and functions correctly
- [ ] OAuth callback processes authorization code successfully
- [ ] JWT tokens are properly set in cookies
- [ ] User data is correctly extracted from Google ID token
- [ ] New users are redirected to tenant creation
- [ ] Users with tenants are redirected to dashboard
- [ ] Middleware properly authenticates Google OAuth users
- [ ] Tenant access controls work for Google OAuth users
- [ ] Token refresh works (if refresh token provided)
- [ ] Sign out clears Google OAuth cookies
- [ ] Error handling works for failed OAuth flows

## Performance Notes

- Google OAuth flow typically takes 2-3 seconds
- JWT token verification is cached for better performance
- Consider implementing token refresh for long-lived sessions

## Security Verification

Verify that:
- [ ] OAuth tokens are stored in HTTP-only cookies
- [ ] Tokens are properly verified using Google's JWKS
- [ ] CSRF protection is maintained
- [ ] Tenant isolation is enforced
- [ ] Sensitive data is not logged or exposed
