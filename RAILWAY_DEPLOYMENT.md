# Railway Deployment Guide

Quick guide for deploying the Project Keystone NX monorepo to Railway.

## 🚀 Quick Deployment

### For New Railway Account/Customer:
1. **Create new Railway project** (empty project)
2. **Connect this GitHub repo**
3. **Railway auto-deploys** using `railway.toml` ✅

That's it! The `railway.toml` file handles all configuration automatically.

## 📁 Current Configuration

The repo contains a `railway.toml` file that configures the frontend service:

```toml
[build]
builder = "nixpacks"
buildCommand = "npx nx build @keystone/cms"

[deploy]
startCommand = "cd apps/front-ends/cms && npx next start -p $PORT"
restartPolicyType = "on_failure"
healthcheckPath = "/"
healthcheckTimeout = 300
```

## 🔧 For Backend Service (Future)

When ready to deploy the backend:
1. Create separate Railway service
2. Add this `railway.toml` in the backend service:

```toml
[build]
builder = "nixpacks"
buildCommand = "npx nx build @keystone/cms-api"

[deploy]
startCommand = "node apps/back-ends/cms-api/dist/main.js"
restartPolicyType = "on_failure"
healthcheckPath = "/health"
```

## ⚠️ Troubleshooting

**"No start command found" error?**
- Check `railway.toml` is in repo root
- Ensure file is committed and pushed
- Look for file icon in Railway deployment details

**Need help?** See [Railway Config as Code Guide](https://docs.railway.com/guides/config-as-code)
