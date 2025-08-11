# Project Keystone Monorepo

Next.js frontend and NestJS backend managed with Nx.

- Frontend: apps/front-ends/cms (Next.js)
- Backend: apps/back-ends/cms-api (NestJS)

## Prerequisites
- Node.js 18+ (Node 20/22/24 OK)
- npm 9+
- No global Nx install required (use npx)

## Install
From the repo root:

```bash
npm install
```

## Run (development)
Open two terminals in the repo root.

- Frontend
  ```bash
  npx nx serve cms
  # http://localhost:4200
  ```

- Backend (watch + auto-restart)
  ```bash
  npx nx dev cms-api
  # http://localhost:3001 (override with PORT env)
  ```

## Build (production artifacts)
- Frontend
  ```bash
  npx nx build cms
  # Output: dist/apps/front-ends/cms
  ```

- Backend
  ```bash
  npx nx build cms-api
  # Output: dist/apps/back-ends/cms-api
  ```

## Run (production)
- Frontend (serve built app)
  ```bash
  # Build first
  npx nx build cms
  # Start in production mode
  npx nx serve cms --dev=false
  ```

- Backend (run compiled JS)
  ```bash
  # Build first
  npx nx build cms-api
  # Then run the compiled entry
  node dist/apps/back-ends/cms-api/src/main.js
  ```

## Lint & Tests
- Lint
  ```bash
  npx nx lint cms
  npx nx lint cms-api
  ```

- Backend tests (from app folder)
  ```bash
  cd apps/back-ends/cms-api
  npm run test        # unit tests
  npm run test:e2e    # e2e tests
  ```

## Nx Utilities
```bash
npx nx show projects   # list projects
npx nx graph           # visualize project graph
```

## Troubleshooting
- Backend port in use (3001):
  ```bash
  lsof -ti :3001 | xargs -r kill -9
  ```
- Error: "Could not find dist ... main.js":
  ```bash
  npx nx build cms-api && npx nx serve cms-api
  ```
- Frontend dev URL: http://localhost:4200
- Backend dev URL: http://localhost:3001

## Repo Layout
```
apps/
  front-ends/
    cms/            # Next.js app
  back-ends/
    cms-api/        # NestJS app
```

## Notes
- Backend dev command uses Nest CLI watch via Nx (`nx dev cms-api`).
- Backend serve command builds then runs compiled JS (`nx serve cms-api`).
- Build outputs are under `dist/apps/...` suitable for CI/CD packaging.