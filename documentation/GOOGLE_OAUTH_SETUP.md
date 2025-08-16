# Google OAuth Setup Guide

This guide explains how to configure Google OAuth as an alternative authentication provider to AWS Cognito for the Keystone CMS.

## Overview

Google OAuth has been integrated as an alternative to AWS Cognito for authentication. This is particularly useful for:

- Simpler multi-tenant setup without AWS Cognito limitations
- Better user experience with familiar Google authentication
- Easier development and testing

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. Access to Google Cloud Console

## Step 1: Create Google OAuth Application

### 1.1 Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### 1.2 Enable Google+ API

1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API" and enable it
3. Also enable "OAuth2 API" if not already enabled

### 1.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Choose **Web application** as the application type
4. Configure the OAuth consent screen if prompted:
   - **User Type**: External (for public access) or Internal (for organization only)
   - **App information**: Fill in app name, user support email, and developer contact
   - **Scopes**: Add these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
     - `openid`
   - **Test users**: Add test email addresses for development

### 1.4 Configure Authorized Redirect URIs

Add these redirect URIs:

- **Development**: `http://localhost:3000/api/auth/google/callback`
- **Production**: `https://yourdomain.com/api/auth/google/callback`

### 1.5 Save Credentials

1. Copy the **Client ID** and **Client Secret**
2. Keep these secure - you'll need them for environment variables

## Step 2: Environment Configuration

### 2.1 Local Development (.env.local)

Create or update your `.env.local` file:

```bash
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000

# Existing Cognito configuration (still supported)
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=keystone-development-auth
AWS_REGION=us-east-1
```

### 2.2 Production Environment

For production deployments (Vercel, Render, etc.), add these environment variables:

```bash
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=https://yourdomain.com
```

## Step 3: Using Google OAuth

### 3.1 Frontend Integration

The signin route now supports both providers. To use Google OAuth:

```typescript
// In your login component or API call
const response = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    provider: 'google' // or 'cognito' for existing auth
  }),
});

const data = await response.json();

if (data.redirectUrl) {
  // Redirect to Google OAuth consent screen
  window.location.href = data.redirectUrl;
}
```

### 3.2 Direct Google OAuth Flow

You can also link directly to the Google OAuth flow:

```html
<!-- Direct link to Google OAuth -->
<a href="/api/auth/google/signin">Sign in with Google</a>
```

### 3.3 Existing Cognito Flow

Cognito authentication remains unchanged and is the default:

```typescript
// Default Cognito authentication
const response = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    provider: 'cognito' // optional, defaults to cognito
  }),
});
```

## Step 4: Multi-Tenant Considerations

### 4.1 Google OAuth Users and Tenants

- Google OAuth users start with **no tenants assigned**
- They will be redirected to `/tenants/create` to create their first tenant
- This follows the same multi-tenant flow as Cognito users

### 4.2 Token Compatibility

- Google ID tokens are automatically converted to work with existing JWT utilities
- The same middleware and authentication checks apply to both providers
- User data format is normalized between providers

## Step 5: Testing

### 5.1 Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/login`
3. Add a "Sign in with Google" button or test the API directly
4. Complete the OAuth flow and verify:
   - User is redirected to dashboard (if they have tenants)
   - User is redirected to tenant creation (if no tenants)
   - JWT tokens are properly set in cookies

### 5.2 Verify JWT Tokens

Check that Google OAuth tokens work with existing utilities:

- `/api/auth/me` should return user data
- Middleware should properly authenticate Google OAuth users
- Tenant access controls should work correctly

## Security Notes

1. **Environment Variables**: Never commit OAuth secrets to version control
2. **HTTPS in Production**: Always use HTTPS for OAuth redirects in production
3. **Scope Limitation**: Only request necessary OAuth scopes
4. **Token Validation**: All tokens are properly verified using Google's JWKS
5. **Multi-tenant Security**: Google OAuth users follow the same tenant isolation rules

## Troubleshooting

### Common Issues

1. **"OAuth client not found"**
   - Verify GOOGLE_OAUTH_CLIENT_ID is correct
   - Check that the OAuth client exists in Google Cloud Console

2. **"Redirect URI mismatch"**
   - Ensure redirect URIs in Google Cloud Console match your environment
   - Check NEXTAUTH_URL environment variable

3. **"Missing scopes"**
   - Verify OAuth consent screen has required scopes configured
   - Check that scopes are properly enabled in Google Cloud Console

4. **Token verification fails**
   - Ensure system time is synchronized (JWT tokens are time-sensitive)
   - Check that Google+ API is enabled

### Debug Mode

Enable debug logging by adding to your environment:

```bash
NODE_ENV=development
```

This will log OAuth flow details to help with troubleshooting.

## Migration from Cognito

If you want to migrate existing Cognito users to Google OAuth:

1. Users will need to sign up again with Google OAuth
2. Tenant associations can be preserved by email matching
3. Consider implementing account linking if needed

Both authentication methods can coexist, allowing gradual migration.
