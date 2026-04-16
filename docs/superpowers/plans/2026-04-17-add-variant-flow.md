# Add Variant from Flow View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add a new variant directly from the experiment detail page flow diagram — a ghost node appears after the last variant on hover, clicking it opens an Add Variant form in the right panel, and submitting calls a new API endpoint that inserts the variant and redistributes traffic weights in a single operation.

**Architecture:** Two files change — `app/pages/dashboard/[slug]/experiments/[id].vue` gains a ghost node in the flow diagram plus a new `'add-variant'` right-panel state with a form; `app/server/api/workspaces/[slug]/experiments/[id]/variants/index.post.ts` is a new file that handles POST to insert the variant and update existing variant weights. New visitors get the new variant; existing visitors keep their cookie assignment (no cookie reset).

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>` + TypeScript, Tailwind CSS, Supabase (service key, no transaction API)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `app/server/api/workspaces/[slug]/experiments/[id]/variants/index.post.ts` | POST endpoint: auth, validation, insert variant, update existing weights |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — `<script setup>` | Add variant form state + `initAddVariantForm` + `saveNewVariant` + watchers |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — template (flow column) | Ghost node after variant columns, before merge-back section |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — template (right panel) | `'add-variant'` panel state after the `selectedNode.startsWith('variant-')` block |

---

## Task 1: POST API Endpoint

**Files:**
- Create: `app/server/api/workspaces/[slug]/experiments/[id]/variants/index.post.ts`

- [ ] **Step 1: Create the endpoint file**

```typescript
import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Workspace check
  const { data: ws } = await supabase
    .from('workspaces').select('id').eq('slug', slug).single()
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  // Membership check
  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle()
  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  // Experiment check
  const { data: exp } = await supabase
    .from('experiments').select('id, status, type')
    .eq('id', id).eq('workspace_id', ws.id).single()
  if (!exp) throw createError({ statusCode: 404, message: 'Experiment not found' })
  if (exp.status === 'completed') throw createError({ statusCode: 400, message: 'Cannot add variants to a completed experiment' })

  // Validate body
  const name: string = (body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })

  const trafficWeight: number = Number(body.traffic_weight)
  if (!Number.isInteger(trafficWeight) || trafficWeight < 1 || trafficWeight > 98)
    throw createError({ statusCode: 400, message: 'traffic_weight must be an integer between 1 and 98' })

  const existingWeights: Array<{ id: string; traffic_weight: number }> = body.existing_weights ?? []

  const total = trafficWeight + existingWeights.reduce((s, v) => s + Number(v.traffic_weight), 0)
  if (total !== 100) throw createError({ statusCode: 400, message: `Weights must sum to 100 (got ${total})` })

  // For edge experiments, target_url is required
  const targetUrl: string | null = body.target_url?.trim() || null
  if (exp.type === 'edge' && !targetUrl)
    throw createError({ statusCode: 400, message: 'target_url is required for edge experiments' })

  // Insert new variant
  const { data: newVariant, error: insertError } = await supabase
    .from('variants')
    .insert({
      experiment_id: id,
      name,
      target_url: targetUrl,
      traffic_weight: trafficWeight,
      is_control: false,
    })
    .select('id, name, target_url, traffic_weight, is_control')
    .single()

  if (insertError || !newVariant) throw createError({ statusCode: 500, message: insertError?.message ?? 'Insert failed' })

  // Update existing variant weights
  for (const entry of existingWeights) {
    await supabase
      .from('variants')
      .update({ traffic_weight: Number(entry.traffic_weight) })
      .eq('id', entry.id)
      .eq('experiment_id', id)
  }

  return {
    id: newVariant.id,
    name: newVariant.name,
    target_url: newVariant.target_url,
    traffic_weight: newVariant.traffic_weight,
    is_control: newVariant.is_control,
    impressions: 0,
    conversion_count: 0,
  }
})
```

- [ ] **Step 2: Verify the file was saved correctly**

Run: `cat app/server/api/workspaces/\[slug\]/experiments/\[id\]/variants/index.post.ts | head -5`
Expected: shows `import { serverSupabaseUser }` on line 1

- [ ] **Step 3: Commit**

```bash
git add app/server/api/workspaces/\[slug\]/experiments/\[id\]/variants/index.post.ts
git commit -m "feat: POST /api/workspaces/[slug]/experiments/[id]/variants endpoint"
```

---

## Task 2: Script Setup — Add Variant State

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — `<script setup>` section (after line 181, before `</script>`)

- [ ] **Step 1: Add state and logic to `<script setup>`**

Open `app/pages/dashboard/[slug]/experiments/[id].vue`. The `</script>` closing tag is at line 182. Insert the following block immediately before `</script>` (after the `removeRule` function):

```typescript
// ── Add variant form ──────────────────────────────────────
const newVariantName = ref('')
const newVariantUrl = ref('')
const newVariantWeights = ref<Array<{ id: string; name: string; weight: number; isNew?: boolean }>>([])
const addingVariant = ref(false)

const nextVariantLetter = computed(() => {
  const count = experiment.value?.variants.filter(v => !v.is_control).length ?? 0
  return ['B', 'C', 'D', 'E', 'F', 'G', 'H'][count] ?? String(count + 1)
})

const initAddVariantForm = () => {
  const variants = experiment.value?.variants ?? []
  const total = variants.length + 1
  const weight = Math.floor(100 / total)
  const remainder = 100 - weight * total
  newVariantName.value = `Variant ${nextVariantLetter.value}`
  newVariantUrl.value = ''
  newVariantWeights.value = [
    ...variants.map((v, i) => ({
      id: v.id,
      name: v.name,
      weight: weight + (i === 0 ? remainder : 0),
    })),
    { id: '__new__', name: newVariantName.value, weight, isNew: true },
  ]
}

const newVariantTotalWeight = computed(() =>
  newVariantWeights.value.reduce((s, v) => s + v.weight, 0)
)

watch(() => selectedNode.value, (val) => {
  if (val === 'add-variant') initAddVariantForm()
})

watch(newVariantName, (val) => {
  const newRow = newVariantWeights.value.find(v => v.isNew)
  if (newRow) newRow.name = val
})

const saveNewVariant = async () => {
  if (newVariantTotalWeight.value !== 100) return toast.error('Weights must sum to 100')
  addingVariant.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}/variants`, {
      method: 'POST',
      body: {
        name: newVariantName.value,
        target_url: newVariantUrl.value.trim() || undefined,
        traffic_weight: newVariantWeights.value.find(v => v.isNew)!.weight,
        existing_weights: newVariantWeights.value
          .filter(v => !v.isNew)
          .map(v => ({ id: v.id, traffic_weight: v.weight })),
      },
    })
    await refresh()
    selectedNode.value = ''
    toast.success('Variant added')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to add variant')
  } finally {
    addingVariant.value = false
  }
}
```

- [ ] **Step 2: Verify script compiles (TypeScript check)**

Run: `cd .. && npx nuxi typecheck 2>&1 | head -30`
Expected: no errors related to `[id].vue`

- [ ] **Step 3: Commit**

```bash
git add app/pages/dashboard/\[slug\]/experiments/\[id\].vue
git commit -m "feat: add-variant form state in experiment detail script setup"
```

---

## Task 3: Ghost Node in Flow Diagram

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — template, flow column

The variant columns flex row ends at line 330 (`</div>` closing the `v-for` wrapper). The merge-back section starts at line 332. Insert the ghost node column and its connectors between them.

- [ ] **Step 1: Insert ghost node after variant columns**

In the template, find this block (around line 309–330):
```html
        <!-- Variant columns -->
        <div class="flex gap-3 w-full max-w-sm">
          <div v-for="(v, i) in experiment.variants" :key="v.id" class="flex-1 flex flex-col items-center">
            ...
          </div>
        </div>
```

The closing `</div>` of the variant columns wrapper is at approximately line 330. After that `</div>` and before the comment `<!-- Merge back -->`, insert:

```html
        <!-- Ghost variant node (add new variant) -->
        <div
          v-if="experiment.status !== 'completed'"
          class="flex gap-3 w-full max-w-sm"
        >
          <!-- Spacer columns matching existing variants -->
          <div v-for="v in experiment.variants" :key="v.id + '-ghost-spacer'" class="flex-1"></div>
          <!-- Ghost node column -->
          <div class="flex-1 flex flex-col items-center group">
            <div class="flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div class="w-0.5 h-2.5 bg-gray-200"></div>
              <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-transparent border-t-gray-200"></div>
            </div>
            <div
              :class="[
                'mt-1 w-full border rounded-xl px-3 py-3 text-center cursor-pointer transition-all duration-150 border-dashed',
                selectedNode === \'add-variant\'
                  ? \'border-[#C96A3F] ring-2 ring-[#C96A3F] bg-white opacity-100\'
                  : \'border-gray-300 bg-gray-50 opacity-0 group-hover:opacity-100\'
              ]"
              @click="selectedNode = \'add-variant\'"
            >
              <div class="w-3 h-3 rounded-full mx-auto mb-1.5 bg-gray-300"></div>
              <p class="text-[11px] font-bold text-gray-400">+ Variant {{ nextVariantLetter }}</p>
              <p class="text-[10px] text-gray-300 mt-0.5">Click to configure</p>
            </div>
          </div>
        </div>
```

- [ ] **Step 2: Update merge-back connectors to include ghost column spacer**

The merge-back section (around line 332) currently only loops over `experiment.variants`. It now needs to span the ghost column too when the ghost node is visible (i.e. when status !== 'completed'). However, the merge-back is a visual horizontal line; the ghost node does NOT need a merge connector because it's a UI affordance, not a real variant. Leave the merge-back untouched — the layout flex row already handles spacing.

Verify the merge-back section still reads:
```html
        <!-- Merge back -->
        <div class="flex justify-around w-full max-w-sm px-5 pt-1">
          <div v-for="v in experiment.variants" :key="v.id + '-merge'" class="w-0.5 h-3 bg-gray-200"></div>
        </div>
```
No change needed here.

- [ ] **Step 3: Verify the template renders (dev server check)**

Run: `npm run dev` (or `bun run dev`) in the app directory, then navigate to an experiment detail page. Hover over the flow area — the ghost node should fade in after the last variant. Click it — `selectedNode` should become `'add-variant'` (right panel shows the placeholder/nothing yet since Task 4 isn't done). Check browser console for errors.

- [ ] **Step 4: Commit**

```bash
git add app/pages/dashboard/\[slug\]/experiments/\[id\].vue
git commit -m "feat: ghost variant node in experiment detail flow diagram"
```

---

## Task 4: Right Panel — Add Variant Form

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — template, right panel

The right panel has these states in order: placeholder (no selection), `traffic`, `experiment`, `variant-*`, `conversion`. The `add-variant` state goes after the `variant-*` block (which ends at line 538 with `</template>`).

- [ ] **Step 1: Insert the `add-variant` right-panel block**

After the closing `</template>` of the `v-else-if="selectedNode.startsWith('variant-')"` block (line 538), add:

```html
        <!-- ── Add Variant ── -->
        <template v-else-if="selectedNode === 'add-variant'">
          <p class="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Add Variant</p>

          <!-- Name -->
          <div class="mb-4">
            <label for="new-variant-name" class="block text-xs font-semibold text-gray-600 mb-1">Name</label>
            <input
              id="new-variant-name"
              v-model="newVariantName"
              type="text"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C96A3F]"
              :placeholder="`Variant ${nextVariantLetter}`"
            />
          </div>

          <!-- Target URL (edge experiments only) -->
          <div v-if="experiment.type === 'edge'" class="mb-4">
            <label for="new-variant-url" class="block text-xs font-semibold text-gray-600 mb-1">Target URL</label>
            <input
              id="new-variant-url"
              v-model="newVariantUrl"
              type="url"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#C96A3F]"
              placeholder="https://acme.com/pricing-c"
            />
          </div>

          <!-- Traffic distribution -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-600 mb-1">Traffic distribution</p>
            <p class="text-[11px] text-gray-400 mb-3">Redistribute weights evenly among all variants, then adjust if needed. Total must equal 100.</p>

            <div class="space-y-2">
              <div
                v-for="row in newVariantWeights"
                :key="row.id"
                class="flex items-center gap-2"
              >
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <span :class="['w-2.5 h-2.5 rounded-full shrink-0', row.isNew ? \'bg-[#C96A3F]\' : row.id === experiment.variants.find(v => v.is_control)?.id ? \'bg-gray-400\' : \'bg-[#C96A3F]\']"></span>
                  <span :class="['text-xs truncate', row.isNew ? \'text-[#C96A3F] font-semibold\' : \'text-gray-600\']">
                    {{ row.name }}{{ row.isNew ? ' (new)' : '' }}
                  </span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <input
                    v-model.number="row.weight"
                    type="number"
                    min="1"
                    max="98"
                    :class="[
                      'w-14 border rounded px-2 py-1 text-xs text-right focus:outline-none',
                      row.isNew ? \'border-[#C96A3F] text-[#C96A3F] font-semibold focus:border-[#C96A3F]\' : \'border-gray-200 focus:border-[#C96A3F]\'
                    ]"
                  />
                  <span class="text-xs text-gray-400">%</span>
                </div>
              </div>
            </div>

            <!-- Total badge -->
            <div class="flex justify-end items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
              <span class="text-xs text-gray-400">Total:</span>
              <span :class="['text-xs font-bold px-2 py-0.5 rounded-full', newVariantTotalWeight === 100 ? \'bg-green-100 text-green-700\' : \'bg-red-100 text-red-600\']">
                {{ newVariantTotalWeight }}%
              </span>
              <span v-if="newVariantTotalWeight === 100" class="text-green-500 text-xs">✓</span>
            </div>
          </div>

          <!-- Warning banner -->
          <div class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
            <p class="text-[11px] text-amber-700">
              ⚠ Only new visitors will be assigned to {{ newVariantName || `Variant ${nextVariantLetter}` }}.
              Existing visitors keep their current assignment.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              type="button"
              :disabled="addingVariant || newVariantTotalWeight !== 100 || !newVariantName.trim() || (experiment.type === 'edge' && !newVariantUrl.trim())"
              :class="[
                'flex-1 bg-[#C96A3F] text-white text-sm font-semibold py-2 rounded-lg transition-opacity',
                (addingVariant || newVariantTotalWeight !== 100 || !newVariantName.trim() || (experiment.type === \'edge\' && !newVariantUrl.trim())) ? \'opacity-40 cursor-not-allowed\' : \'hover:opacity-90\'
              ]"
              @click="saveNewVariant"
            >
              {{ addingVariant ? 'Adding…' : 'Add variant' }}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
              @click="selectedNode = ''"
            >
              Cancel
            </button>
          </div>
        </template>
```

- [ ] **Step 2: Manual smoke test in browser**

With dev server running:
1. Navigate to an experiment detail page (status must be `draft`, `active`, or `paused` — not `completed`)
2. Hover over the flow diagram — ghost node should fade in after last variant
3. Click ghost node — right panel shows the Add Variant form
4. Confirm the name field is pre-filled (`Variant C` or appropriate letter)
5. Confirm weights are pre-distributed (e.g. 33/33/34 for 3 total)
6. For an edge experiment: confirm URL field is visible
7. Edit weights so they don't sum to 100 — confirm "Add variant" button is disabled
8. Fix weights to 100 — confirm button is enabled
9. Click Cancel — panel closes, ghost node reverts to deselected style

- [ ] **Step 3: Test the full create flow**

1. Fill in valid name + URL (if edge) + valid weights summing to 100
2. Click "Add variant"
3. Confirm toast "Variant added" appears
4. Confirm the flow diagram now shows the new variant node
5. Click the new variant node — confirm right panel shows the new variant's data (0 impressions, 0 conversions)
6. Confirm other variants' traffic weights were updated in the flow

- [ ] **Step 4: Test completed experiment guard**

Navigate to a completed experiment — the ghost node must NOT appear (check `v-if="experiment.status !== 'completed'"`).

- [ ] **Step 5: Commit**

```bash
git add app/pages/dashboard/\[slug\]/experiments/\[id\].vue
git commit -m "feat: add-variant right panel form in experiment detail"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Ghost node invisible by default, fades on hover | Task 3 (opacity-0 + group-hover:opacity-100) |
| Ghost node `+ Variant {letter}` label + "Click to configure" | Task 3 |
| Selected state: `ring-2 ring-[#C96A3F]` | Task 3 |
| `nextVariantLetter` computed from non-control count | Task 2 |
| Not shown when status === 'completed' | Task 3 (`v-if`) |
| Right panel "Add variant" form on `selectedNode === 'add-variant'` | Task 4 |
| Name field | Task 4 |
| URL field only for edge type | Task 4 |
| Weights auto-distributed on open | Task 2 (`initAddVariantForm`) |
| New variant row highlighted orange | Task 4 |
| Running total badge green/red | Task 4 |
| Button disabled unless total === 100 + name + url for edge | Task 4 |
| Warning banner (existing visitors keep assignment) | Task 4 |
| Cancel resets `selectedNode = ''` | Task 4 |
| API: auth + workspace + member check | Task 1 |
| API: status !== 'completed' check | Task 1 |
| API: name non-empty, weight ≥ 1, sum = 100 | Task 1 |
| API: insert variant + update existing weights | Task 1 |
| API: return new variant with 0 impressions/conversions | Task 1 |
| After save: refresh data, reset panel | Task 2 (`saveNewVariant`) |
| Watch newVariantName → update label in weights array | Task 2 |
