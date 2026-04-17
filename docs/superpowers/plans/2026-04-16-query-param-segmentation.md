# Query Parameter Segmentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow experiments to route visitors to a specific variant based on query parameters (e.g. UTMs), with configurable override behavior when a cookie already exists.

**Architecture:** Rules are stored as a JSONB array on each variant. Before random assignment, the worker checks if any variant has a rule matching the current URL's query params (OR logic). A per-experiment `override_assignment` flag controls whether rules beat an existing cookie. The dashboard edit panel exposes both fields.

**Tech Stack:** Supabase (Postgres JSONB), Cloudflare Workers (TypeScript), Nuxt 3 / Vue 3 (Tailwind CSS), Vitest

---

## File Map

| File | Change |
|------|--------|
| *(Supabase SQL — run in dashboard)* | Add `rules` to `variants`, `override_assignment` to `experiments` |
| `worker/src/index.ts` | Add `Rule` interface, update `Variant` + `Experiment`, add `findRuleMatch()`, update handler |
| `worker/tests/ruleMatching.test.ts` | New — unit tests for `findRuleMatch` |
| `app/server/api/worker/config.get.ts` | Add `rules` + `override_assignment` to select |
| `app/server/api/workspaces/[slug]/experiments/[id].patch.ts` | Accept + save `override_assignment` and variant `rules` |
| `app/pages/dashboard/[slug]/experiments/[id].vue` | Add `Rule` interface, update `Variant`/`Experiment`/`EditForm`, add UI for rules + override toggle |

---

## Task 1: Database migration

**Files:**
- Supabase SQL editor (no file — run manually or via Supabase CLI)

- [ ] **Step 1: Run migration SQL**

In the Supabase dashboard → SQL editor, run:

```sql
ALTER TABLE variants
  ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS override_assignment boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Verify columns exist**

In Supabase → Table editor, open `variants` and confirm the `rules` column is there with default `[]`. Open `experiments` and confirm `override_assignment` exists with default `false`.

Existing rows (including boostify experiments) should show `rules = []` and `override_assignment = false` — no data changed.

- [ ] **Step 3: Commit note**

```bash
git add -A
git commit -m "chore: document DB migration for query param segmentation"
```

*(Nothing to stage — migration runs in Supabase. Commit serves as a record.)*

---

## Task 2: Worker — `findRuleMatch` function (TDD)

**Files:**
- Create: `worker/tests/ruleMatching.test.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `worker/tests/ruleMatching.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { findRuleMatch } from '../src/index'

interface Rule { param: string; value: string }

const makeVariant = (id: string, rules: Rule[]) => ({
  id,
  name: `Variant ${id}`,
  traffic_weight: 50,
  target_url: 'https://example.com',
  rules,
})

describe('findRuleMatch', () => {
  it('returns null when no variants have rules', () => {
    const variants = [makeVariant('a', []), makeVariant('b', [])]
    const params = new URLSearchParams('utm_source=facebook')
    expect(findRuleMatch(variants, params)).toBeNull()
  })

  it('returns matching variant when rule matches', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const varB = makeVariant('b', [])
    const params = new URLSearchParams('utm_source=facebook')
    expect(findRuleMatch([varA, varB], params)).toBe(varA)
  })

  it('returns null when param present but value does not match', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const params = new URLSearchParams('utm_source=google')
    expect(findRuleMatch([varA], params)).toBeNull()
  })

  it('returns null when matching param is absent', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const params = new URLSearchParams('utm_medium=email')
    expect(findRuleMatch([varA], params)).toBeNull()
  })

  it('uses OR logic — returns variant if any rule matches', () => {
    const varA = makeVariant('a', [
      { param: 'utm_source', value: 'facebook' },
      { param: 'utm_medium', value: 'email' },
    ])
    const params = new URLSearchParams('utm_medium=email')
    expect(findRuleMatch([varA], params)).toBe(varA)
  })

  it('returns first matching variant when multiple variants have matching rules', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const varB = makeVariant('b', [{ param: 'utm_source', value: 'facebook' }])
    const params = new URLSearchParams('utm_source=facebook')
    expect(findRuleMatch([varA, varB], params)).toBe(varA)
  })

  it('returns null when params are empty', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const params = new URLSearchParams('')
    expect(findRuleMatch([varA], params)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd splitr && pnpm --filter worker test
```

Expected: FAIL — `findRuleMatch is not exported`

- [ ] **Step 3: Add `Rule` interface, update `Variant`, add `findRuleMatch` to `worker/src/index.ts`**

Replace the `Variant` interface (lines 9–13) and add the new code after `assignVariant`:

```typescript
export interface Rule {
  param: string
  value: string
}

interface Variant {
  id: string
  name: string
  traffic_weight: number
  target_url: string
  rules: Rule[]
}
```

Add `findRuleMatch` as a named export (after `assignVariant`, before `const COOKIE_PREFIX`):

