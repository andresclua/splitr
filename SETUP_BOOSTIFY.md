# Koryla — Boostify integration setup

Reference for how the A/B testing pipeline between Koryla and boostifyjs.com was built.
Use this to retake the work or replicate it on another project.

---

## Repos involved

| Repo | Purpose |
|------|---------|
| `andresclua/koryla` | Koryla backend (Nuxt/Nitro on Netlify) |
| `andresclua/boostify-docs` | Boostify site (Astro on Netlify) |

---

## Architecture

```
boostifyjs.com request
       │
       ▼
Netlify Edge Function  ← netlify/edge-functions/koryla.ts
  - Fetches experiments from koryla.com/api/worker/config?type=edge
  - Assigns variant via cookie (ky_<experimentId>)
  - Rewrites URL to variant page (e.g. /home-b) or serves original
       │
       ▼
Astro SSR (index.astro)
  - Reads ky_<sdk-exp-id> cookie
  - If absent, randomly assigns Control or Variant B (50/50)
  - Sets ky_<sdk-exp-id> cookie in response
  - Renders correct content (e.g. button text)
       │
       ▼
Browser
  - Koryla snippet in <head> fires impression events
  - Reads all ky_* cookies → POST koryla.com/api/public/<workspaceId>/event
       │
       ▼
Conversion page (e.g. /guides/introduction/)
  - Script in frontmatter fires conversion events
  - Same POST pattern as impression
       │
       ▼
Koryla dashboard
  - Shows impressions, conversions, conv. rate per variant
```

---

## Active experiments (Boostify workspace)

| Name | ID | Type |
|------|----|------|
| Homepage CTA Test | `5c323bcd-1535-46bb-9fc6-bd44feeb6e7b` | Edge |
| Homepage Button Text Test | `70a5c503-5968-4337-a34f-d40d23e38ad1` | SDK (component) |

**Workspace ID**: `b844eebd-f720-4f0a-8dc7-4e8d2be26118`

### Edge experiment variants
| Variant | ID | Target |
|---------|----|--------|
| Control | `50d4786d-eb4d-49a5-b98e-e57ee50ca2d9` | `boostifyjs.com/` |
| Variant B | `7dbaa960-6b6b-41bc-a812-385d4894c859` | `boostifyjs.com/home-b` |

### SDK experiment variants
| Variant | ID | Button text |
|---------|----|-------------|
| Control | `2253996b-46cd-4b72-938a-d9810ada8d63` | Get Started |
| Variant B | `8f05f93e-79ac-4abf-a103-08335a06128f` | Let's make it happen |

---

## Key files in boostify-docs

### Edge function
`netlify/edge-functions/koryla.ts`
- Fetches `koryla.com/api/worker/config?type=edge`
- Assigns variant cookie and rewrites URL
- Handles control variant with `context.next()` (avoids self-rewrite loop)
- Env var needed: `KORYLA_API_KEY` in Netlify

### SDK experiment
`src/pages/index.astro`
- Inline cookie read/assign (no SDK dependency — avoids module cache issues)
- Sets `ky_70a5c503-...` cookie server-side
- Passes `ctaText` prop to `<HomeHero>`

### Impression snippet
`src/layouts/HomeLayout.astro` — inside `<head>`
- Reads all `ky_*` cookies on page load
- Creates `ky_session` if absent
- POSTs impression to `koryla.com/api/public/<workspaceId>/event`

### Conversion tracking
`src/content/docs/guides/introduction.md` — frontmatter `head` script
- Reads all `ky_*` cookies + `ky_session`
- POSTs conversion to same public endpoint

---

## Key files in Koryla backend

### Public event endpoint
`app/server/api/public/[workspaceId]/event.ts`
- No API key required — workspace UUID in URL is enough
- Accepts POST + OPTIONS (CORS enabled for any origin)
- Deduplicates impressions by `session_id + experiment_id`
- Forwards to analytics destinations (GA4, PostHog, Webhook) server-side

### Worker config endpoint
`app/server/api/worker/config.get.ts`
- Requires `Authorization: Bearer <api_key>`
- Without `?type` param → returns all active experiments
- With `?type=edge` → only edge experiments
- With `?type=component` → only SDK experiments

### Worker event endpoint (SDK server-side impressions)
`app/server/api/worker/event.post.ts` — fires impressions from SDK adapters

---

## Netlify env vars

### boostify-docs
| Var | Value |
|-----|-------|
| `KORYLA_API_KEY` | API key from Koryla → Settings → API Keys (Boostify workspace) |

### koryla backend
Standard Supabase + Stripe vars — no Koryla-specific additions needed.

---

## Testing checklist

- [ ] Visit `boostifyjs.com/` in incognito → DevTools → Application → check `ky_5c323bcd-...` cookie is set
- [ ] Reload a few times (delete cookie each time) — should alternate between `home-b` and original
- [ ] On original homepage — check `ky_70a5c503-...` cookie is set
- [ ] Button should show "Get Started" or "Let's make it happen" (50/50)
- [ ] Click the CTA → land on `/guides/introduction/`
- [ ] Koryla dashboard → Homepage CTA Test + Homepage Button Text Test → impressions and conversions should increase

---

## Known issues / decisions

- **SDK used inline assignment** instead of `@koryla/astro`'s `getVariant()`. Reason: the SDK uses a module-level in-memory cache (`engines` Map) that caused the component experiment to not be found when the Netlify Lambda was warm with stale data.
- **Conversion script fires for ALL `ky_*` cookies** on the conversion page — both edge and SDK experiments register a conversion when the user reaches `/guides/introduction/`.
- **`?type=edge` in edge function** — the edge function passes `?type=edge` to the config endpoint so it only processes edge experiments and doesn't interfere with SDK experiments.
