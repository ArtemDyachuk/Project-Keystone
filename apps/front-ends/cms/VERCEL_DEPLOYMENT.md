# Vercel Deployment Guide for CMS Frontend

## 🚀 Quick Setup

### 1. Connect Repository

- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Click "New Project"
- Connect your GitHub repository
- Select the repository: `Project-Keystone`

### 2. Configure Project Settings

- **Root Directory**: `apps/front-ends/cms`
- **Framework Preset**: Next.js
- **Build Command**: `cd ../../../ && npm run build:cms`
- **Output Directory**: `.next`
- **Install Command**: `cd ../../../ && npm install`

### 3. Environment Variables

Add these environment variables in Vercel dashboard:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=keystone
NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com
```

### 4. Deploy

- Click "Deploy"
- Vercel will automatically build and deploy your frontend

## 🔗 Architecture

```
Frontend (Vercel) → Backend (Render.com) → MongoDB Atlas
```

- **Frontend**: Handles UI and direct database operations
- **Backend**: Provides API endpoints and business logic
- **Database**: Shared MongoDB Atlas instance

## 📝 Notes

- Vercel has excellent Turborepo support
- Automatic deployments on git push
- Global CDN included
- Free tier: 100GB bandwidth, 6K build minutes/month

## 🎯 Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
