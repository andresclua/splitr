# Splitr — Phase Documentation Index

Splitr is an edge-based A/B testing SaaS. Experiments run entirely at the CDN edge (Cloudflare Workers, Netlify Edge Functions, Vercel Edge Middleware) — no client-side JS, no DOM flicker, no layout shift.

**Deployed environments:**
- Dashboard: [splitr-dev.netlify.app](https://splitr-dev.netlify.app)
- Worker: [splitr-worker.splitr-app.workers.dev](https://splitr-worker.splitr-app.workers.dev)
- Test site: [test-site-splitr.netlify.app](https://test-site-splitr.netlify.app)

---

## Phases

| # | Phase | Description | Status |
|---|-------|-------------|--------|
| 01 | [Scaffold](./01-scaffold.md) | Monorepo setup, Nuxt 4, Tailwind v4, Supabase module, husky/lint-staged | ✅ Complete |
| 02 | [Database](./02-database.md) | Supabase schema: workspaces, experiments, variants, events, API keys, RLS | ✅ Complete |
| 03 | [UI Components](./03-ui-components.md) | AppToast (useToast composable) and AppConfirm (modal with danger variant) | ✅ Complete |
| 04 | [Worker](./04-worker.md) | Cloudflare Worker: KV config cache, weighted variant assignment, analytics fire-and-forget | ✅ Complete |
| 05 | [Auth](./05-auth.md) | Supabase Auth + Google OAuth, implicit flow, manual hash token parsing on /confirm | ✅ Complete |
| 06 | [Experiments](./06-experiments.md) | Experiment CRUD dashboard, variant management, Nitro API endpoints, worker config endpoint | ✅ Complete |
| 07 | [Plugin Adapters](./07-plugin-adapters.md) | @splitr/core, @splitr/next, @splitr/netlify, @splitr/node, test-site (Astro + Netlify Edge) | ✅ Complete |
| 08 | [Integrations Page](./08-integrations.md) | Dashboard integrations page: per-platform tabs, code snippets, copy button, prefilled API URL | ✅ Complete |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              User's Website                      │
│   (Next.js / Netlify / Node / CF Worker)        │
│                                                  │
│   @splitr/core (in middleware)                  │
│       ↓ fetch config (cached 60s)               │
│       ↓ assign variant (weighted random)        │
│       ↓ rewrite URL server-side                 │
└────────────────┬────────────────────────────────┘
                 │ GET /api/worker/config
                 │ Authorization: Bearer sk_live_...
                 ▼
┌─────────────────────────────────────────────────┐
│        Splitr Dashboard (Nuxt 4 / Nitro)        │
│        splitr-dev.netlify.app                   │
│                                                  │
│   /api/worker/config  → hash API key, query     │
│                          active experiments      │
│                                                  │
│   Supabase (Postgres + Auth + RLS)              │
└─────────────────────────────────────────────────┘
```

## Repository Structure

```
splitr/
├── app/               Nuxt 4 dashboard (Netlify)
│   ├── pages/         Route pages (dashboard, login, confirm, onboarding)
│   ├── server/api/    Nitro server routes
│   ├── components/    AppToast, AppConfirm
│   ├── composables/   useToast, useConfirm, useWorkspace
│   ├── db/            schema.sql
│   └── lib/           apiKeys.ts, publicDomains.ts
├── worker/            Cloudflare Worker (wrangler)
│   └── src/           index.ts (main handler), analytics.ts
├── plugin/
│   └── packages/
│       ├── core/      @splitr/core — framework-agnostic engine
│       ├── next/      @splitr/next — Next.js middleware adapter
│       ├── netlify/   @splitr/netlify — Netlify Edge Functions adapter
│       └── node/      @splitr/node — Express/Node.js middleware adapter
├── test-site/         Astro static site with Netlify Edge Function (proof of concept)
├── pnpm-workspace.yaml
└── package.json
```
