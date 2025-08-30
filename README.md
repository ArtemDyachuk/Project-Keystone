# Project Keystone 🏗️

A **production-ready** full-stack monorepo built with **Turborepo**, featuring true shared packages between **Next.js** frontend and **NestJS** backend with **MongoDB** database.

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### 🆓 Free Use

- **Personal use**: ✅ Free
- **Educational use**: ✅ Free
- **Contributing to the project**: ✅ Free
- **Modifying for personal use**: ✅ Free

### 💰 Commercial Use

**Commercial use requires a paid license:**

<!-- Pricing is not finalized -->

### 🚨 Important

**Unauthorized commercial use is a violation of the license and subject to legal action.**

For commercial licensing inquiries: [your-email@domain.com]

## 🔐 Why AGPL-3.0?

The AGPL-3.0 license ensures:

- **Code remains open source** and available to the community
- **Modifications must be shared** back to the community
- **Commercial use requires licensing** to support development
- **Legal protection** against unauthorized commercial use

## 🏗️ **True Monorepo Architecture**

```
Frontend (Vercel) ⟷ Shared Packages ⟷ Backend (Render.com) ⟷ MongoDB Atlas
```

- **Frontend**: Next.js CMS with server-side database access (Vercel)
- **Backend**: NestJS API with shared business logic (Render.com)
- **Database**: MongoDB Atlas (shared connection & models)
- **Monorepo**: Turborepo with native Vercel support

## ✨ **Key Features**

- 🚀 **True Shared Packages**: Database models, services, and UI components
- 🏗️ **Server-Side Rendering**: Direct database access in React server components
- 🎨 **Shared UI Library**: CSS Modules-based components with TypeScript
- ⚡ **Turborepo Caching**: Lightning-fast builds with smart dependency tracking
- 🔐 **Type Safety**: End-to-end TypeScript across frontend, backend, and shared code
- 🌐 **Production Deployments**: Vercel (frontend) + Render.com (backend)

## 📁 **Project Structure**

```
Project-Keystone/
├── apps/
│   ├── front-ends/
│   │   └── cms/              # Next.js frontend (Vercel)
│   │       ├── app/
│   │       │   ├── page.tsx           # Server-side DB access
│   │       │   ├── ui-test/           # Shared UI showcase
│   │       │   └── api/               # API routes
│   │       └── lib/
│   └── back-ends/
│       └── cms-api/          # NestJS backend (Render.com)
│           ├── src/
│           │   ├── app/               # Controllers & modules
│           │   └── database/          # Database integration
│           └── RENDER_DEPLOYMENT.md
├── packages/
│   ├── database/             # 🔗 Shared MongoDB package
│   │   ├── src/
│   │   │   ├── connection.ts          # Database connection
│   │   │   ├── models/                # Mongoose models
│   │   │   ├── repositories/          # Data access layer
│   │   │   └── services/              # Business logic
│   │   └── package.json
│   └── ui/                   # 🎨 Shared React components
│       ├── src/
│       │   ├── components/            # Button, Card, Input, etc.
│       │   └── *.module.css           # CSS Modules styling
│       └── package.json
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

| Service           | Free Tier       | Paid Tier     | Usage            |
| ----------------- | --------------- | ------------- | ---------------- |
| **Vercel**        | 100GB bandwidth | $20/month     | Frontend hosting |
| **Render.com**    | Cold starts     | $7/month      | Backend API      |
| **MongoDB Atlas** | 512MB           | $9/month      | Database         |
| **Total**         | **$0/month**    | **$36/month** | Full stack       |

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

### `@keystone/database` - True Database Sharing

**Used by both frontend and backend:**

```typescript
// Frontend server component (app/page.tsx)
import { TenantService, connectToDatabase } from '@keystone/database';

export default async function HomePage() {
  await connectToDatabase();
  const tenants = await TenantService.getAllTenants();
  return <div>Found {tenants.length} tenants</div>;
}

// Backend controller (tenant.controller.ts)
import { TenantService } from '@keystone/database';

