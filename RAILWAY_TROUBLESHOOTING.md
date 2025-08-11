# Railway Troubleshooting Guide

## 🚨 **Current Issue: Backend Service Not Starting**

### **Symptoms**
- Frontend shows: "Error fetching database status: Failed to fetch database status"
- Backend logs show: "npm error signal SIGTERM"
- Frontend is correctly detecting Railway backend URL: `https://project-keystone-production.up.railway.app/api/health`

### **Root Cause**
Backend service (`cms-api`) is failing to start or stay running on Railway.

## 🔍 **Step-by-Step Debugging**

### **1. Check Backend Service Status**
1. Go to Railway Dashboard
2. Find your **backend service** (should be named something like `cms-api` or similar)
3. Check if it shows as "Running" or "Stopped"

### **2. Check Backend Service Logs**
1. Click on backend service
2. Go to "Deployments" tab
3. Click on latest deployment
4. Look for error messages during startup

### **3. Verify Backend Environment Variables**
1. Go to backend service → "Variables" tab
2. Ensure `MONGODB_URI` is set correctly
3. Check if `PORT` is set (Railway should set this automatically)

### **4. Check Backend Build Configuration**
1. Verify backend service is connected to the same GitHub repo
2. Check if Railway auto-detected the NestJS service correctly
3. Look for build errors in deployment logs

## 🛠️ **Common Fixes**

### **Fix 1: Missing MONGODB_URI**
```bash
# In Railway backend service variables
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=keystone
```

### **Fix 2: Backend Service Not Auto-Detected**
1. Delete backend service
2. Create new empty service
3. Connect to same GitHub repo
4. Railway should auto-detect NestJS

### **Fix 3: Port Configuration Issues**
- Railway automatically sets `PORT` environment variable
- Don't manually set port in backend service
- Ensure backend code uses `process.env.PORT`

## 📋 **Checklist for Backend Service**

- [ ] Service shows as "Running" in Railway
- [ ] `MONGODB_URI` environment variable is set
- [ ] No build errors in deployment logs
- [ ] Service responds to health checks
- [ ] Port configuration is automatic (don't set manually)

## 🧪 **Test Backend Locally**

Before deploying to Railway, test locally:

```bash
cd /Users/artemdyachuk/DEV/Project-Keystone
npx nx build @keystone/cms-api
node apps/back-ends/cms-api/dist/main.js
```

Then test health endpoint:
```bash
curl http://localhost:3001/api/health
```

## 🚀 **Deployment Order**

1. **Fix backend service first** - ensure it starts and runs
2. **Verify backend health** - test `/api/health` endpoint
3. **Deploy frontend** - should now connect to working backend
4. **Test full flow** - frontend → backend → database

## 📞 **Next Steps**

1. Check backend service status in Railway
2. Look at backend deployment logs for specific errors
3. Verify environment variables are set correctly
4. Test backend locally to ensure it works
5. Redeploy backend service if needed

**The frontend configuration is now correct - the issue is with the backend service startup.**
