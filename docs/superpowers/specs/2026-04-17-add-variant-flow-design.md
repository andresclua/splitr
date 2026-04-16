# Add Variant from Flow View — Design Spec

**Date:** 2026-04-17

## Summary

Add the ability to add a new variant directly from the experiment detail page flow diagram. A ghost node appears on hover after the last variant in the flow, and clicking it opens an "Add variant" form in the right panel. New visitors are assigned to the new variant immediately; existing visitors keep their cookie assignment (Option B behavior).

---

## Architecture

Two files change:

1. **`app/pages/dashboard/[slug]/experiments/[id].vue`** — ghost node in the flow diagram, new `'add-variant'` right-panel state with a form.
2. **`app/server/api/workspaces/[slug]/experiments/[id]/variants/index.post.ts`** *(new file)* — endpoint that inserts the new variant and updates all existing variants' `traffic_weight` in a single transaction.

No new Vue components. Everything is inline in the existing SFC and a single new server route file.

---

## Ghost Node (Flow Diagram)

The variant columns in the flow are a flex row rendered with `v-for="(v, i) in experiment.variants"`. After the last variant column, add a ghost node column:

- **Visibility:** only when `experiment.status !== 'completed'`
- **Default state:** invisible (opacity-0), takes up space so layout doesn't shift
- **Hover state:** fades in (opacity-100, transition), shows a dashed gray card with:
  - A gray dot
  - Label: `+ Variant ${nextVariantLetter}` (computed from existing variant count)
  - Text: `"Click to configure"`
- **Click:** sets `selectedNode = 'add-variant'`
- **Selected state:** same highlight ring as other variant nodes (`ring-2 ring-[#C96A3F]`)

`nextVariantLetter` is a computed: takes the count of non-control variants and maps to `['B','C','D','E','F','G','H'][count]` (count = 1 → 'C', count = 2 → 'D', etc.).

The ghost node also needs connector lines to fit the flow:
- A vertical connector from the experiment node down to the ghost variant node (same as existing variant connectors)
- A merge connector from the ghost node down to the conversion node (same as existing merge connectors)

---

## Right Panel — Add Variant Form

When `selectedNode === 'add-variant'`, the right panel shows:

```
ADD VARIANT                              [header label]

Name
[Variant C                             ]

Target URL  (only for edge experiments)
[https://acme.com/pricing-c            ]

Traffic distribution
Redistribute weights evenly among all variants,
then adjust if needed. Total must equal 100.

  ⚪ Control            [33] %
  🟠 Variant B          [33] %
  🟠 Variant C (new)    [34] %   ← highlighted differently
                        ——
                       100 ✓

⚠ Only new visitors will be assigned to Variant C.
  Existing visitors keep their current assignment.

[Add variant]   [Cancel]
```

**Weight fields:**
- All existing variants + the new one shown with editable number inputs
- On mount: auto-distributed evenly (floor division, last variant gets remainder)
- The new variant row is visually highlighted (orange text/border)
- A running total badge (green if 100, red otherwise)
- "Add variant" button disabled unless total === 100 and name is non-empty (and URL non-empty for edge type)

**Cancel:** resets `selectedNode = ''`

---

## API Endpoint

**File:** `app/server/api/workspaces/[slug]/experiments/[id]/variants/index.post.ts`

**Method:** `POST /api/workspaces/[slug]/experiments/[id]/variants`

**Request body:**
```typescript
{
  name: string              // required, non-empty
  target_url?: string       // required for edge experiments, omitted for component
  traffic_weight: number    // integer 1–98
  existing_weights: Array<{ id: string; traffic_weight: number }>
  // updated weights for all pre-existing variants
}
```

**Server logic:**
1. Auth check (same pattern as PATCH endpoint)
2. Workspace + membership check
3. Fetch experiment to verify it exists, belongs to workspace, and status !== 'completed'
4. Validate: `name` non-empty, `traffic_weight` >= 1, all weights (new + existing) sum to 100
5. In sequence (no Supabase transaction API available):
   a. Insert new variant row
   b. For each entry in `existing_weights`: update `traffic_weight` where `id = entry.id AND experiment_id = id`
6. Return the new variant object

**Response:**
```typescript
{
  id: string
  name: string
  target_url: string | null
  traffic_weight: number
  is_control: boolean
  impressions: number          // 0
  conversion_count: number     // 0
}
```

---

## Frontend State

Add to `<script setup>` in `[id].vue`:

```typescript
// Add variant form state
const newVariantName = ref('')
const newVariantUrl = ref('')
const newVariantWeights = ref<Array<{ id: string; name: string; weight: number; isNew?: boolean }>>([])
const addingVariant = ref(false)

// Called when selectedNode becomes 'add-variant'
const initAddVariantForm = () => {
  const variants = experiment.value?.variants ?? []
  const count = variants.filter(v => !v.is_control).length
  const letters = ['B','C','D','E','F','G','H']
  newVariantName.value = `Variant ${letters[count] ?? String(count + 1)}`
  newVariantUrl.value = ''
  // Distribute weights evenly across all variants + 1 new
  const total = variants.length + 1
  const weight = Math.floor(100 / total)
  const remainder = 100 - weight * total
  newVariantWeights.value = [
    ...variants.map((v, i) => ({ id: v.id, name: v.name, weight: weight + (i === 0 ? remainder : 0) })),
    { id: '__new__', name: newVariantName.value, weight, isNew: true },
  ]
}

const newVariantTotalWeight = computed(() =>
  newVariantWeights.value.reduce((s, v) => s + v.weight, 0)
)

watch(() => selectedNode.value, (val) => {
  if (val === 'add-variant') initAddVariantForm()
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

The `newVariantWeights` row for the new variant has `id: '__new__'` and `isNew: true` — this is only used in the template and never sent to the API as an ID.

When `newVariantName` changes (user edits the name field), update the label in `newVariantWeights` accordingly:
```typescript
watch(newVariantName, (val) => {
  const newRow = newVariantWeights.value.find(v => v.isNew)
  if (newRow) newRow.name = val
})
```

---

## Visual Style

| Element | Style |
|---|---|
| Ghost node (hover) | `border-dashed border-gray-300 bg-gray-50 text-gray-400` |
| Ghost node selected | `border-[#C96A3F] ring-2 ring-[#C96A3F]` |
| New variant weight row | `text-[#C96A3F] font-semibold` |
| Warning banner | `bg-amber-50 border border-amber-200 text-amber-700 text-xs` |
| Add button | `bg-[#C96A3F] text-white` (disabled: `opacity-40`) |

---

## What Is NOT Changed

- The existing variant nodes in the flow (click behavior, stats display)
- The existing right-panel states (traffic, experiment, variant-*, conversion)
- The edit slide-over
- The `index.get.ts` API (no new fields needed — the new variant starts with 0 impressions/conversions)
- Auth middleware, workspace checks

---

## Constraints

- Not available when `experiment.status === 'completed'`
- Works for both `edge` and `component` experiment types (URL field shown only for `edge`)
- The new variant starts with 0 impressions and 0 conversions — it only receives future traffic
