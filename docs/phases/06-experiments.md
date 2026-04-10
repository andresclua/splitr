# Phase 06 — Experiments

## Overview

Implements the core product functionality: the experiments dashboard. Users can create, view, edit, activate, pause, and delete A/B testing experiments. Each experiment has 2+ variants with URL targets and traffic weights. The dashboard displays experiment status, variant split configuration, and real-time status controls.

This phase also implements the `/api/worker/config` endpoint — the machine-to-machine API that the Cloudflare Worker and plugin adapters call to fetch active experiment configuration.

Relevant files:
- `app/pages/dashboard/[slug]/index.vue` — Experiments list page
- `app/pages/dashboard/[slug]/experiments/[id].vue` — Single experiment detail/edit page
- `app/server/api/workspaces/[slug]/experiments/index.get.ts` — List experiments
- `app/server/api/workspaces/[slug]/experiments/index.post.ts` — Create experiment
- `app/server/api/workspaces/[slug]/experiments/[id].patch.ts` — Update experiment (status, name, etc.)
- `app/server/api/workspaces/[slug]/experiments/[id].delete.ts` — Delete experiment
- `app/server/api/worker/config.get.ts` — Worker config endpoint (M2M auth)
- `app/lib/apiKeys.ts` — Key generation and hashing utilities

---

## Why

**Nitro server routes over client-side Supabase:** All database mutations go through Nitro API routes rather than calling Supabase directly from the browser. This allows server-side authorization (membership checks, role validation) before any database operation. It also keeps the Supabase service key server-side only.

**Status machine (draft → active → paused → completed):** Experiments follow a deliberate lifecycle. A `draft` experiment is being configured — the worker does not serve it. `active` experiments are served by the worker and included in `/api/worker/config`. `paused` and `completed` experiments are excluded from the worker config, stopping the split without deleting data. Status transitions are recorded with timestamps (`started_at` when set to `active`, `ended_at` when set to `completed`).

**`/api/worker/config` uses API key auth (not user session):** The worker is a machine — it has no user session. It authenticates using an `sk_live_...` API key. The key is hashed with SHA-256 on both sides and never stored in plaintext. This endpoint intentionally uses the Supabase JS client with the service key directly (not `serverSupabaseUser`) because there is no user context.

---

## What Was Built

### Experiments list (`dashboard/[slug]/index.vue`)

- Lists all experiments for the current workspace
- Status badges: draft (gray), active (green), paused (yellow), completed (blue)
- Status toggle buttons: activate/pause experiment inline
- "New experiment" button opens creation modal
- Variant traffic split shown as colored bar chart
- Links to individual experiment detail page

### Experiment detail (`dashboard/[slug]/experiments/[id].vue`)

- Shows full experiment config: name, base URL, conversion URL, variants
- Edit experiment name and base URL
- Edit variant URLs and traffic weights (must sum to 100)
- Variant weight validation before save
- Status control: activate, pause, complete
- Delete experiment (uses `useConfirm` for destructive action confirmation)
- Real-time status display with timestamps

### API Routes

**`GET /api/workspaces/[slug]/experiments`**

Returns all experiments for the workspace with nested variants. Requires authenticated user who is a member of the workspace. Uses service client to bypass RLS.

**`POST /api/workspaces/[slug]/experiments`**

Creates experiment + variants in a single transaction (two sequential inserts). Validates:
- `name` required
- `base_url` required
- At least 2 variants
- Variant `traffic_weight` sum === 100

```ts
const totalWeight = variants.reduce((sum, v) => sum + (v.traffic_weight ?? 0), 0)
if (totalWeight !== 100) throw createError({ statusCode: 400, message: 'Variant weights must sum to 100' })
```

**`PATCH /api/workspaces/[slug]/experiments/[id]`**

Partial update. Supported fields: `name`, `base_url`, `status`. Status transitions set timestamps:
```ts
if (body.status === 'active') updates.started_at = new Date().toISOString()
if (body.status === 'completed') updates.ended_at = new Date().toISOString()
```

**`DELETE /api/workspaces/[slug]/experiments/[id]`**

Deletes experiment. Cascades to variants and events via the `on delete cascade` foreign keys in the schema.

### `/api/worker/config` (M2M endpoint)

This is the most security-sensitive endpoint in the application.

