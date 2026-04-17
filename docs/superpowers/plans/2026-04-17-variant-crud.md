# Variant CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete variant CRUD: rename (name editable in variant panel), delete with traffic redistribution modal, and editable traffic weights in the experiment panel.

**Architecture:** Two new server endpoints (`PATCH /variants/[variantId]`, `DELETE /variants/[variantId]`), one extension to the existing experiment PATCH endpoint (`variantWeights` array), and template + script changes in the single page component `app/pages/dashboard/[slug]/experiments/[id].vue`.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>` + TypeScript, Tailwind CSS, Supabase (via `@supabase/supabase-js`), existing `$fetch` + `useFetch` + `toast` + `refresh` patterns.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Create | `app/server/api/workspaces/[slug]/experiments/[id]/variants/[variantId].patch.ts` | Rename + description + rules update for one variant |
| Create | `app/server/api/workspaces/[slug]/experiments/[id]/variants/[variantId].delete.ts` | Delete variant + redistribute weights |
| Modify | `app/server/api/workspaces/[slug]/experiments/[id].patch.ts` | Add `variantWeights` handling |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — `<script setup>` | Add rename/delete/weights state + functions |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — variant panel template | Name input + Delete button |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — experiment panel template | Editable traffic split inputs |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — template (end) | Delete confirmation modal |

---

## Task 1: PATCH Variant Endpoint (Rename + Description + Rules)

**Files:**
- Create: `app/server/api/workspaces/[slug]/experiments/[id]/variants/[variantId].patch.ts`

- [ ] **Step 1: Create the endpoint file**

```typescript
import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const id = getRouterParam(event, 'id')!
  const variantId = getRouterParam(event, 'variantId')!
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
    .from('experiments').select('id, status')
    .eq('id', id).eq('workspace_id', ws.id).single()
  if (!exp) throw createError({ statusCode: 404, message: 'Experiment not found' })
  if (exp.status === 'completed') throw createError({ statusCode: 400, message: 'Cannot edit variants of a completed experiment' })

  // Variant check
  const { data: variant } = await supabase
    .from('variants').select('id')
    .eq('id', variantId).eq('experiment_id', id).single()
  if (!variant) throw createError({ statusCode: 404, message: 'Variant not found' })

  // Validate name
  const name: string = (body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })

  // Build update
  const updates: Record<string, unknown> = {
    name,
    description: (body.description ?? '').trim() || null,
  }
  if (Array.isArray(body.rules)) {
    updates.rules = (body.rules as { param: string; value: string }[])
      .filter(r => r.param?.trim() && r.value?.trim())
      .map(r => ({ param: r.param.trim(), value: r.value.trim() }))
  }

  const { error } = await supabase
    .from('variants').update(updates)
    .eq('id', variantId).eq('experiment_id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { id: variantId }
})
```

- [ ] **Step 2: Verify the endpoint file was created at the correct path**

Run: `ls "app/server/api/workspaces/[slug]/experiments/[id]/variants/"`

Expected output includes: `[variantId].patch.ts` and `index.post.ts`

- [ ] **Step 3: Commit**

```bash
git add "app/server/api/workspaces/[slug]/experiments/[id]/variants/[variantId].patch.ts"
git commit -m "feat: PATCH variant endpoint (rename, description, rules)"
```

---

## Task 2: DELETE Variant Endpoint

**Files:**
- Create: `app/server/api/workspaces/[slug]/experiments/[id]/variants/[variantId].delete.ts`

- [ ] **Step 1: Create the endpoint file**

```typescript
import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const id = getRouterParam(event, 'id')!
  const variantId = getRouterParam(event, 'variantId')!
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
    .from('experiments').select('id, status')
    .eq('id', id).eq('workspace_id', ws.id).single()
  if (!exp) throw createError({ statusCode: 404, message: 'Experiment not found' })
  if (exp.status === 'completed') throw createError({ statusCode: 400, message: 'Cannot delete variants of a completed experiment' })

  // Variant check
  const { data: variant } = await supabase
    .from('variants').select('id, is_control')
    .eq('id', variantId).eq('experiment_id', id).single()
  if (!variant) throw createError({ statusCode: 404, message: 'Variant not found' })
  if (variant.is_control) throw createError({ statusCode: 400, message: 'Cannot delete the control variant' })

  // Must have at least 3 variants before delete (so at least 2 remain)
  const { count } = await supabase
    .from('variants').select('id', { count: 'exact', head: true })
    .eq('experiment_id', id)
  if ((count ?? 0) < 3) throw createError({ statusCode: 400, message: 'Cannot delete: experiment must keep at least 2 variants' })

  // Validate new_weights
  const newWeights: Array<{ id: string; traffic_weight: number }> = body.new_weights ?? []
  if (!Array.isArray(body.new_weights) || newWeights.length === 0)
    throw createError({ statusCode: 400, message: 'new_weights is required' })

  // Fetch remaining variant IDs (excluding the one being deleted)
  const { data: remaining } = await supabase
    .from('variants').select('id')
    .eq('experiment_id', id).neq('id', variantId)
  const remainingIds = new Set((remaining ?? []).map(v => v.id))
  const providedIds = new Set(newWeights.map(v => v.id))

  if (remainingIds.size !== providedIds.size || ![...remainingIds].every(id => providedIds.has(id)))
    throw createError({ statusCode: 400, message: 'new_weights must cover exactly the remaining variants' })

  const total = newWeights.reduce((s, v) => s + Number(v.traffic_weight), 0)
  if (total !== 100) throw createError({ statusCode: 400, message: `Weights must sum to 100 (got ${total})` })

  // Delete variant
  const { error: deleteError } = await supabase
    .from('variants').delete().eq('id', variantId).eq('experiment_id', id)
  if (deleteError) throw createError({ statusCode: 500, message: deleteError.message })

  // Update remaining weights
  for (const entry of newWeights) {
    const { error: updateError } = await supabase
      .from('variants')
      .update({ traffic_weight: Number(entry.traffic_weight) })
      .eq('id', entry.id).eq('experiment_id', id)
    if (updateError) throw createError({ statusCode: 500, message: `Weight update failed for ${entry.id}: ${updateError.message}` })
  }

  return { deleted: variantId }
})
```

- [ ] **Step 2: Commit**

```bash
git add "app/server/api/workspaces/[slug]/experiments/[id]/variants/[variantId].delete.ts"
git commit -m "feat: DELETE variant endpoint with weight redistribution"
```

---

## Task 3: Extend PATCH Experiment with variantWeights

**Files:**
- Modify: `app/server/api/workspaces/[slug]/experiments/[id].patch.ts`

- [ ] **Step 1: Add variantWeights handling after the existing variantDescriptions block**

Find the line `return data` at the bottom of the file (line 65). Before it, after the `variantDescriptions` block, add:

```typescript
  // Update variant traffic weights if provided
  if (Array.isArray(body.variantWeights) && body.variantWeights.length > 0) {
    const weights = body.variantWeights as Array<{ id: string; traffic_weight: number }>
    const total = weights.reduce((s, v) => s + Number(v.traffic_weight), 0)
    if (total !== 100) throw createError({ statusCode: 400, message: `Weights must sum to 100 (got ${total})` })
    for (const entry of weights) {
      const { error: weightError } = await supabase
        .from('variants')
        .update({ traffic_weight: Number(entry.traffic_weight) })
        .eq('id', entry.id)
        .eq('experiment_id', id)
      if (weightError) throw createError({ statusCode: 500, message: `Weight update failed for ${entry.id}: ${weightError.message}` })
    }
  }
