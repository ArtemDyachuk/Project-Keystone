# Project Keystone 🏗️

A modern full-stack monorepo built with **Turborepo**, featuring a **Next.js** frontend and **NestJS** backend with **MongoDB** database.

## 🏗️ **Architecture**

```
Frontend (Vercel) → Backend (Render.com) → MongoDB Atlas
```

- **Frontend**: Next.js CMS hosted on Vercel
- **Backend**: NestJS API hosted on Render.com  
- **Database**: MongoDB Atlas (shared)
- **Monorepo**: Turborepo for build optimization

## 📁 **Project Structure**

```
Project-Keystone/
├── apps/
│   ├── front-ends/
│   │   └── cms/              # Next.js frontend
│   └── back-ends/
│       └── cms-api/          # NestJS backend
├── packages/
│   ├── database/             # Shared MongoDB connection
│   └── ui/                   # Shared React components
├── turbo.json               # Turborepo configuration
└── package.json            # Root workspace
```

## 🚀 **Quick Start**

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd Project-Keystone

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI
```

### Development

```bash
# Start all services
npm run dev

# Start individual services
npm run dev:cms        # Frontend only
npm run dev:cms-api    # Backend only

# Build all services
npm run build

# Build individual services
npm run build:cms      # Frontend only
npm run build:cms-api  # Backend only
```

## 🌐 **Deployment**

### Frontend (Vercel) - FREE

1. Deploy to Vercel using the configuration in `apps/front-ends/cms/`
2. See: [Vercel Deployment Guide](apps/front-ends/cms/VERCEL_DEPLOYMENT.md)

### Backend (Render.com) - FREE/PAID

1. Deploy to Render.com using the configuration in `apps/back-ends/cms-api/`
2. See: [Render Deployment Guide](apps/back-ends/cms-api/RENDER_DEPLOYMENT.md)

## 💰 **Cost Breakdown**

| Service | Free Tier | Paid Tier | Usage |
|---------|-----------|-----------|-------|
| **Vercel** | 100GB bandwidth | $20/month | Frontend hosting |
| **Render.com** | Cold starts | $7/month | Backend API |
| **MongoDB Atlas** | 512MB | $9/month | Database |
| **Total** | **$0/month** | **$36/month** | Full stack |

## 🔧 **Environment Variables**

### Required for Both Services

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

### Frontend Additional

```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

## 📦 **Shared Packages**

### `@keystone/database`

MongoDB connection and models used by both frontend and backend.

### `@keystone/ui`  

Shared React components for consistent UI across applications.

## 🎯 **Key Features**

- ✅ **Turborepo**: Fast builds with smart caching
- ✅ **TypeScript**: Full type safety across the stack
- ✅ **Shared packages**: Reusable code between apps
- ✅ **Modern deployment**: Vercel + Render.com
- ✅ **Free tier friendly**: Start at $0/month
- ✅ **Scalable**: Easy to add more apps/APIs

## 🛠️ **Development Commands**

```bash
# Install dependencies
npm install

# Development
npm run dev                    # All services
npm run dev:cms               # Frontend only
npm run dev:cms-api           # Backend only

# Building
npm run build                 # All services
npm run build:cms             # Frontend only
npm run build:cms-api         # Backend only

# Type checking
npm run type-check            # All services

# Linting
npm run lint                  # All services

# Testing
npm run test                  # All services
```

## 🔄 **Adding New Apps**

1. Create new app in `apps/front-ends/` or `apps/back-ends/`
2. Add package.json with build scripts
3. Update root package.json scripts if needed
4. Turborepo automatically detects and caches new apps

## 📝 **Next Steps**

1. **Authentication**: Add AWS Cognito integration
2. **More APIs**: Add additional backend services
3. **Multi-tenancy**: Implement tenant isolation
4. **Monitoring**: Add logging and analytics
5. **Testing**: Add comprehensive test suites

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.
