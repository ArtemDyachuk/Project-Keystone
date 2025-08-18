# Keystone CMS Frontend

A modern CMS built with Next.js 15 and Stytch authentication.

## 🚀 **Features**

- **Modern Next.js 15** - App Router, Server Components, TypeScript
- **Stytch Authentication** - Official OAuth integration with hosted login
- **Responsive Design** - Mobile-first, accessible UI components
- **CMS Dashboard** - Content management interface
- **Multi-tenant Ready** - Tenant management system (stubbed)

## 🔐 **Authentication**

This app uses the **official Stytch Next.js package** for authentication:

- **OAuth Flow** - Secure OAuth 2.0 with hosted Stytch login
- **Session Management** - Stytch handles sessions automatically
- **Protected Routes** - Middleware-based route protection
- **User Management** - Built-in user data and permissions

## 🛠 **Tech Stack**

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Authentication**: @stytch/nextjs
- **UI Components**: @keystone/ui
- **Database**: MongoDB (via @keystone/database)

## 📦 **Installation**

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Environment variables** - Create `.env.local`:

   ```bash
   # Stytch Configuration
   STYTCH_CLIENT_ID=your-project-id
   STYTCH_CLIENT_SECRET=your-client-secret
   
   # Application URLs
   APP_URL=http://localhost:3000
   
   # Environment
   NODE_ENV=development
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

## 🔧 **Stytch Setup**

1. **Create Stytch project** at [stytch.com](https://stytch.com)
2. **Enable OAuth** in your project settings
3. **Add redirect URL**: `http://localhost:3000/api/auth/callback`
4. **Copy project ID and secret** to your `.env.local`

## 🧪 **Testing**

- **Login**: Visit `/login` and click "Sign in with Stytch"
- **Dashboard**: Protected route at `/dashboard`
- **Logout**: Available in dashboard header

## 📁 **Project Structure**

```
app/
├── (auth)/          # Authentication pages
├── (cms)/           # Protected CMS routes
├── (public)/        # Public pages
├── api/             # API routes
│   └── auth/        # Authentication endpoints
├── components/       # Reusable components
└── lib/             # Utilities and config
```

## 🔄 **Migration Notes**

This app was migrated from a custom OIDC implementation to the official Stytch package for:

- ✅ **Better support** - Official Stytch maintenance
- ✅ **Simplified code** - Less custom implementation
- ✅ **Built-in features** - Session management, error handling
- ✅ **Easier updates** - Stytch handles OAuth complexity

## 📚 **Documentation**

- [Stytch Next.js Documentation](https://stytch.com/docs/sdks)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Keystone UI Components](https://github.com/your-org/keystone-ui)
