# Phase 01 — Scaffold

## Overview

Initial monorepo setup for the Koryla project. This phase establishes the workspace structure, installs all tooling, and configures the Nuxt 4 dashboard app with Tailwind v4, the Supabase module, and developer-experience tooling (husky, lint-staged, vitest, Playwright).

The goal is a working development environment where `pnpm dev` starts the dashboard, `pnpm worker:dev` starts the Cloudflare Worker emulator, and `pnpm test` runs the test suite — all from the repo root.

---

## Why

**pnpm workspaces over npm/yarn:** Symlink-based installs mean `@koryla/core` is available to `@koryla/next` without publishing to npm. `pnpm` also has better support for monorepos with `--filter` flags and `pnpm-workspace.yaml`.

**Nuxt 4 over Next.js for the dashboard:** The product itself is framework-agnostic (adapters exist for Next, Netlify, Node), so the dashboard stack was chosen for developer ergonomics. Nuxt 4's file-based routing, auto-imports, and Nitro server routes reduce boilerplate significantly. The Supabase community module (`@nuxtjs/supabase`) provides server-side helpers (`serverSupabaseUser`) that simplify auth in API routes.

**Tailwind v4 (Vite plugin) over v3:** Tailwind v4 ships as a Vite plugin (`@tailwindcss/vite`). There is no `tailwind.config.js` — configuration lives in CSS via `@theme {}` directives. This eliminates one config file and integrates directly with Nuxt's Vite pipeline.

**Netlify for dashboard hosting:** The Nuxt app deploys to Netlify as a serverless Nitro app. `netlify.toml` is at the root with `[build] command = "pnpm build"`.

---

## What Was Built

| File | Description |
|------|-------------|
| `pnpm-workspace.yaml` | Declares workspaces: `app`, `worker`, `plugin`, `plugin/packages/*`, `test-site` |
| `package.json` (root) | Root scripts: `dev`, `build`, `test`, `worker:dev`, `worker:deploy`, `test-site:*`. Engines: Node >=20, pnpm >=9. pnpm overrides: `cookie ^0.7.0` (security patch). |
| `app/nuxt.config.ts` | Full Nuxt 4 config (see details below) |
| `app/assets/css/main.css` | Tailwind v4 entry: `@import "tailwindcss"` + `@theme {}` with Inter font and brand color |
| `app/package.json` | App dependencies and `lint-staged` config |
| `app/.husky/pre-commit` | Runs `pnpm exec lint-staged` |

### `nuxt.config.ts` key settings

```ts
// .env is at repo root, app/ subdirectory needs explicit path resolution
loadEnv({ path: resolve(__dirname, '../.env') })

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },     // Tailwind v4 Vite plugin
  modules: ['@nuxtjs/supabase', '@nuxt/content'],
  supabase: {
    redirect: false,                       // manual redirect control
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/signup', '/login', '/verify-email'],
    },
    clientOptions: {
      auth: { flowType: 'implicit' },      // required for Google OAuth hash tokens
    },
  },
  routeRules: {
    '/dashboard/**': { ssr: false },       // dashboard is SPA (uses Supabase client auth)
  },
  runtimeConfig: {
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    stripeSecretKey: ...,
    workerSecret: ...,
    public: { appUrl: process.env.NUXT_PUBLIC_APP_URL },
  },
})
```

### `lint-staged` config (in `app/package.json`)

```json
{
  "lint-staged": {
    "**/*.{ts,vue}": ["vitest related --run"],
    "**/*.{ts,vue,json,md}": ["prettier --write"]
  }
}
```

Pre-commit: runs related vitest tests + prettier on staged files.

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'app'
  - 'worker'
  - 'plugin'
  - 'plugin/packages/*'
  - 'test-site'
allowBuilds:
  '@parcel/watcher': false
  better-sqlite3: true   # used by Nuxt Content's SQLite cache
  esbuild: true
  sharp: false
  workerd: true          # Cloudflare's Worker runtime
```

---

## Key Decisions

**`dotenv` loaded manually in `nuxt.config.ts`:** Nuxt's built-in `.env` loading looks for the file relative to the project root (which is `app/` when running `nuxt dev`). Since the `.env` is at the monorepo root, `dotenv` is imported and called with an explicit path: `loadEnv({ path: resolve(__dirname, '../.env') })`.

**`/dashboard/**` as SPA:** Dashboard routes use `{ ssr: false }` to disable SSR. This is intentional — the dashboard relies on Supabase client-side auth state. SSR would require passing session tokens server-side on every request, which is more complex for the current auth flow.

**`@nuxt/content` included from day one:** The integrations page (`/dashboard/[slug]/integrations`) uses `@nuxt/content`'s MDC syntax highlighting for code snippets. Highlight theme: `github-dark`. Supported languages: `js`, `ts`, `php`, `bash`, `json`, `vue`, `sql`.

**`better-sqlite3` build allowed:** `@nuxt/content` v3 uses SQLite for its local content cache. `allowBuilds: { 'better-sqlite3': true }` is required in `pnpm-workspace.yaml` to allow the native addon compilation.

---

## How to Reproduce

```bash
# 1. Create monorepo root
mkdir koryla && cd koryla
pnpm init

# 2. Create workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'app'
  - 'worker'
  - 'plugin'
  - 'plugin/packages/*'
  - 'test-site'
allowBuilds:
  better-sqlite3: true
  esbuild: true
  workerd: true
EOF

# 3. Scaffold Nuxt 4 app
pnpm dlx nuxi@latest init app
cd app && pnpm add @nuxtjs/supabase @nuxt/content @supabase/supabase-js nuxt vue vue-router
pnpm add -D @tailwindcss/vite tailwindcss typescript husky lint-staged vitest @nuxt/test-utils happy-dom @playwright/test

# 4. Configure husky
cd app && pnpm exec husky init
echo "pnpm exec lint-staged" > .husky/pre-commit

# 5. Install from root
cd .. && pnpm install
```

---

## Known Issues / Gotchas

**`.env` path in monorepo:** If you run `nuxt dev` from the `app/` directory, Nuxt won't find `.env` at the repo root. Always either run from the root with `pnpm dev` (which calls `pnpm --filter app dev`), or add the manual `dotenv` load in `nuxt.config.ts`.

**`allowBuilds` in pnpm-workspace.yaml:** Without the `allowBuilds` entries, pnpm will refuse to build native addons for security reasons. `better-sqlite3` (Nuxt Content), `esbuild` (used by many tools), and `workerd` (Cloudflare Worker runtime) all require explicit allowlisting.

**Tailwind v4 has no `content` array:** Unlike v3, Tailwind v4 scans files automatically via the Vite plugin. There is no `tailwind.config.js` and no `content: [...]` array to configure. Class detection is handled by the Vite transform.

**`pnpm override` for `cookie`:** The root `package.json` has `"pnpm": { "overrides": { "cookie": "^0.7.0" } }` to patch a vulnerability in transitive dependencies that still depend on an older version of the `cookie` package.
