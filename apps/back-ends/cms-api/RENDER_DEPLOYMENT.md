# Render.com Deployment Guide for CMS API Backend

## 🚀 Quick Setup

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
- **Build Command**: `cd ../../../ && npm install && npm run build:cms-api`
- **Start Command**: `npm start`

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
- **Health Check Path**: `/api/health` (if implemented)

## 💰 Pricing Tiers

### Free Tier

- ✅ **Cost**: $0/month
- ⚠️ **Cold starts**: 15-minute inactivity timeout
- ⚠️ **Resources**: 512MB RAM, 0.1 CPU
- ⚠️ **Build time**: 750 hours/month limit

### Starter Tier ($7/month)

- ✅ **No cold starts**: Always-on instances
- ✅ **Better resources**: 1GB RAM, 0.5 CPU
- ✅ **Faster builds**: Priority queue

## 🔗 Architecture

```
Frontend (Vercel) → Backend (Render.com) → MongoDB Atlas
```

- **API URL**: `https://keystone-cms-api.onrender.com`
- **Health Check**: `https://keystone-cms-api.onrender.com/api/health`
- **CORS**: Configure for your Vercel frontend domain

## 📝 Deployment Notes

- First deployment takes 5-10 minutes
- Subsequent deployments: 2-3 minutes
- Automatic deployments on git push
- Logs available in dashboard
- SSL certificate included

## 🎯 Post-Deployment

1. Test API endpoints
2. Update frontend's `NEXT_PUBLIC_API_URL` to point to your Render service
3. Configure CORS if needed
4. Monitor performance and upgrade to paid tier when ready
