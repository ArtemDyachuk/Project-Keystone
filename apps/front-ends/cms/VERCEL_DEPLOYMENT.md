# Vercel Deployment Guide for CMS Frontend

## 🚀 **Quick Setup with Native Turborepo Support**

### 1. Connect Repository

- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Click "New Project"
- Connect your GitHub repository
- Select the repository: `Project-Keystone`

### 2. Configure Project Settings

✅ **Use Vercel's Native Turborepo Support** - No custom build commands needed!

- **Root Directory**: `/` (Leave blank - Vercel detects Turborepo automatically)
- **Framework Preset**: Next.js
- **Build Command**: *(Leave blank - Vercel auto-detects)*
- **Output Directory**: *(Leave blank - Vercel auto-detects)*
- **Install Command**: *(Leave blank - Vercel auto-detects)*

### 3. **Important**: Set the Focused Package

In the project settings, under **Build & Development Settings**:

- **Package.json Location**: `apps/front-ends/cms`

This tells Vercel which app to deploy from the monorepo.

### 4. Environment Variables

Add these environment variables in Vercel dashboard:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=keystone
NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com
```

### 5. Deploy

- Click "Deploy"
- Vercel automatically:
  - Detects Turborepo
  - Builds shared packages (`@keystone/database`, `@keystone/ui`)
  - Builds the CMS frontend
  - Deploys everything seamlessly

## 🏗️ **True Monorepo Architecture**

```
Frontend (Vercel) ⟷ Shared Packages ⟷ Backend (Render.com) ⟷ MongoDB Atlas
```

**Key Features:**

- ✅ **Shared Database Package**: Real-time database access from frontend
- ✅ **Shared UI Components**: CSS Modules-based components
- ✅ **Server-Side Rendering**: Direct database queries in server components
- ✅ **Type Safety**: Shared TypeScript types across frontend/backend
- ✅ **Turborepo Caching**: Lightning-fast builds

## 🎯 **Advanced Features**

### Server-Side Database Access

Your frontend can now directly access the database:

```typescript
// In app/page.tsx (Server Component)
import { TenantService, connectToDatabase } from '@keystone/database';

export default async function HomePage() {
  await connectToDatabase();
  const tenants = await TenantService.getAllTenants();
  
  return <div>Found {tenants.length} tenants</div>;
}
```

### Shared UI Components

Use your shared components anywhere:

```typescript
import { Button, Card, Input } from '@keystone/ui';
```

## 📝 **Deployment Notes**

- **Build Time**: ~30-60 seconds (thanks to Turborepo caching)
- **Automatic Deployments**: On every git push to main
- **Preview Deployments**: Automatic for pull requests
- **Global CDN**: Sub-100ms response times worldwide
- **Free Tier**: 100GB bandwidth, unlimited sites

## 🔧 **Troubleshooting**

### Build Failures

If you see module resolution errors:

1. Ensure `Package.json Location` is set to `apps/front-ends/cms`
2. Verify shared packages are building correctly
3. Check environment variables are set

### Performance Issues

- Turborepo automatically caches unchanged packages
- Only modified packages are rebuilt
- Typical incremental builds: ~10-20 seconds

## 🎯 **Custom Domain (Optional)**

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned
