import { serverSupabaseUser } from '#supabase/server'
import { writeFile } from 'fs/promises'
import { resolve } from 'path'
import { PLANS } from '~/lib/plans'

const ADMIN_EMAIL = 'andresclua@gmail.com'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || user.email !== ADMIN_EMAIL) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const p = PLANS
  const formatLimit = (n: number) => n === Infinity ? '∞' : n.toLocaleString()

  const content = `---
name: koryla
description: Integrate Koryla A/B testing — asks for context, generates the right code for any setup
---

# Koryla A/B Testing

Koryla is a **server-side A/B testing platform**. No flicker. No client JavaScript needed for variant assignment. The server picks the variant before the HTML is sent to the browser.

Dashboard: https://koryla.com/dashboard
Docs: https://koryla.com/docs

---

## Before writing any code, ask the user:

1. **Framework / stack** — React, Next.js, Vue, Nuxt, Astro, WordPress, plain HTML, or other?
2. **Rendering** — SSR, SSG, edge (Netlify/Cloudflare Workers), or client-side SPA?
3. **Do they have an API key?** If not, guide them to get one first (see below).
4. **What are they testing?** Headline, CTA button, layout, pricing page, etc.

---

## Getting started

### 1. Get an API key
1. Go to [koryla.com/dashboard](https://koryla.com/dashboard)
2. Open **Settings → API Keys**
3. Click **New API key**, give it a name, copy it
4. Add to your \`.env\`: \`KORYLA_API_KEY=sk_live_...\`

### 2. Create an experiment in the dashboard
1. Click **New experiment**
2. Set **Base URL** — the page where the test runs (e.g. \`https://yoursite.com/pricing\`)
3. Set **Conversion URL** — the page that counts as a win (e.g. \`https://yoursite.com/thank-you\`)
4. Add variants: \`control\` (50%) + \`b\` (50%) — weights must sum to 100
5. Copy the **experiment UUID** — you'll need it in code
6. Set status to **Active**

---

## Integration patterns

### React / Next.js (App Router, SSR)

Install the SDK:
\`\`\`bash
npm install @koryla/sdk
# or
pnpm add @koryla/sdk
\`\`\`

In a Server Component:
\`\`\`tsx
import { KorylaClient } from '@koryla/sdk'
import { cookies } from 'next/headers'

const koryla = new KorylaClient({ apiKey: process.env.KORYLA_API_KEY! })

export default async function PricingPage() {
  const cookieStore = cookies()
  const sessionId = cookieStore.get('koryla_sid')?.value ?? crypto.randomUUID()

  const variant = await koryla.getVariant('your-experiment-uuid', sessionId)

  return (
    <main>
      {variant === 'b' ? (
        <h1>New headline — variant B</h1>
      ) : (
        <h1>Original headline — control</h1>
      )}
    </main>
  )
}
\`\`\`

### Vue / Nuxt (SSR)

\`\`\`vue
<script setup lang="ts">
const { data: variant } = await useAsyncData('hero-variant', () =>
  $fetch('/api/koryla/variant', { query: { experiment: 'your-experiment-uuid' } })
)
</script>

<template>
  <h1 v-if="variant === 'b'">New headline</h1>
  <h1 v-else>Original headline</h1>
</template>
\`\`\`

### Astro (SSR)

\`\`\`astro
---
import { KorylaClient } from '@koryla/sdk'

const koryla = new KorylaClient({ apiKey: import.meta.env.KORYLA_API_KEY })
const sessionId = Astro.cookies.get('koryla_sid')?.value ?? crypto.randomUUID()
const variant = await koryla.getVariant('your-experiment-uuid', sessionId)
---

{variant === 'b' ? (
  <h1>New headline — B</h1>
) : (
  <h1>Original — control</h1>
)}
\`\`\`

### WordPress (shortcodes)

Install the Koryla WordPress plugin, enter your API key in **Settings → Koryla**.

**Run an experiment:**
\`\`\`
[koryla_experiment id="your-experiment-uuid"]
  [koryla_variant name="control"]
    <a href="/thank-you">Start testing free →</a>
  [/koryla_variant]
  [koryla_variant name="b"]
    <a href="/thank-you">A/B test in 5 minutes →</a>
  [/koryla_variant]
[/koryla_experiment]
\`\`\`

**Track conversions** — add to your thank-you page:
\`\`\`
[koryla_conversion /]
\`\`\`

### Edge / Netlify (middleware)

\`\`\`typescript
// netlify/edge-functions/koryla.ts
import { KorylaClient } from '@koryla/sdk'

export default async (request: Request, context: any) => {
  const koryla = new KorylaClient({ apiKey: Deno.env.get('KORYLA_API_KEY')! })

  const url = new URL(request.url)
  const sid = request.headers.get('cookie')?.match(/koryla_sid=([^;]+)/)?.[1] ?? crypto.randomUUID()

  const variant = await koryla.getVariantForUrl(url.pathname, sid)
  const response = await context.next()

  return response
}
\`\`\`

### Cloudflare Workers

\`\`\`typescript
import { KorylaClient } from '@koryla/sdk'

export default {
  async fetch(request: Request, env: Env) {
    const koryla = new KorylaClient({ apiKey: env.KORYLA_API_KEY })
    const sid = getCookie(request, 'koryla_sid') ?? crypto.randomUUID()
    const variant = await koryla.getVariant('your-experiment-uuid', sid)
    const response = await fetch(request)
    return response
  }
}
\`\`\`

---

## Conversion tracking

Koryla counts a conversion when a visitor hits the Conversion URL you set in the dashboard. Automatic — no extra code needed.

For manual tracking (form submit, button click):

\`\`\`typescript
await fetch('https://koryla.com/api/worker/event', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`,
  },
  body: JSON.stringify({
    experiment_id: 'your-experiment-uuid',
    variant_id: 'variant-uuid',
    session_id: sessionId,
    event_type: 'conversion',
  }),
})
\`\`\`

---

## Plans & limits

| Plan    | Experiments | Impressions/mo | Workspaces | Price |
|---------|-------------|----------------|------------|-------|
| Free    | ${formatLimit(p.free.experiments as number)} | ${formatLimit(p.free.impressionsPerMonth as number)} | ${formatLimit(p.free.workspaces as number)} | $0 |
| Starter | ${formatLimit(p.starter.experiments as number)} | ${formatLimit(p.starter.impressionsPerMonth as number)} | ${formatLimit(p.starter.workspaces as number)} | $${p.starter.price.monthly}/mo |
| Growth  | ${formatLimit(p.growth.experiments as number)} | ${formatLimit(p.growth.impressionsPerMonth as number)} | ${formatLimit(p.growth.workspaces as number)} | $${p.growth.price.monthly}/mo |
| Scale   | ${formatLimit(p.scale.experiments as number)} | ${formatLimit(p.scale.impressionsPerMonth as number)} | ${formatLimit(p.scale.workspaces as number)} | Contact us |

**Active experiments** = draft + active + paused (completed/deleted don't count toward limit).

Upgrade at: [koryla.com/dashboard](https://koryla.com/dashboard) → Billing

---

## Common questions

**Q: Does Koryla cause flicker?**
No. Variant assignment happens on the server before HTML is sent to the browser.

**Q: Does it work with ad blockers?**
Yes. All tracking is server-side — nothing runs in the browser.

**Q: How does session persistence work?**
Koryla sets a \`koryla_sid\` cookie. Returning visitors always see the same variant.

**Q: Can I force a variant for testing?**
Yes — add a UTM rule in the dashboard to force a specific variant via query param.

**Q: Where do I see results?**
Dashboard → experiment detail: impressions, conversions, conversion rate, and statistical significance.

---

## Troubleshooting

- **No impressions** — check API key is correct and experiment status is **Active**
- **Always seeing control** — workspace may be over impression limit (Billing → Current usage)
- **Variant not persisting** — check \`koryla_sid\` cookie is being set and sent with requests
- **401 errors** — API key is invalid or missing from the Authorization header

---

*Generated from Koryla dashboard — koryla.com*
`

  const filePath = resolve(process.cwd(), '..', 'docs', 'claude-skill', 'koryla.md')
  await writeFile(filePath, content, 'utf-8')
  return { ok: true, content }
})