```

So the end of the file becomes:

```typescript
  // Update variant descriptions if provided
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

  // Update variant traffic weights if provided
  if (Array.isArray(body.variantWeights) && body.variantWeights.length > 0) {
    const weights = body.variantWeights as Array<{ id: string; traffic_weight: number }>
    const total = weights.reduce((s, v) => s + Number(v.traffic_weight), 0)
    if (total !== 100) throw createError({ statusCode: 400, message: `Weights must sum to 100 (got ${total})` })
    for (const entry of weights) {
      const { error: weightError } = await supabase
        .from('variants')
        .update({ traffic_weight: Number(entry.traffic_weight) })
        .eq('id', entry.id)
        .eq('experiment_id', id)
      if (weightError) throw createError({ statusCode: 500, message: `Weight update failed for ${entry.id}: ${weightError.message}` })
    }
  }

  return data
})
```

- [ ] **Step 2: Commit**

```bash
git add "app/server/api/workspaces/[slug]/experiments/[id].patch.ts"
git commit -m "feat: extend PATCH experiment to accept variantWeights"
```

---

## Task 4: Script Setup — Rename + Delete State

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — `<script setup>` block

- [ ] **Step 1: Add editVariantName ref to the per-node inline edit state section**

Find the `// Variant (shared, reset per variant on selectedNode change)` comment (around line 120). Add `editVariantName` alongside the existing variant refs:

