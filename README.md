## Keystone

Monorepo managed by Nx. The primary frontend is a Next.js app at `apps/front-ends/cms` with Nx project name `@keystone/cms`.

### Prerequisites
- Node.js 20+
- npm 10+

### Install
```sh
npm install
```

### Run CMS (development)
```sh
npx nx dev @keystone/cms
# or choose a port
npx nx dev @keystone/cms -- --port=4201
```

Direct Next.js alternative:
```sh
cd apps/front-ends/cms
npx next dev
```

### Build and run (production)
```sh
npx nx build @keystone/cms
npx nx start @keystone/cms -- --port=4201
```

### Useful tasks
- Lint:
```sh
npx nx lint @keystone/cms
```
- Visualize project graph:
```sh
npx nx graph
```

### Notes
- Next.js config: `apps/front-ends/cms/next.config.js`
- TypeScript config: `apps/front-ends/cms/tsconfig.json`