```typescript
export function findRuleMatch(
  variants: Pick<Variant, 'id' | 'rules'>[],
  searchParams: URLSearchParams
): typeof variants[number] | null {
  for (const variant of variants) {
    if (!variant.rules?.length) continue
    for (const rule of variant.rules) {
      if (searchParams.get(rule.param) === rule.value) return variant
    }
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd splitr && pnpm --filter worker test
```

Expected: all tests pass including the 7 new ones.

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.ts worker/tests/ruleMatching.test.ts
git commit -m "feat: add findRuleMatch for query param segmentation"
```

---

## Task 3: Worker — integrate rule matching into the fetch handler

**Files:**
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Update `Experiment` interface to include `override_assignment`**

Replace the `Experiment` interface (lines 15–22):

```typescript
interface Experiment {
  id: string
  name: string
  base_url: string
  conversion_url: string | null
  override_assignment: boolean
  variants: Variant[]
  destinations: AnalyticsDestination[]
}
```

- [ ] **Step 2: Replace variant assignment block in the fetch handler**

Find this block (after `const cookieName = getCookieName(experiment.id)`):

```typescript
    const cookieName = getCookieName(experiment.id)
    let variantId = cookies[cookieName]

    let isNewAssignment = false
    if (!variantId) {
      variantId = assignVariant(experiment.variants)
      isNewAssignment = true
    }
```

Replace with:

```typescript
    const cookieName = getCookieName(experiment.id)
    let variantId = cookies[cookieName]
    let isNewAssignment = false

    const matchedVariant = findRuleMatch(experiment.variants, url.searchParams)

    if (matchedVariant && (!variantId || experiment.override_assignment)) {
      if (variantId !== matchedVariant.id) {
        variantId = matchedVariant.id
        isNewAssignment = true
      }
    } else if (!variantId) {
      variantId = assignVariant(experiment.variants)
      isNewAssignment = true
    }
```

- [ ] **Step 3: Run full test suite**

```bash
cd splitr && pnpm --filter worker test
```

Expected: all 17 + 7 = 24 tests pass.

- [ ] **Step 4: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat: apply query param rules in worker handler"
```

---

## Task 4: API — expose `rules` and `override_assignment` from config endpoint

**Files:**
- Modify: `app/server/api/worker/config.get.ts`

- [ ] **Step 1: Add `rules` to the variants select and `override_assignment` to the experiment shape**

In `config.get.ts`, update line 40:

```typescript
    .select('id, name, base_url, conversion_url, override_assignment, type, variants(id, name, traffic_weight, target_url, is_control, rules)')
```

Update the return map (lines 60–67):

```typescript
  return (experiments ?? []).map(exp => ({
    id: exp.id,
    name: exp.name,
    base_url: exp.base_url,
    conversion_url: exp.conversion_url ?? null,
    override_assignment: exp.override_assignment ?? false,
    variants: (exp.variants ?? []).map(v => ({
      ...v,
      rules: v.rules ?? [],
    })),
    destinations: destinations ?? [],
  }))
```

- [ ] **Step 2: Run all tests**

```bash
cd splitr && pnpm --filter worker test && pnpm --filter app test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/server/api/worker/config.get.ts
git commit -m "feat: include rules and override_assignment in worker config response"
```

---

## Task 5: API — PATCH endpoint accepts `override_assignment` and variant `rules`

**Files:**
- Modify: `app/server/api/workspaces/[slug]/experiments/[id].patch.ts`

- [ ] **Step 1: Accept `override_assignment` on the experiment**

In `[id].patch.ts`, after line 27 (`if ('conversion_url' in body) ...`), add:

```typescript
  if ('override_assignment' in body) updates.override_assignment = Boolean(body.override_assignment)
```

- [ ] **Step 2: Accept `rules` per variant inside the `variantDescriptions` loop**

Replace the variant update loop (lines 47–54):

```typescript
  if (Array.isArray(body.variantDescriptions)) {
    for (const v of body.variantDescriptions as { id: string; description: string; rules?: { param: string; value: string }[] }[]) {
      const variantUpdate: Record<string, unknown> = {
        description: v.description?.trim() || null,
      }
      if (Array.isArray(v.rules)) {
        variantUpdate.rules = v.rules
          .filter(r => r.param?.trim() && r.value?.trim())
          .map(r => ({ param: r.param.trim(), value: r.value.trim() }))
      }
      await supabase.from('variants')
        .update(variantUpdate)
        .eq('id', v.id)
        .eq('experiment_id', id)
    }
  }
```

- [ ] **Step 3: Run tests**

```bash
cd splitr && pnpm --filter app test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/server/api/workspaces/[slug]/experiments/[id].patch.ts
git commit -m "feat: PATCH experiment accepts override_assignment and variant rules"
```

---

## Task 6: UI — add rules editor and override toggle to edit panel

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue`

- [ ] **Step 1: Update TypeScript interfaces in `<script setup>`**

Replace the existing `Variant` and `Experiment` interfaces (lines 15–23) with:

```typescript
interface Rule {
  param: string
  value: string
}
interface Variant {
  id: string; name: string; description?: string; traffic_weight: number
  target_url: string; is_control: boolean; impressions: number
  rules: Rule[]
}
interface Experiment {
  id: string; name: string; status: string; base_url: string; conversion_url: string | null
  override_assignment: boolean
  created_at: string; started_at: string | null; ended_at: string | null
  variants: Variant[]; total_impressions: number; total_conversions: number
}
```

- [ ] **Step 2: Update `EditForm` interface and `editForm` ref**

Replace the existing `EditForm` interface and `editForm` ref (lines 85–91):

```typescript
interface EditVariant {
  id: string
  name: string
  description: string
  rules: Rule[]
}