```typescript
// Variant (shared, reset per variant on selectedNode change)
const editVariantName = ref('')
const editVariantDescription = ref('')
const editVariantRules = ref<Rule[]>([])
const savingVariant = ref(false)
```

- [ ] **Step 2: Add delete modal state after the variant refs**

After `const savingVariant = ref(false)`, add:

```typescript
// Delete variant modal
const showDeleteModal = ref(false)
const deletingVariantId = ref('')
const deleteRedistWeights = ref<Array<{ id: string; name: string; weight: number }>>([])
const deleteRedistTotal = computed(() =>
  deleteRedistWeights.value.reduce((s, v) => s + v.weight, 0)
)
const savingDelete = ref(false)
```

- [ ] **Step 3: Seed editVariantName in the selectedNode watcher**

Find the `variant-*` branch of the `watch(selectedNode, ...)`:

```typescript
  } else if (val.startsWith('variant-')) {
    const v = exp.variants.find(v => 'variant-' + v.id === val)
    if (v) {
      editVariantDescription.value = v.description ?? ''
      editVariantRules.value = v.rules ? v.rules.map(r => ({ ...r })) : []
    }
```

Replace with:

```typescript
  } else if (val.startsWith('variant-')) {
    const v = exp.variants.find(v => 'variant-' + v.id === val)
    if (v) {
      editVariantName.value = v.name
      editVariantDescription.value = v.description ?? ''
      editVariantRules.value = v.rules ? v.rules.map(r => ({ ...r })) : []
    }
```

- [ ] **Step 4: Update saveVariant to call the new PATCH variant endpoint**

Find the existing `saveVariant` function and replace it entirely:

```typescript
const saveVariant = async (variantId: string) => {
  if (!editVariantName.value.trim()) return
  savingVariant.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}/variants/${variantId}`, {
      method: 'PATCH',
      body: {
        name: editVariantName.value.trim(),
        description: editVariantDescription.value,
        rules: editVariantRules.value.filter(r => r.param.trim() && r.value.trim()),
      },
    })
    await refresh()
    const saved = experiment.value?.variants.find(v => v.id === variantId)
    if (saved) {
      editVariantName.value = saved.name
      editVariantDescription.value = saved.description ?? ''
      editVariantRules.value = saved.rules ? saved.rules.map(r => ({ ...r })) : []
    }
    toast.success('Variant updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save')
  } finally {
    savingVariant.value = false
  }
}
```

- [ ] **Step 5: Add openDeleteModal and confirmDelete functions**

After `removeEditRule`, add:

```typescript
const openDeleteModal = (variantId: string) => {
  const exp = experiment.value!
  const remaining = exp.variants.filter(v => v.id !== variantId)
  const freed = exp.variants.find(v => v.id === variantId)!.traffic_weight
  const base = Math.floor(freed / remaining.length)
  const rem = freed - base * remaining.length
  deleteRedistWeights.value = remaining.map((v, i) => ({
    id: v.id,
    name: v.name,
    weight: v.traffic_weight + base + (i === 0 ? rem : 0),
  }))
  deletingVariantId.value = variantId
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (deleteRedistTotal.value !== 100) return
  savingDelete.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}/variants/${deletingVariantId.value}`, {
      method: 'DELETE',
      body: { new_weights: deleteRedistWeights.value.map(v => ({ id: v.id, traffic_weight: v.weight })) },
    })
    await refresh()
    selectedNode.value = 'experiment'
    showDeleteModal.value = false
    toast.success('Variant deleted')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to delete')
  } finally {
    savingDelete.value = false
  }
}
```

