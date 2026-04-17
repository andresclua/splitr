# Variant CRUD — Design Spec

**Date:** 2026-04-17

## Summary

Complete the CRUD lifecycle for variants on the experiment detail page. Create already works (ghost node). This spec adds: rename (Update name), delete with traffic redistribution modal, and editable traffic weights in the experiment panel.

---

## Architecture

Three surface areas in one file — `app/pages/dashboard/[slug]/experiments/[id].vue` — plus two new server endpoints and one extension to an existing endpoint.

### New endpoints

| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/api/workspaces/[slug]/experiments/[id]/variants/[variantId]` | Update name, description, rules for one variant |
| DELETE | `/api/workspaces/[slug]/experiments/[id]/variants/[variantId]` | Delete variant + redistribute weights |

### Existing endpoint extended

`PATCH /api/workspaces/[slug]/experiments/[id]` gains an optional `variantWeights: Array<{ id: string; traffic_weight: number }>` field. When present, it updates the `traffic_weight` of each listed variant. Weights must sum to 100 or the request is rejected with 400.

---

## Feature 1: Rename Variant

### UI change — variant panel

Add a **Name** input above Description in the per-variant edit section of the right panel:

```
── editable section ──
NAME
[input: editVariantName   ]

DESCRIPTION
[input: editVariantDescription]

UTM RULES
...

[Save]  [Delete variant]
```

The existing Save button sends name + description + rules together.

### Script setup changes

Add `editVariantName = ref('')` alongside `editVariantDescription`. Seed it in the `selectedNode` watcher's `variant-*` branch:

```typescript
editVariantName.value = v.name
```

Update `saveVariant` to call the new PATCH endpoint instead of the experiment PATCH:

```typescript
const saveVariant = async (variantId: string) => {
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

### New server endpoint — PATCH variant

`app/server/api/workspaces/[slug]/experiments/[id]/variants/[variantId].patch.ts`

- Auth → workspace → member → experiment check
- Read `variantId` from route params
- Validate: `name` required and non-empty (trim), `rules` array if present must have `param`/`value` strings
- Update `variants` row: `name`, `description`, and optionally `rules` (stored as JSONB)
- Return updated variant fields

### Constraints

- Cannot rename a variant on a completed experiment (status === 'completed' → 400)
- Name must be non-empty after trim

---

## Feature 2: Delete Variant

### UI change — variant panel

Add a **"Delete variant"** button alongside Save. Disabled when `v.is_control` (can't delete the control) or when the experiment has only 2 variants total (deleting would leave just 1).

```
[Save]  [Delete variant]   ← Delete is red/outline, disabled for control
```

Clicking Delete opens a confirmation modal overlay.

### Delete modal

Shown via a `showDeleteModal = ref(false)` + `deletingVariantId = ref('')` in script setup. The modal displays:

```
Delete [variant name]?
Redistribute its X% traffic to remaining variants.

[variant A name]   ████░░   [input: weight%]
[variant B name]   ████░░   [input: weight%]
...
Total: 100%  ← green if valid, red if not

[Delete & save]   [Cancel]
```

- Inputs are pre-populated with an even split of the freed traffic among remaining variants
- User can adjust freely as long as they sum to 100
- "Delete & save" disabled until total === 100

### Script setup additions

```typescript
const showDeleteModal = ref(false)
const deletingVariantId = ref('')
const deleteRedistWeights = ref<Array<{ id: string; name: string; weight: number }>>([])

const openDeleteModal = (variantId: string) => {
  const exp = experiment.value!
  const remaining = exp.variants.filter(v => v.id !== variantId)
  const freed = exp.variants.find(v => v.id === variantId)!.traffic_weight
  // distribute freed weight evenly, remainder goes to first variant
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

const deleteRedistTotal = computed(() =>
  deleteRedistWeights.value.reduce((s, v) => s + v.weight, 0)
)

const savingDelete = ref(false)

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

### New server endpoint — DELETE variant

`app/server/api/workspaces/[slug]/experiments/[id]/variants/[variantId].delete.ts`

- Auth → workspace → member → experiment check
- Validate: experiment not completed
- Validate: variant exists and belongs to this experiment
- Validate: variant is not `is_control`
- Validate: experiment has at least 3 variants (so after delete at least 2 remain)
- Validate: `new_weights` array contains exactly the remaining variant IDs (no more, no less) and their `traffic_weight` values sum to 100
- Delete the variant row
- Update `traffic_weight` for each remaining variant per `new_weights`
- Return `{ deleted: variantId }`

### After delete

After successful delete, `selectedNode` is set to `'experiment'` so the user sees the updated experiment panel.

---

## Feature 3: Edit Traffic Weights (in Experiment Panel)

### UI change — experiment panel

The "Split" row in the experiment detail card becomes a set of editable number inputs, one per variant:

```
── editable section ──
EXPERIMENT NAME
[input: editExpName]

TRAFFIC SPLIT
Control    ████░░  [34]%
Variant B  ████░░  [33]%
Variant C  ████░░  [33]%
Total: 100%  ← green/red

UTM OVERRIDE  [toggle]

[Save]
```

### Script setup changes

Add `editVariantWeights = ref<Array<{ id: string; name: string; weight: number }>>([])` and a `weightsTotal` computed. Seed in the `selectedNode === 'experiment'` watcher branch:

```typescript
editVariantWeights.value = exp.variants.map(v => ({ id: v.id, name: v.name, weight: v.traffic_weight }))
```

Extend `saveExperiment` to include weights in the PATCH body:

```typescript
body: {
  name: editExpName.value.trim(),
  override_assignment: editOverrideAssignment.value,
  variantWeights: editVariantWeights.value.map(v => ({ id: v.id, traffic_weight: v.weight })),
}
```

Disable Save when `weightsTotal !== 100` in addition to the empty-name check.

### Existing endpoint extension — PATCH experiment

`app/server/api/workspaces/[slug]/experiments/[id].patch.ts` — add handling for `variantWeights`:

```typescript
if (Array.isArray(body.variantWeights) && body.variantWeights.length > 0) {
  const total = body.variantWeights.reduce((s, v) => s + Number(v.traffic_weight), 0)
  if (total !== 100) throw createError({ statusCode: 400, message: 'Weights must sum to 100' })
  for (const entry of body.variantWeights) {
    await supabase.from('variants')
      .update({ traffic_weight: Number(entry.traffic_weight) })
      .eq('id', entry.id)
      .eq('experiment_id', id)
  }
}
```

---

## What Is NOT Changed

- Flow diagram node layout and click behavior
- Add Variant ghost node and form
- Control variant's name/description/rules (editable like any other variant — is_control only blocks deletion)
- Completed experiments: all Save/Delete buttons are disabled when `experiment.status === 'completed'`

---

## Visual Style

Delete button: `border border-red-200 text-red-600 text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-red-50` — disabled state: `opacity-40 cursor-not-allowed`

Modal overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/30` with a `max-w-sm w-full bg-white rounded-2xl p-6 shadow-xl` card.

Weight input: `w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-[#C96A3F]`
