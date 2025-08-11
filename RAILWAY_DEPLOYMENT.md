# Railway Deployment Guide

Super simple deployment for the Project Keystone NX monorepo.

## 🚀 Simple Deployment Process

### For Both Frontend AND Backend:

1. **Create empty Railway project**
2. **Create two empty services** (one for frontend, one for backend)
3. **Connect the same GitHub repo to both services**
4. **Done!** ✅

Railway automatically detects and builds each service using NX.

## 📁 What's in the Repo

- `railway.toml` - Auto-configures the frontend service
- Railway auto-detects the backend service using NX

## ⚠️ Troubleshooting

**"No start command found" error?**
- Check `railway.toml` is in repo root
- Ensure file is committed and pushed
- Look for file icon in Railway deployment details

**Need help?** See [Railway Config as Code Guide](https://docs.railway.com/guides/config-as-code)