- [ ] **Step 6: Verify no references to old saveVariant body shape remain**

Run: `grep -n "variantDescriptions" "app/pages/dashboard/[slug]/experiments/[id].vue"`

Expected: no matches (the old `saveVariant` sent via `variantDescriptions`; the new one calls `/variants/[variantId]` directly).

- [ ] **Step 7: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: variant rename + delete script state"
```

---

## Task 5: Script Setup — Traffic Weights Editor State

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — `<script setup>` block

- [ ] **Step 1: Add editVariantWeights ref and weightsTotal computed to the experiment edit state section**

Find the `// Experiment` comment (around line 116). Add the weights ref + computed alongside the experiment refs:

```typescript
// Experiment
const editExpName = ref('')
const editOverrideAssignment = ref(false)
const editVariantWeights = ref<Array<{ id: string; name: string; weight: number }>>([])
const weightsTotal = computed(() => editVariantWeights.value.reduce((s, v) => s + v.weight, 0))
const savingExperiment = ref(false)
```

- [ ] **Step 2: Seed editVariantWeights in the selectedNode watcher's experiment branch**

Find the `experiment` branch:

```typescript
  } else if (val === 'experiment') {
    editExpName.value = exp.name
    editOverrideAssignment.value = exp.override_assignment ?? false
```

Replace with:

```typescript
  } else if (val === 'experiment') {
    editExpName.value = exp.name
    editOverrideAssignment.value = exp.override_assignment ?? false
    editVariantWeights.value = exp.variants.map(v => ({ id: v.id, name: v.name, weight: v.traffic_weight }))
```

- [ ] **Step 3: Update saveExperiment to send variantWeights and resync after refresh**

Find `saveExperiment` and replace the `$fetch` body + resync block:

```typescript
const saveExperiment = async () => {
  if (!editExpName.value.trim()) return
  if (weightsTotal.value !== 100) return
  savingExperiment.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: {
        name: editExpName.value.trim(),
        override_assignment: editOverrideAssignment.value,
        variantWeights: editVariantWeights.value.map(v => ({ id: v.id, traffic_weight: v.weight })),
      },
    })
    await refresh()
    editExpName.value = experiment.value?.name ?? editExpName.value
    editOverrideAssignment.value = experiment.value?.override_assignment ?? editOverrideAssignment.value
    editVariantWeights.value = experiment.value?.variants.map(v => ({ id: v.id, name: v.name, weight: v.traffic_weight })) ?? editVariantWeights.value
    toast.success('Experiment updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save')
  } finally {
    savingExperiment.value = false
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: traffic weights editor script state"
```

---

## Task 6: Template — Variant Panel: Name Input + Delete Button

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — variant panel template (lines ~706–758)

- [ ] **Step 1: Add Name input above Description and add Delete button alongside Save**

Find the editable section of the variant panel (inside `<div class="px-5 pt-2 pb-4 border-t border-gray-100 space-y-3">`). The section currently starts with the Description `<div>`. Replace the entire `<div class="px-5 pt-2 pb-4 border-t border-gray-100 space-y-3">` block with:

```html
                <div class="px-5 pt-2 pb-4 border-t border-gray-100 space-y-3">
                  <div>
                    <label :for="'edit-name-' + v.id" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Name</label>
                    <input
                      :id="'edit-name-' + v.id"
                      v-model="editVariantName"
                      type="text"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
                    />
                  </div>
                  <div>
                    <label :for="'edit-desc-' + v.id" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                    <input
                      :id="'edit-desc-' + v.id"
                      v-model="editVariantDescription"
                      type="text"
                      placeholder="What's different in this variant? (optional)"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      UTM rules
                      <span class="normal-case font-normal text-gray-400 ml-1">(OR — any match routes here)</span>
                    </p>
                    <div v-for="(rule, ri) in editVariantRules" :key="ri" class="flex items-center gap-2 mb-2">
                      <input
                        v-model="rule.param"
                        type="text"
                        placeholder="utm_source"
                        class="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300"
                      />
                      <span class="text-xs text-gray-400">=</span>
                      <input
                        v-model="rule.value"
                        type="text"
                        placeholder="facebook"
                        class="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300"
                      />
                      <button type="button" class="text-gray-300 hover:text-red-400 transition-colors shrink-0" @click="removeEditRule(ri)">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      class="text-xs text-[#C96A3F] hover:text-[#A8522D] font-medium transition-colors flex items-center gap-1"
                      @click="addEditRule"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add rule
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      :disabled="savingVariant || !editVariantName.trim()"
                      :class="['bg-[#C96A3F] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-opacity', (savingVariant || !editVariantName.trim()) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90']"
                      @click="saveVariant(v.id)"
                    >{{ savingVariant ? 'Saving…' : 'Save' }}</button>
                    <button
                      v-if="!v.is_control && experiment.variants.length > 2"
                      type="button"
                      :disabled="savingVariant"
                      :class="['border border-red-200 text-red-600 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors', savingVariant ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-50']"
                      @click="openDeleteModal(v.id)"
                    >Delete variant</button>
                  </div>
                </div>
```

