# @keystone/auth

Simple AWS Cognito authentication package for the Keystone monorepo.

## 🚀 **Quick Setup**

### 1. Configure AWS

```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Format (json)
```

### 2. Create Cognito

```bash
npm run setup:cognito
```

### 3. Copy Environment Variables

The script outputs all the variables you need. Copy them to:

**Local (.env.local)**:

```bash
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=keystone-development-auth
AWS_REGION=us-east-1
```

**Vercel Dashboard**:

```bash
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=keystone-development-auth
AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=https://keystone-development-auth.auth.us-east-1.amazoncognito.com
```

**Render Dashboard**:

```bash
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=keystone-development-auth
AWS_REGION=us-east-1
```

## 🔧 **Usage**

### Sign Up with Email + 6-Digit Code

```typescript
import { getCognitoConfig, CognitoAuthClient } from "@keystone/auth";

const config = await getCognitoConfig();
const authClient = new CognitoAuthClient(config);

// Sign up - 6-digit code sent automatically to email
await authClient.signUp({
  email: "user@example.com",
  password: "SecurePass123!",
  givenName: "John",
  familyName: "Doe"
});

// Confirm with 6-digit code from email
await authClient.confirmSignUp({
  email: "user@example.com",
  confirmationCode: "123456"
});

// Sign in
const tokens = await authClient.signIn({
  email: "user@example.com",
  password: "SecurePass123!"
});
```

### Verify JWT Tokens (Backend)

```typescript
import { verifyJwtToken, getCognitoConfig } from "@keystone/auth";

const config = await getCognitoConfig();
const user = await verifyJwtToken(token, config.userPoolId, config.region);
```

## 📋 **What Gets Created**

- **User Pool**: Email sign-in with 6-digit verification
- **App Client**: Server-side authentication ready
- **Domain**: OAuth hosted UI
- **Security**: Strong password policy, proper OAuth flows

## 🏗️ **Infrastructure as Code**

The `setup-cognito.sh` script creates AWS resources using AWS CLI:

- No manual AWS console configuration
- Reproducible across environments
- Version controlled setup

**Perfect for your Vercel + Render.com monorepo!**
