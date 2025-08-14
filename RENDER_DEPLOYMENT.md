# Render.com Deployment Guide

## **🚨 Important: Monorepo Deployment**

This is a **monorepo** with local package dependencies. Render.com needs special configuration to handle this properly.

## **🔧 Deployment Configuration**

### **Option 1: Root-Level Build (Recommended)**

1. **Set Build Command** to: `npm run build`
2. **Set Start Command** to: `cd apps/back-ends/cms-api && npm start`
3. **Set Root Directory** to: `/` (root of monorepo)

### **Option 2: Package-Level Build**

1. **Set Build Command** to: `cd apps/back-ends/cms-api && npm run deploy`
2. **Set Start Command** to: `cd apps/back-ends/cms-api && npm start`
3. **Set Root Directory** to: `/` (root of monorepo)

## **📋 Environment Variables**

Make sure these are set in Render.com:

```bash
MONGODB_URI=your_mongodb_connection_string
AWS_REGION=your_aws_region
COGNITO_USER_POOL_ID=your_cognito_user_pool_id
COGNITO_CLIENT_ID=your_cognito_client_id
COGNITO_CLIENT_SECRET=your_cognito_client_secret
COGNITO_DOMAIN=your_cognito_domain
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

## **🚀 Build Process**

The build process will:

1. **Install dependencies** at root level
2. **Build packages** (`@keystone/auth`, `@keystone/database`)
3. **Build cms-api** with all dependencies available

## **🔍 Troubleshooting**

### **"Cannot find module '@keystone/auth'" Error**

This usually means:
- Packages weren't built before cms-api build
- Module resolution is failing
- Dependencies aren't properly linked

**Solution**: Use **Option 1** (root-level build) as it ensures proper dependency resolution.

### **Build Fails on Dependencies**

**Solution**: Make sure all environment variables are set, especially AWS credentials for Cognito integration.

## **✅ Success Indicators**

- Build completes without errors
- All packages are built successfully
- cms-api starts without module resolution errors
- API endpoints respond correctly