- [ ] **Step 2: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: name input + delete button in variant panel"
```

---

## Task 7: Template — Delete Confirmation Modal

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — end of `<template>`, before `</div>` that closes the root

- [ ] **Step 1: Add delete modal at the end of the template, before the closing root `</div>`**

The root `<template>` has `<div v-if="experiment" class="flex flex-col h-screen overflow-hidden">` as its only child. Find the closing `</div>` of that root div (the very last `</div>` before `</template>`) and insert the modal before it:

```html
    <!-- ── Delete variant modal ── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" @click.self="showDeleteModal = false">
          <div class="max-w-sm w-full mx-4 bg-white rounded-2xl p-6 shadow-xl">
            <h3 class="text-base font-bold text-gray-900 mb-1">
              Delete {{ experiment?.variants.find(v => v.id === deletingVariantId)?.name }}?
            </h3>
            <p class="text-sm text-gray-500 mb-5">
              Redistribute its {{ experiment?.variants.find(v => v.id === deletingVariantId)?.traffic_weight }}% traffic to remaining variants.
            </p>

            <div class="space-y-3 mb-4">
              <div v-for="row in deleteRedistWeights" :key="row.id" class="flex items-center gap-3">
                <span class="text-sm text-gray-700 flex-1 truncate">{{ row.name }}</span>
                <div class="flex items-center gap-1 shrink-0">
                  <input
                    v-model.number="row.weight"
                    type="number"
                    min="1"
                    max="98"
                    class="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
                  />
                  <span class="text-sm text-gray-400">%</span>
                </div>
              </div>
            </div>

            <div class="flex justify-end items-center gap-1.5 mb-5 pb-4 border-b border-gray-100">
              <span class="text-xs text-gray-400">Total:</span>
              <span :class="['text-xs font-bold px-2 py-0.5 rounded-full', deleteRedistTotal === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600']">
                {{ deleteRedistTotal }}%
              </span>
            </div>

            <div class="flex gap-2">
              <button
                type="button"
                :disabled="savingDelete || deleteRedistTotal !== 100"
                :class="['flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-lg transition-opacity', (savingDelete || deleteRedistTotal !== 100) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-700']"
                @click="confirmDelete"
              >{{ savingDelete ? 'Deleting…' : 'Delete & save' }}</button>
              <button
                type="button"
                class="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                @click="showDeleteModal = false"
              >Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
```

- [ ] **Step 2: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: delete variant confirmation modal with weight redistribution"
```

---

## Task 8: Template — Experiment Panel: Editable Traffic Split

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — experiment panel template (lines ~609–648)

- [ ] **Step 1: Replace the read-only Split row with editable weight inputs**

Find the experiment detail card's `<div class="px-5 py-1">` section (inside `selectedNode === 'experiment'`). It currently has:

```html
            <div class="px-5 py-1">
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Split</span>
                <span class="text-xs font-semibold text-gray-700">{{ experiment.variants.map(v => v.traffic_weight + '%').join(' / ') }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Started</span>
                <span class="text-xs font-semibold text-gray-700">{{ formatDate(experiment.started_at) }}</span>
              </div>
            </div>
```

Replace with:

