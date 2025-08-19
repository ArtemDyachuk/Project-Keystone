# @keystone/auth

**Server-side Firebase authentication** package with Google Identity Platform (GIP) multi-tenancy support for the Keystone monorepo.

## 🚀 **Quick Setup**

### 1. Automated Setup (Recommended)

The setup script will check and install all prerequisites automatically:

```bash
# For development
npm run setup:firebase:dev

# For production  
npm run setup:firebase:prod

# Or run directly
./setup-firebase.sh --stage=dev
./setup-firebase.sh --stage=prod
```

**What the script does:**

- ✅ Checks for required CLIs (gcloud, firebase)
- ✅ Prompts to install missing tools
- ✅ Handles authentication
- ✅ Creates Firebase project with GIP
- ✅ Enables multi-tenancy and MFA TOTP
- ✅ Creates `.env.dev` or `.env.prod` file
- ✅ Outputs all environment variables

### 2. Manual Prerequisites (if needed)

```bash
# Install Google Cloud SDK (macOS)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Install Firebase CLI
npm install -g firebase-tools

# Authenticate
gcloud auth login
firebase login
```

## 🔧 **Usage (Server-side)**

### Basic Authentication

```typescript
import { FirebaseAdminClient } from "@keystone/auth";

const adminClient = new FirebaseAdminClient();

// Create user server-side
const user = await adminClient.createUser({
  email: "user@example.com",
  password: "SecurePass123!",
  displayName: "John Doe"
});

// Verify ID token from client
const user = await adminClient.verifyIdToken(idToken);

// Get user by UID
const user = await adminClient.getUserByUid(uid);

// Generate password reset link
const resetLink = await adminClient.generatePasswordResetLink("user@example.com");
```

### Multi-Tenant Operations

```typescript
// Create user in specific tenant
const user = await adminClient.createUser({
  email: "user@example.com",
  password: "SecurePass123!",
  tenantId: "tenant-123"
});

// Verify token for tenant
const user = await adminClient.verifyIdToken(idToken, "tenant-123");

// Create tenant
const tenant = await adminClient.createTenant({
  tenantId: "tenant-123",
  displayName: "Tenant Name",
  allowPasswordSignup: true,
  enableEmailLinkSignin: false
});

// List all tenants
const tenants = await adminClient.listTenants();
```

## 📋 **What Gets Created**

- **Firebase Project**: Web app with authentication
- **Google Identity Platform**: Multi-tenant authentication support
- **Service Account**: For admin SDK operations
- **APIs Enabled**: Firebase, Identity Toolkit, Hosting
- **Configuration Files**: firebase.json, .firebaserc

## 🏗️ **Infrastructure as Code**

The `setup-firebase.sh` script creates Firebase resources using gcloud CLI:

- No manual Firebase console configuration
- Reproducible across environments  
- Version controlled setup
- Automatic GIP (multi-tenancy) enablement

## 🏢 **Multi-Tenancy Features**

- **Google Identity Platform**: Enterprise-grade multi-tenancy
- **Tenant Isolation**: Users isolated by tenant
- **Tenant-specific Sign-in**: Custom domains per tenant
- **Admin SDK**: Manage tenants programmatically

## 🔐 **Security Features**

- **Email/Password Authentication**: Built-in
- **Email Verification**: Automatic
- **Password Reset**: Secure token-based
- **Service Account**: Secure server-side operations
- **App Check Ready**: Additional security layer

**Perfect for your Vercel + Render.com monorepo!**
