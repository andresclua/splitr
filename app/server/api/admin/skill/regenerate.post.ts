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
description: Insert Koryla A/B testing into an existing project — adds <Experiment>/<Variant> components and conversion tracking, nothing else
---

# Koryla A/B Testing

Koryla is a **server-side A/B testing platform**. Variant assignment happens on the server — no flicker, no client-side JavaScript.

Dashboard: https://koryla.com/dashboard
Docs: https://koryla.com/docs

---

## Before writing any code, ask the user:

1. **Framework** — React/Next.js, Vue/Nuxt, Astro, or other? (determines import syntax only)
2. **Do they have an API key and experiment UUID?** If not, guide them to get these first (see below).
3. **What element are they testing?** (headline, CTA button, pricing copy, etc.) and where in their code it lives.

Do NOT set up their framework, configure SSR, or touch anything outside the experiment code.

---

## Step 1 — Get an API key (if they don't have one)

1. Go to [koryla.com/dashboard](https://koryla.com/dashboard)
2. Open **Settings → API Keys → New API key**, copy it
3. Add to \`.env\`: \`KORYLA_API_KEY=sk_live_...\`

## Step 2 — Create an experiment (if they don't have a UUID)

1. Dashboard → **New experiment**
2. Set **Base URL** (page where the test runs) and **Conversion URL** (page that counts as a win)
3. Add variants: \`control\` (50%) + \`b\` (50%)
4. Copy the **experiment UUID**
5. Set status to **Active**

---

## The pattern

Koryla uses an \`<Experiment>\` wrapper with \`<Variant>\` children. Each variant renders only when the server assigns that variant to the session.

### React / Next.js

\`\`\`tsx
import { Experiment, Variant } from '@koryla/react'

// Inside your Server Component or page:
<Experiment id="your-experiment-uuid" apiKey={process.env.KORYLA_API_KEY!}>
  <Variant name="control">
    <h1>Original headline</h1>
  </Variant>
  <Variant name="b">
    <h1>New headline to test</h1>
  </Variant>
</Experiment>
\`\`\`

### Vue / Nuxt

\`\`\`vue
<script setup lang="ts">
import { Experiment, Variant } from '@koryla/vue'
</script>

<template>
  <Experiment id="your-experiment-uuid" :api-key="runtimeConfig.korylaApiKey">
    <Variant name="control">
      <h1>Original headline</h1>
    </Variant>
    <Variant name="b">
      <h1>New headline to test</h1>
    </Variant>
  </Experiment>
</template>
\`\`\`

### Astro

\`\`\`astro
---
import { Experiment, Variant } from '@koryla/astro'
---

<Experiment id="your-experiment-uuid" apiKey={import.meta.env.KORYLA_API_KEY}>
  <Variant name="control">
    <h1>Original headline</h1>
  </Variant>
  <Variant name="b">
    <h1>New headline to test</h1>
  </Variant>
</Experiment>
\`\`\`

### WordPress (shortcodes)

\`\`\`
[koryla_experiment id="your-experiment-uuid"]
  [koryla_variant name="control"]
    Original content here
  [/koryla_variant]
  [koryla_variant name="b"]
    New content to test
  [/koryla_variant]
[/koryla_experiment]
\`\`\`

---

## Conversion tracking

**Automatic:** Koryla counts a conversion when a visitor reaches the Conversion URL set in the dashboard. No code needed.

**Manual** (form submit, button click, custom event):

\`\`\`typescript
await fetch('https://koryla.com/api/worker/event', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.KORYLA_API_KEY}\`,
  },
  body: JSON.stringify({
    experiment_id: 'your-experiment-uuid',
    variant_id: 'variant-uuid',  // from the dashboard
    session_id: sessionId,        // the koryla_sid cookie value
    event_type: 'conversion',
  }),
})
\`\`\`

**WordPress manual tracking** — add to your thank-you page:

\`\`\`
[koryla_conversion /]
\`\`\`

---

## Checking results

Dashboard → experiment detail: impressions, conversions, conversion rate, and statistical significance per variant.

---

## Common questions

**Q: Does it cause flicker?**
No. The server resolves the variant before HTML is sent.

**Q: Does it work with ad blockers?**
Yes. Everything is server-side.

**Q: How does a visitor always see the same variant?**
Koryla sets a \`koryla_sid\` cookie on the first visit.

**Q: How do I force a variant for QA?**
Add a UTM rule in the dashboard (e.g. \`?utm_content=b\`) to force a specific variant.

---

## Plans & limits

| Plan    | Experiments | Impressions/mo | Workspaces | Price |
|---------|-------------|----------------|------------|-------|
| Free    | ${formatLimit(p.free.experiments as number)} | ${formatLimit(p.free.impressionsPerMonth as number)} | ${formatLimit(p.free.workspaces as number)} | $0 |
| Starter | ${formatLimit(p.starter.experiments as number)} | ${formatLimit(p.starter.impressionsPerMonth as number)} | ${formatLimit(p.starter.workspaces as number)} | $${p.starter.price.monthly}/mo |
| Growth  | ${formatLimit(p.growth.experiments as number)} | ${formatLimit(p.growth.impressionsPerMonth as number)} | ${formatLimit(p.growth.workspaces as number)} | $${p.growth.price.monthly}/mo |
| Scale   | ${formatLimit(p.scale.experiments as number)} | ${formatLimit(p.scale.impressionsPerMonth as number)} | ${formatLimit(p.scale.workspaces as number)} | Contact us |

Upgrade: [koryla.com/dashboard](https://koryla.com/dashboard) → Billing

---

*koryla.com*
`

  const filePath = resolve(process.cwd(), '..', 'docs', 'claude-skill', 'koryla.md')
  await writeFile(filePath, content, 'utf-8')
  return { ok: true, content }
})