```html
            <div class="px-5 py-1">
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Started</span>
                <span class="text-xs font-semibold text-gray-700">{{ formatDate(experiment.started_at) }}</span>
              </div>
            </div>
```

- [ ] **Step 2: Add the Traffic split editor section to the editable footer**

Find the editable section of the experiment panel (inside `<div class="px-5 pt-2 pb-4 border-t border-gray-100 space-y-3">`). It currently starts with the Experiment name div and ends with the Save button. Add a Traffic split block between the UTM override toggle and the Save button:

```html
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Traffic split</p>
                <div class="space-y-2">
                  <div v-for="(row, i) in editVariantWeights" :key="row.id" class="flex items-center gap-2">
                    <div :class="['w-2.5 h-2.5 rounded-full shrink-0', variantColors[i] ?? 'bg-gray-400']"></div>
                    <span class="text-xs text-gray-600 flex-1 truncate">{{ row.name }}</span>
                    <div class="flex items-center gap-1 shrink-0">
                      <input
                        v-model.number="row.weight"
                        type="number"
                        min="1"
                        max="98"
                        class="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right font-mono focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
                      />
                      <span class="text-xs text-gray-400">%</span>
                    </div>
                  </div>
                </div>
                <div class="flex justify-end items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                  <span class="text-xs text-gray-400">Total:</span>
                  <span :class="['text-xs font-bold px-2 py-0.5 rounded-full', weightsTotal === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600']">
                    {{ weightsTotal }}%
                  </span>
                </div>
              </div>
```

- [ ] **Step 3: Update the Save button disabled condition to include weightsTotal**

Find the Save button in the experiment panel:

```html
              <button
                type="button"
                :disabled="savingExperiment || !editExpName.trim()"
                :class="['bg-[#C96A3F] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-opacity', (savingExperiment || !editExpName.trim()) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90']"
                @click="saveExperiment"
              >{{ savingExperiment ? 'Saving…' : 'Save' }}</button>
```

Replace with:

```html
              <button
                type="button"
                :disabled="savingExperiment || !editExpName.trim() || weightsTotal !== 100"
                :class="['bg-[#C96A3F] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-opacity', (savingExperiment || !editExpName.trim() || weightsTotal !== 100) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90']"
                @click="saveExperiment"
              >{{ savingExperiment ? 'Saving…' : 'Save' }}</button>
```

- [ ] **Step 4: Run tests to verify no regressions**

```bash
pnpm test
```

Expected: all 54 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: editable traffic split in experiment panel"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| PATCH /variants/[variantId] — auth, workspace, member, experiment checks | Task 1 |
| PATCH /variants/[variantId] — validate name non-empty, update name/description/rules | Task 1 |
| PATCH /variants/[variantId] — reject on completed experiment | Task 1 |
| DELETE /variants/[variantId] — auth, workspace, member, experiment checks | Task 2 |
| DELETE /variants/[variantId] — reject if is_control | Task 2 |
| DELETE /variants/[variantId] — reject if fewer than 3 variants | Task 2 |
| DELETE /variants/[variantId] — validate new_weights covers exactly remaining, sums to 100 | Task 2 |
| DELETE /variants/[variantId] — delete variant + update remaining weights | Task 2 |
| PATCH experiment — variantWeights array, validate sum=100, update weights | Task 3 |
| editVariantName ref + watcher seeding | Task 4 |
| saveVariant migrated to new PATCH endpoint, includes name | Task 4 |
| openDeleteModal + confirmDelete functions | Task 4 |
| editVariantWeights + weightsTotal computed | Task 5 |
| saveExperiment sends variantWeights, disabled when weightsTotal ≠ 100 | Task 5 |
| Variant panel: Name input above Description | Task 6 |
| Variant panel: Delete button (hidden for control, hidden when ≤2 variants) | Task 6 |
| Delete modal: weight redistribution inputs, total badge, Delete & save / Cancel | Task 7 |
| Experiment panel: traffic split with per-variant weight inputs + total badge | Task 8 |
| Save button disabled when weightsTotal ≠ 100 | Task 8 |

All spec requirements covered. No placeholders. Types consistent: `deleteRedistWeights` uses `{ id, name, weight }` everywhere; `editVariantWeights` uses same shape.