interface EditForm {
  name: string
  conversion_url: string
  override_assignment: boolean
  variantDescriptions: EditVariant[]
}

const editForm = ref<EditForm>({
  name: '',
  conversion_url: '',
  override_assignment: false,
  variantDescriptions: [],
})
```

- [ ] **Step 3: Update `openEdit` to populate new fields**

Replace the `openEdit` function (lines 93–101):

```typescript
const openEdit = () => {
  const exp = experiment.value!
  editForm.value = {
    name: exp.name,
    conversion_url: exp.conversion_url ?? '',
    override_assignment: exp.override_assignment ?? false,
    variantDescriptions: exp.variants.map(v => ({
      id: v.id,
      name: v.name,
      description: v.description ?? '',
      rules: v.rules ? [...v.rules.map(r => ({ ...r }))] : [],
    })),
  }
  showEdit.value = true
}
```

- [ ] **Step 4: Update `saveEdit` to send new fields**

Replace the `$fetch` body inside `saveEdit` (lines 106–113):

```typescript
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: {
        name: editForm.value.name,
        conversion_url: editForm.value.conversion_url || null,
        override_assignment: editForm.value.override_assignment,
        variantDescriptions: editForm.value.variantDescriptions,
      },
    })
```

- [ ] **Step 5: Add helper functions for rule management**

Add after `saveEdit` (before the closing `</script>`):

```typescript
const addRule = (variantId: string) => {
  const v = editForm.value.variantDescriptions.find(v => v.id === variantId)
  if (v) v.rules.push({ param: '', value: '' })
}

const removeRule = (variantId: string, index: number) => {
  const v = editForm.value.variantDescriptions.find(v => v.id === variantId)
  if (v) v.rules.splice(index, 1)
}
```

- [ ] **Step 6: Add override toggle to the edit panel template**

In the template, inside the edit panel body (`<div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">`), add this block **after** the Conversion URL `<div>` and **before** the Variant descriptions `<div>`:

```html
<div>
  <label class="flex items-center gap-3 cursor-pointer select-none">
    <div class="relative">
      <input v-model="editForm.override_assignment" type="checkbox" class="sr-only peer" />
      <div class="w-9 h-5 bg-gray-200 peer-checked:bg-[#C96A3F] rounded-full transition-colors" />
      <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
    </div>
    <div>
      <p class="text-sm font-medium text-gray-700">Rules override existing assignment</p>
      <p class="text-xs text-gray-400">When active, query param rules reassign visitors even if they already have a cookie.</p>
    </div>
  </label>
</div>
```

- [ ] **Step 7: Add rules editor inside each variant card**

In the template, find the variant loop inside the edit panel:

```html
<div v-for="v in editForm.variantDescriptions" :key="v.id" class="border border-gray-200 rounded-xl p-4 space-y-2">
```

Add this block **after** the description `<input>` and **before** the closing `</div>`:

```html
    <!-- Targeting rules -->
    <div class="pt-2 space-y-2">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Targeting rules
        <span class="normal-case font-normal ml-1">(OR — any match routes here)</span>
      </p>
      <div v-for="(rule, i) in v.rules" :key="i" class="flex items-center gap-2">
        <input v-model="rule.param" type="text" placeholder="utm_source"
          class="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300 font-mono" />
        <span class="text-xs text-gray-400">=</span>
        <input v-model="rule.value" type="text" placeholder="facebook"
          class="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300 font-mono" />
        <button type="button" class="text-gray-300 hover:text-red-400 transition-colors shrink-0" @click="removeRule(v.id, i)">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button type="button"
        class="text-xs text-[#C96A3F] hover:text-[#A8522D] font-medium transition-colors flex items-center gap-1"
        @click="addRule(v.id)">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add rule
      </button>
    </div>
```

- [ ] **Step 8: Run all tests**

```bash
cd splitr && pnpm --filter worker test && pnpm --filter app test
```

Expected: all tests pass.

- [ ] **Step 9: Start dev server and verify UI manually**

```bash
cd splitr && pnpm dev
```

Open the dashboard, open any experiment, click Edit. Verify:
1. The "Rules override existing assignment" toggle appears below Conversion URL
2. Each variant card shows a "Targeting rules" section with "Add rule" button
3. Clicking "Add rule" shows two inputs (param / value) and a remove button
4. Saving with rules populated doesn't throw an error
5. Re-opening the edit panel shows the saved rules

- [ ] **Step 10: Commit**

```bash
git add app/pages/dashboard/[slug]/experiments/[id].vue
git commit -m "feat: add targeting rules and override toggle to experiment edit panel"
```
