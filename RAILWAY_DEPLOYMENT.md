# Railway Deployment Guide for NX Monorepo

This document outlines the Railway deployment configuration for the Project Keystone NX monorepo containing Next.js frontend and NestJS backend.

## Current Setup

### Frontend Service (@keystone/cms)
- **Technology**: Next.js 15.2.4 + React 19
- **Build System**: NX with custom webpack configuration
- **Deployment**: Railway using Config-as-Code (`railway.toml`)

### Configuration Files

#### `railway.toml` (Frontend Service)
```toml
# Railway Config as Code
# Frontend service configuration for Next.js app in NX monorepo
# Service: @keystone/cms

[build]
builder = "nixpacks"
buildCommand = "npx nx build @keystone/cms"

[deploy]
startCommand = "cd apps/front-ends/cms && npx next start -p $PORT"
restartPolicyType = "on_failure"
healthcheckPath = "/"
healthcheckTimeout = 300
```

## Key Deployment Patterns

### 1. **Shared Monorepo Pattern**
- Root directory: `.` (repository root)
- Dependencies installed at monorepo level
- NX handles build orchestration

### 2. **NX Build Commands**
- Use direct NX commands: `npx nx build @keystone/cms`
- Let Railway's Nixpacks handle `npm ci` automatically
- Avoid combining install + build in single command

### 3. **Next.js Production Start**
- Use `next start` for production serving
- Navigate to app directory first: `cd apps/front-ends/cms`
- Pass PORT environment variable: `-p $PORT`

## Backend Service Setup (Future)

For the backend service (@keystone/cms-api), create a separate Railway service with:

```toml
# railway.toml for backend service
[build]
builder = "nixpacks"
buildCommand = "npx nx build @keystone/cms-api"

[deploy]
startCommand = "node apps/back-ends/cms-api/dist/main.js"
restartPolicyType = "on_failure"
healthcheckPath = "/health"
healthcheckTimeout = 300
```

## Best Practices Learned

### ✅ Do:
- Use single `railway.toml` per service
- Follow official Railway Config-as-Code format
- Use `[build]` and `[deploy]` sections
- Let Nixpacks handle dependency installation
- Add health checks and restart policies

### ❌ Don't:
- Mix `nixpacks.toml` with `railway.toml`
- Use `[[services]]` syntax for single services
- Combine install and build commands
- Use `npx nx serve` in production

## Troubleshooting

### "No start command found" Error
- Ensure `railway.toml` is in repository root
- Check syntax matches Railway documentation exactly
- Verify service name matches NX project name
- Confirm startCommand includes proper directory navigation

### Config Not Applied
- Check for file icon in Railway deployment details
- Ensure configuration file is committed and pushed
- Verify no conflicting manual settings in dashboard
- Try redeploying after config changes

## Resources

- [Railway Config as Code Guide](https://docs.railway.com/guides/config-as-code)
- [Railway Monorepo Deployment Tutorial](https://docs.railway.com/tutorials/deploying-a-monorepo)
- [NX Monorepo Railway Blog Post](https://medium.com/@hoseanganga27/how-to-deploy-an-nx-monorepo-angular-nestjs-to-railway-with-neon-for-postgresql-full-guide-c3f90ed28d5a)
