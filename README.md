# Project Keystone

NX monorepo with Next.js frontend and NestJS backend.

## Quick Start

```bash
npm install
```

**Run in separate terminal tabs:**

```bash
# Terminal 1 - Frontend
npx nx dev @keystone/cms --port=4201

# Terminal 2 - Backend  
npx nx serve @keystone/cms-api
```

## Prerequisites

- **Node.js 22 LTS** (use `nvm use` if you have nvm)
- **npm 10+**

### One-time Setup (macOS/Linux)

```bash
echo 'export NX_SOCKET_DIR=/tmp/nx-tmp' >> ~/.zshrc
source ~/.zshrc  # or restart terminal
```

This fixes NX socket path issues on systems with long directory paths.

## Applications

### Frontend (`@keystone/cms`)

- **Tech**: Next.js 15 + React 19
- **Location**: `apps/front-ends/cms/`
- **Port**: 4201
- **Dev**: `npx nx dev @keystone/cms --port=4201`
- **Build**: `npx nx build @keystone/cms`

### Backend (`@keystone/cms-api`)  

- **Tech**: NestJS 11 + Node.js
- **Location**: `apps/back-ends/cms-api/`
- **Port**: 3001 (default)
- **Dev**: `npx nx serve @keystone/cms-api`
- **Build**: `npx nx build @keystone/cms-api`

## Deployment

**Railway**: Automatic deployment via `railway.toml` configuration.

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for details.

## Development

```bash
# Install dependencies
npm install

# Start services
npx nx dev @keystone/cms --port=4201      # Frontend on http://localhost:4201
npx nx serve @keystone/cms-api            # Backend on http://localhost:3001

# Build for production
npx nx build @keystone/cms
npx nx build @keystone/cms-api

# Run tests
npx nx test @keystone/cms
npx nx test @keystone/cms-api

# Lint code
npx nx lint @keystone/cms
npx nx lint @keystone/cms-api

# View project graph
npx nx graph
```
