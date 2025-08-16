# Google Identity Platform (Firebase Auth) Setup Guide

This guide explains how to set up Google Identity Platform using Firebase Authentication as a complete alternative to AWS Cognito, providing full user management, multi-tenancy, and RBAC capabilities.

## Overview

**Google Identity Platform** (via Firebase) provides:

- ✅ **User Management**: Create, read, update, delete users
- ✅ **Email/Password Authentication**: Traditional signup/signin
- ✅ **Multi-tenancy**: Via custom claims and Firestore
- ✅ **RBAC**: Role-based access control via custom claims
- ✅ **MFA**: Multi-factor authentication support
- ✅ **Admin Dashboard**: Firebase Console for user management
- ✅ **Server-side Authentication**: Firebase Admin SDK

## Prerequisites

1. **Google Cloud Platform Account**
2. **Firebase Project** (can be created for free)

## Step 1: Create Firebase Project

### 1.1 Create Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name (e.g., "keystone-identity-platform")
4. Enable Google Analytics (optional)
5. Click **"Create project"**

### 1.2 Enable Authentication

1. In your Firebase project, go to **"Authentication"**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"** provider
5. Click **"Save"**

### 1.3 Enable Firestore (for user data)

1. Go to **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select your preferred location
5. Click **"Done"**

## Step 2: Get Firebase Configuration

### 2.1 Web App Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"** section
3. Click **"Add app"** → **Web** (`</>`
4. Register app (e.g., "Keystone CMS")
5. Copy the **Firebase config object**:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 2.2 Admin SDK Configuration

1. In Firebase Console, go to **Project Settings** → **"Service accounts"**
2. Click **"Generate new private key"**
3. Save the JSON file securely
4. Extract these values:
   - `project_id`
   - `private_key`
   - `client_email`

## Step 3: Environment Configuration

### 3.1 Client-side Environment Variables (.env.local)

```bash
# Firebase Web App Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### 3.2 Production Environment

For deployment platforms (Vercel, Render, etc.), add the same environment variables to your deployment settings.

**Important**: For `FIREBASE_PRIVATE_KEY`, replace actual newlines with `\n` in the environment variable.

## Step 4: User Management Features

### 4.1 Admin Dashboard

- **Firebase Console** → **Authentication** → **Users**
- View all users, disable accounts, delete users
- See user metadata, sign-in history
- Manually verify email addresses

### 4.2 User Operations

```typescript
// Create user (server-side)
const userRecord = await createFirebaseUser(email, password, {
  firstName: "John",
  lastName: "Doe"
});

// Get user data (server-side)
const user = await getFirebaseUser(uid);

// Delete user (server-side)
await deleteFirebaseUser(uid);
```

### 4.3 Custom Claims (for Multi-tenancy & RBAC)

```typescript
// Set user claims for multi-tenancy
await updateUserClaims(uid, {
  tenantIds: ["tenant1", "tenant2"],
  selectedTenantId: "tenant1",
  role: "admin"
});
```

## Step 5: Multi-Tenancy Implementation

### 5.1 Custom Claims Approach

- Store tenant associations in Firebase custom claims
- Claims are included in JWT tokens automatically
- No additional database queries needed for tenant checks

### 5.2 Firestore Data Structure

```
users/
  {uid}/
    email: "user@example.com"
    firstName: "John"
    lastName: "Doe"
    tenantIds: ["tenant1", "tenant2"]
    selectedTenantId: "tenant1"
    role: "admin"

tenants/
  {tenantId}/
    name: "Acme Corp"
    adminUsers: [uid1, uid2]
    settings: {...}
```

## Step 6: Security Rules

### 6.1 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tenant access based on custom claims
    match /tenants/{tenantId} {
      allow read, write: if request.auth != null 
        && tenantId in request.auth.token.tenantIds;
    }
  }
}
```

## Step 7: Testing the Implementation

### 7.1 Test User Creation

1. Start your dev server: `npm run dev`
2. Go to signup page: `http://localhost:3000/signup`
3. Create a test user
4. Check Firebase Console → Authentication → Users

### 7.2 Test Authentication

1. Sign in with the created user
2. Verify JWT tokens are set in cookies
3. Check that user data is properly extracted

### 7.3 Test Multi-tenancy

1. Create a tenant for the user
2. Verify tenant isolation works
3. Test switching between tenants

## Step 8: Production Deployment

### 8.1 Update Security Rules

Change Firestore rules from "test mode" to production rules:

```javascript
// Production security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 8.2 Environment Variables

- Add all Firebase environment variables to your production deployment
- Ensure `FIREBASE_PRIVATE_KEY` is properly formatted
- Test authentication in production environment

## Advantages Over AWS Cognito

1. **Better Multi-tenancy**: Custom claims vs. limited user groups
2. **Full User Management**: Complete admin interface
3. **No User Pool Limits**: Unlimited users
4. **Better Developer Experience**: Comprehensive SDKs
5. **Integrated Database**: Firestore for additional user data
6. **Real-time Capabilities**: Firestore real-time updates
7. **Cost-effective**: Free tier with generous limits
8. **Google Ecosystem**: Integrates with other Google services

## Migration from Cognito

If migrating from AWS Cognito:

1. **User Data**: Export users from Cognito, import to Firebase
2. **JWT Tokens**: Update JWT verification to use Firebase
3. **Database**: Migrate user data to Firestore
4. **Environment**: Update environment variables
5. **Testing**: Comprehensive testing of auth flows

## Troubleshooting

### Common Issues

1. **"Firebase not initialized"**
   - Check environment variables are set correctly
   - Verify Firebase config object is complete

2. **"Permission denied"**
   - Check Firestore security rules
   - Verify user authentication

3. **"Private key invalid"**
   - Ensure `FIREBASE_PRIVATE_KEY` has proper newline formatting
   - Check that the service account key is valid

4. **"Project not found"**
   - Verify `FIREBASE_PROJECT_ID` matches your Firebase project
   - Check that the project exists and is active

### Debug Mode

Add this to your environment for detailed logging:

```bash
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIRESTORE_EMULATOR_HOST=localhost:8080
```

## Support and Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Console](https://console.firebase.google.com/)
