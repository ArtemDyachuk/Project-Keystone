# Render.com Deployment Guide

## **🚨 Important: Monorepo Deployment**

This is a **monorepo** with local package dependencies. Render.com needs to build from the root.

## **🔧 Simple Deployment Configuration**

### **Build Command:**
```bash
npm install && npm run build
```

### **Start Command:**
```bash
cd apps/back-ends/cms-api && npm start
```

### **Root Directory:**
`/` (root of monorepo)

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

## **🚀 What Happens**

1. **npm install** - Installs all dependencies including types
2. **npm run build** - Builds all packages in the right order (turbo handles this)
3. **Start** - Runs the cms-api service

## **🔍 Troubleshooting**

### **Type Definition Errors**

If you see errors like "Cannot find type definition file for 'jsonwebtoken'":

**Solution**: Make sure the build command is `npm install && npm run build` (not just `npm run build`)

### **Module Resolution Errors**

**Solution**: Ensure you're building from the root directory, not from individual packages.

## **✅ Success Indicators**

- Build completes without type errors
- All packages build successfully
- cms-api starts without module resolution errors