**Authentication:**
1. Extract Bearer token from `Authorization` header
2. Hash with SHA-256: `hashApiKey(rawKey)`
3. Look up `key_hash` in `api_keys` table → get `workspace_id`
4. Fire-and-forget update of `last_used_at`

**Response shape:**
```ts
return experiments.map(exp => ({
  id: exp.id,
  name: exp.name,
  base_url: exp.base_url,
  variants: exp.variants ?? [],        // includes traffic_weight, target_url
  destinations: destinations ?? [],   // analytics destinations for this workspace
}))
```

Only `status = 'active'` experiments are returned. The worker/adapters never see draft, paused, or completed experiments.

### `app/lib/apiKeys.ts`

```ts
export function generateApiKey() {
  const raw = `sk_live_${randomBytes(24).toString('hex')}`  // 56 chars total
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.substring(0, 16)  // "sk_live_" + 8 hex chars
  return { raw, hash, prefix }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
```

Key format: `sk_live_<48 hex chars>`. Only `raw` is shown to the user at creation. `hash` is stored in the database. `prefix` (e.g. `sk_live_a3f2b1c0`) is displayed in the dashboard key list for identification.

---

## Key Decisions

**Variant creation in the same request as experiment creation:** The `POST /api/workspaces/[slug]/experiments` endpoint creates both the experiment row and all variant rows in one API call. This is not atomic (two separate Supabase inserts) — if the variant insert fails, the experiment row remains without variants. A true transaction would use `supabase.rpc()` with a Postgres function, but the current approach is sufficient for the expected reliability of Supabase.

**`workspace_id` resolved by `slug`:** All experiment routes accept `slug` (not `id`) as the workspace identifier. This requires a lookup of the workspace by slug on every request. Slug is URL-safe and human-readable, which is why it's used in routes.

**Traffic weight validation at 100:** Weights are enforced to sum to exactly 100 in the API. The worker and core engine use weighted random that works with any positive integers, so this is purely a UX convention. It makes the split intuitive ("50/50", "70/30") and predictable. A future version could support "auto-balance" (distribute remaining weight evenly).

**No variant editing after experiment is active:** The current implementation allows variant edits regardless of status. Editing variants on an active experiment changes the URLs being served to all future visitors but doesn't affect visitors who already have cookies. This is a data integrity risk — proper implementations would prevent or warn about edits to active experiments.

---

## How to Reproduce

1. With schema applied and Supabase configured, create a workspace via the onboarding flow.
2. Navigate to `/dashboard/[slug]` — the experiments list page.
3. Create an experiment:
   - POST to `/api/workspaces/[slug]/experiments` with `{ name, base_url, variants: [{ name, target_url, traffic_weight }] }`
4. Activate via PATCH: `{ status: 'active' }` → sets `started_at`
5. Verify the worker config endpoint:
   ```bash
   curl -H "Authorization: Bearer sk_live_..." \
     https://koryla-dev.netlify.app/api/worker/config
   ```
   Should return JSON array with the active experiment.

---

## Known Issues / Gotchas

**Variant insert not atomic:** As noted above, if the variant insert fails after the experiment insert succeeds, the workspace ends up with an experimentless experiment. A retry of the creation request would create a duplicate. Mitigation: wrap in a Postgres function via `supabase.rpc()`.

**No variant archiving:** Deleting a variant (in the edit flow) also deletes all associated events due to `on delete cascade`. There is no soft-delete or archival for variants.

**`last_used_at` update is truly fire-and-forget:** The update call:
```ts
supabase.from('api_keys').update({ last_used_at: ... }).eq('id', apiKey.id).then()
```
The `.then()` without `.catch()` means errors are silently swallowed. The update may fail if Supabase is under load; there is no retry.

**Worker config ordering:** The config endpoint returns experiments in Supabase's default row order (effectively insertion order). If two experiments share overlapping `base_url` paths (e.g. `/` and `/pricing`), the worker's `startsWith` match depends on which appears first in the array. The `@koryla/core` package handles this by sorting by pathname length (longer first), but the standalone Cloudflare Worker does not implement this sort.

**No experiment result analytics yet:** The dashboard shows experiment status and variant config but does not yet display split results (impressions, conversions, lift). The `events` table exists in the schema but the analytics query + visualization UI is not implemented.
