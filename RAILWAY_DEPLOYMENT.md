# Railway Deployment Guide

Complete deployment guide for Project Keystone NX monorepo with MongoDB Atlas.

## 🚀 **Quick Deployment (2 Services)**

### **1. Create Railway Project**

1. Create new Railway project
2. Create **TWO empty services**:
   - `keystone-frontend` (Next.js)
   - `keystone-backend` (NestJS API)

### **2. Connect GitHub Repo**

- Connect **same GitHub repo** to both services
- **Frontend**: Auto-detected and configured by `apps/front-ends/cms/railway.toml`
- **Backend**: Auto-detected and configured by `apps/back-ends/cms-api/railway.toml`

### **3. Configure Environment Variables**

**Required for BOTH services:**

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=keystone
```

**Frontend Service Variables:**

```bash
# Required for direct database connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=keystone

# Optional: Explicit backend API URL (auto-detected if not set)
NEXT_PUBLIC_API_URL=https://your-backend-service-name.up.railway.app
```

**Note:** The frontend automatically detects the Railway backend using Railway's built-in environment variables:

1. `RAILWAY_SERVICE_URL` (automatic service discovery)
2. `RAILWAY_STATIC_URL` (fallback pattern matching)
3. Falls back to `NEXT_PUBLIC_API_URL` if manually set

**Set in Railway Dashboard:**

1. Go to each service → Variables tab
2. Add `MONGODB_URI` with your MongoDB Atlas connection string
3. Railway automatically sets `NODE_ENV=production`

### **4. Service Configuration (Automatic via railway.toml files)**

**Both services are now automatically configured via their respective `railway.toml` files:**

- **Frontend Service**: Uses `apps/front-ends/cms/railway.toml`
- **Backend Service**: Uses `apps/back-ends/cms-api/railway.toml`

**No manual configuration needed in Railway dashboard!** 🎉

### **5. Deploy**

- Push to main branch
- **Frontend**: Deploys automatically using `apps/front-ends/cms/railway.toml` ✅
- **Backend**: Deploys automatically using `apps/back-ends/cms-api/railway.toml` ✅

## 📁 **What's in the Repo**

- `apps/front-ends/cms/railway.toml` - **Frontend service configuration**
- `apps/back-ends/cms-api/railway.toml` - **Backend service configuration**
- **Both services auto-configured via their respective railway.toml files** ✅
- **Environment variables loaded via `dotenv`** ✅

## 🔗 **Architecture: Two Database Connection Types**

### **1. Direct Database Connection (Frontend → MongoDB)**

- **Purpose**: Simple database operations, health checks
- **Package**: Uses shared `@keystone/database` package
- **Environment Variable**: `MONGODB_URI`
- **Example**: Checking if database is reachable

### **2. Backend API Connection (Frontend → Backend → Database)**

- **Purpose**: Business logic, CRUD operations, authentication
- **Package**: HTTP calls to NestJS backend
- **Environment Variable**: Auto-detected from Railway
- **Example**: Creating tenants, user management

**Why Both?** Direct connection for simple checks, backend API for complex operations.

## ✅ **Service Configuration Architecture**

### **Service-Specific railway.toml Files**

Each service now has its own configuration file for better organization:

- **Frontend**: `apps/front-ends/cms/railway.toml` → Next.js configuration
- **Backend**: `apps/back-ends/cms-api/railway.toml` → NestJS configuration

### **Benefits of This Approach**
- **Clean separation** of concerns
- **Easy to add new services** in the future
- **Each service self-contained** with its own configuration
- **No more auto-detection confusion**
- **Scalable architecture** for monorepos

## ✅ **Production Ready Features**

- **Database**: MongoDB Atlas connection working
- **Environment Variables**: Properly loaded in both services
- **Shared Libraries**: `@keystone/database` and `@keystone/ui` packages
- **Error Handling**: Comprehensive validation and logging
- **Health Checks**: `/api/health` and `/api/database/status` endpoints

## 🐛 **Troubleshooting**

### Database Connection Issues

- Verify `MONGODB_URI` is set in Railway variables
- Check MongoDB Atlas IP whitelist (set to 0.0.0.0/0 for Railway)
- Test connection string format

### Build Failures

- Check `railway.toml` is committed
- Verify NX build commands work locally
- Check dependency versions in package.json

### Environment Variables Not Loading

- Ensure `dotenv` package is installed
- Verify `.env` symlink exists in frontend
- Check Railway variables are set for both services

### Frontend Can't Connect to Backend (ECONNREFUSED ::1:3001)

- **Root Cause**: Frontend is trying to connect to localhost instead of Railway backend
- **Solution**: Set `NEXT_PUBLIC_API_URL` in Railway frontend service variables
- **Alternative**: Frontend auto-detects backend using `RAILWAY_STATIC_URL` (Railway sets this automatically)
- **Debug**: Check `/api/config-debug` endpoint to verify configuration
- **Verify**: Ensure backend service is deployed and running on Railway

### Backend Service Fails to Start (SIGTERM Error)

- **Root Cause**: Backend service crashes during startup or build
- **Common Causes**:
  - Missing environment variables (`MONGODB_URI`)
  - Build failures in NX monorepo
  - Port conflicts or resource limits
- **Solutions**:
  1. Check Railway backend service logs for specific errors
  2. Verify `MONGODB_URI` is set in backend service variables
  3. Ensure backend service has proper build configuration
  4. Check if backend service is using correct port (Railway sets `PORT` automatically)
- **Debug Steps**:
  1. Go to Railway backend service → Deployments tab
  2. Check latest deployment logs for startup errors
  3. Verify environment variables are set correctly
  4. Test backend build locally: `npx nx build @keystone/cms-api`

## 📚 **Useful Railway Commands**

```bash
# View logs
railway logs

# Deploy specific service
railway up --service backend

# Set environment variable
railway variables set MONGODB_URI="your-connection-string"
```

**Need help?** See [Railway Config as Code Guide](https://docs.railway.com/guides/config-as-code)