@Get()
async findAll() {
  return await TenantService.getAllTenants();
}
```

**Features:**

- 🔗 **Shared Connection Logic**: Single connection configuration
- 📊 **Shared Models**: Mongoose schemas used by both apps
- 🏗️ **Shared Services**: Business logic reused across frontend/backend
- 🔐 **Type Safety**: TypeScript interfaces shared everywhere

### `@keystone/ui` - Shared Component Library

**CSS Modules-based React components:**

```typescript
import { Button, Card, Input } from '@keystone/ui';

<Card title="Example" subtitle="Shared component">
  <Input label="Name" placeholder="Enter name" />
  <Button variant="primary">Submit</Button>
</Card>
```

**Features:**

- 🎨 **CSS Modules**: Scoped styling with TypeScript support
- 🔧 **Variants**: Multiple button/card styles
- ♿ **Accessible**: ARIA labels and keyboard navigation
- 📱 **Responsive**: Mobile-first design

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

## 🎯 **Live Demo Features**

Visit your deployed apps to see these features in action:

### Frontend Features

- **🏠 Homepage**: Server-side database access with shared `TenantService`
- **🎨 UI Test Page**: Showcase of shared UI components (`/ui-test`)
- **🔗 Connection Tests**: Multiple database connection methods
- **📊 Real-time Data**: Server-rendered tenant counts and response times

### Backend Features

- **🔍 Health Check**: `/api/health` - Database connection status
- **👥 Tenant API**: `/api/tenants` - Full CRUD operations
- **🐛 Debug Info**: `/api/tenants/debug` - System information
- **🔒 CORS**: Pre-configured for Vercel frontend

## 🧪 **Testing**

Your multi-tenant CMS has **comprehensive security testing** covering authentication and tenant isolation.

### **🚀 Quick Start**

```bash
# Run all tests (86 tests in ~1 second)
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run security tests only
npm run test:security

# Build safely (tests + build)
npm run build:safe
```

### **📊 Test Coverage**

```
✅ Backend Tests: 48 tests (Authentication, Tenant isolation, API security)
✅ Frontend Tests: 38 tests (Middleware, JWT parsing, Client validation)
✅ Total: 86 security tests covering multi-tenant isolation
```

### **🎯 What We Test**

| Security Area         | Tests    | What It Prevents                          |
| --------------------- | -------- | ----------------------------------------- |
| **Tenant Isolation**  | 32 tests | Users accessing other organizations' data |
| **Authentication**    | 25 tests | Unauthorized access, invalid tokens       |
| **API Security**      | 17 tests | Route protection, request validation      |
| **Attack Prevention** | 12 tests | JWT tampering, cross-tenant attacks       |

### **⚡ Manual Testing (When You Need It)**

Run tests manually:

- **Development**: Watch mode (`npm run test:watch`)
- **Before deploy**: `npm run build:safe` (tests + build)
- **Quick check**: `npm test` (86 tests in 2 seconds)
- **Security focus**: `npm run test:security`

### **📚 Documentation**

Detailed testing guides are in `/documentation/`:

- 🧪 **TESTING_GUIDE.md** - Beginner-friendly testing overview
- 🏢 **MULTI_TENANT_TESTING_GUIDE.md** - Tenant isolation testing
- 🔐 **AUTH_TESTING_GUIDE.md** - Authentication testing strategies
- 🎯 **MANUAL_TESTING.md** - How to run tests manually (deployment-friendly)

## 📝 **Next Steps & Scaling**

### Phase 1: Core Features ✅

- ✅ **Multi-tenant Architecture** - Complete with secure isolation
- ✅ **Authentication & Authorization** - JWT + Cognito integration
- ✅ **Comprehensive Testing** - 86 security tests
- ✅ **Production Deployments** - Vercel + Render.com

### Phase 2: Production Enhancements

- 📈 **Monitoring**: Add logging and analytics
- 🚀 **Performance**: Database indexing and caching
- 🔄 **Integration Tests**: API + Database integration testing
- 🎭 **E2E Tests**: Browser-based user workflow testing

### Phase 3: Advanced Features

- 🔄 **Real-time**: Add WebSocket support
- 📱 **Mobile**: Add React Native app
- 🤖 **Advanced CI/CD**: Enhanced deployment pipelines
- 🌍 **Internationalization**: Multi-language support

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. **Run tests**: `npm test` (must pass)
4. Add tests for new features
5. Make your changes
6. Test thoroughly
7. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.
