# Render.com Deployment Guide for CMS API Backend

## 🚀 **Turborepo-Optimized Setup**

### 1. Create New Web Service

- Go to [Render Dashboard](https://dashboard.render.com/)
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Select the repository: `Project-Keystone`

### 2. Configure Service Settings

- **Name**: `keystone-cms-api`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `apps/back-ends/cms-api`
- **Runtime**: Node
- **Build Command**: `npm run prebuild && npm run build`
- **Start Command**: `npm start`

✅ **Optimized Build Process**: The `prebuild` script automatically builds shared packages first!

### 3. Environment Variables

Add these environment variables in Render dashboard:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=keystone
NODE_ENV=production
PORT=10000
```

### 4. Advanced Settings (Optional)

- **Instance Type**: Free (or Starter $7/month for no cold starts)
- **Auto-Deploy**: Yes
- **Health Check Path**: `/api/health`

## 🏗️ **True Monorepo Architecture**

```
Frontend (Vercel) ⟷ Shared Packages ⟷ Backend (Render.com) ⟷ MongoDB Atlas
```

**Shared Packages in Backend:**

- ✅ **@keystone/database**: MongoDB models, repositories, services
- ✅ **Type Safety**: Shared TypeScript interfaces
- ✅ **Business Logic**: Reusable service layer
- ✅ **Auto-Build**: Shared packages built automatically during deployment

## 💰 **Pricing Tiers**

### Free Tier

- ✅ **Cost**: $0/month
- ⚠️ **Cold starts**: 15-minute inactivity timeout (API sleeps after 15min)
- ⚠️ **Resources**: 512MB RAM, 0.1 CPU
- ⚠️ **Build time**: 750 hours/month limit

### Starter Tier ($7/month) - **Recommended for Production**

- ✅ **No cold starts**: Always-on instances
- ✅ **Better resources**: 1GB RAM, 0.5 CPU
- ✅ **Faster builds**: Priority queue
- ✅ **Better performance**: Sub-second API responses

## 🔗 **API Architecture**

**Available Endpoints:**

- **Health Check**: `https://keystone-cms-api.onrender.com/api/health`
- **Tenants**: `https://keystone-cms-api.onrender.com/api/tenants`
- **Debug Info**: `https://keystone-cms-api.onrender.com/api/tenants/debug`

**CORS Configuration:**

```typescript
// Automatically configured for:
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://*.vercel.app',
    'https://your-domain.com'
  ]
});
```

## 📝 **Deployment Process**

### Build Steps (Automatic)

1. **Install Dependencies**: `npm install` in monorepo root
2. **Build Shared Database**: `npm run prebuild` (builds `@keystone/database`)
3. **Build API**: `npm run build` (compiles TypeScript)
4. **Start Server**: `npm start` (runs compiled JavaScript)

### Timing

- **First deployment**: ~5-10 minutes
- **Incremental deployments**: ~2-4 minutes
- **Automatic**: On every git push to main

## 🔧 **Troubleshooting**

### Build Failures

**Common Issue**: `Cannot find module '@keystone/database'`
**Solution**: The `prebuild` script should handle this automatically. If it fails:

1. Check the `package.json` has `"prebuild": "cd ../../../packages/database && npm run build"`
2. Verify the shared package builds successfully

### Performance Issues

- **Cold Starts**: Consider upgrading to Starter tier for production
- **Memory**: Monitor usage in Render dashboard
- **Database**: Ensure MongoDB connection pooling is configured

### CORS Issues

Update the CORS configuration in `src/main.ts` to include your domains:

```typescript
app.enableCors({
  origin: ['https://your-vercel-app.vercel.app']
});
```

## 🎯 **Post-Deployment Checklist**

1. ✅ **Test API endpoints** - Visit health check URL
2. ✅ **Update frontend** - Set `NEXT_PUBLIC_API_URL` in Vercel
3. ✅ **Verify CORS** - Test frontend → backend communication
4. ✅ **Monitor logs** - Check Render dashboard for errors
5. ✅ **Performance** - Consider upgrading for production workloads

## 🚀 **Production Recommendations**

- **Upgrade to Starter**: Eliminates cold starts ($7/month)
- **Monitor Performance**: Use Render's built-in metrics
- **Database Indexing**: Optimize MongoDB queries
- **Caching**: Consider Redis for session/cache data
- **Logging**: Implement structured logging for debugging
