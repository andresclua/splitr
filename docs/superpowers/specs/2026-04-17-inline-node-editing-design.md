# Inline Node Editing — Design Spec

**Date:** 2026-04-17

## Summary

Replace the monolithic "Edit experiment" slide-over with inline per-node editing directly in the right panel of the experiment detail page. Each node in the flow diagram shows its stats above a divider and its own editable fields below. A Save button on each node panel sends a PATCH with only that node's data. The "Edit" header button and the slide-over are removed entirely.

---

## Architecture

Single file changes: **`app/pages/dashboard/[slug]/experiments/[id].vue`**.

No API changes needed — the existing `PATCH /api/workspaces/[slug]/experiments/[id]` endpoint already accepts partial updates (name, base_url, conversion_url, override_assignment, variantDescriptions). Each node's Save calls the same endpoint with a different subset of fields.

---

## What Gets Removed

- The `showEdit` ref and the `<Teleport>`/slide-over template (~160 lines)
- The `editForm` ref, `EditForm` interface, `EditVariant` interface
- `openEdit()`, `saveEdit()`, `addRule()`, `removeRule()` functions
- The **Edit** button in the page header

---

## Per-Node Edit State (new)

Add to `<script setup>`:

```typescript
// ── Per-node edit state ───────────────────────────────────

// Traffic
const editBaseUrl = ref('')
const savingTraffic = ref(false)

// Experiment
const editExpName = ref('')
const editOverrideAssignment = ref(false)
const savingExperiment = ref(false)

// Variant (shared state, reset per-variant when selectedNode changes)
const editVariantDescription = ref('')
const editVariantRules = ref<Rule[]>([])
const savingVariant = ref(false)

// Conversion
const editConversionUrl = ref('')
const savingConversion = ref(false)

// Init each node's edit state when selectedNode changes
watch(selectedNode, (val) => {
  const exp = experiment.value
  if (!exp) return
  if (val === 'traffic') {
    editBaseUrl.value = exp.base_url
  } else if (val === 'experiment') {
    editExpName.value = exp.name
    editOverrideAssignment.value = exp.override_assignment ?? false
  } else if (val.startsWith('variant-')) {
    const v = exp.variants.find(v => 'variant-' + v.id === val)
    if (v) {
      editVariantDescription.value = v.description ?? ''
      editVariantRules.value = v.rules ? v.rules.map(r => ({ ...r })) : []
    }
  } else if (val === 'conversion') {
    editConversionUrl.value = exp.conversion_url ?? ''
  }
})

// Save functions
const saveTraffic = async () => {
  savingTraffic.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH', body: { base_url: editBaseUrl.value.trim() },
    })
    await refresh()
    toast.success('Traffic updated')
  } catch (e: any) { toast.error(e?.data?.message ?? 'Failed to save') }
  finally { savingTraffic.value = false }
}

const saveExperiment = async () => {
  savingExperiment.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH', body: { name: editExpName.value.trim(), override_assignment: editOverrideAssignment.value },
    })
    await refresh()
    toast.success('Experiment updated')
  } catch (e: any) { toast.error(e?.data?.message ?? 'Failed to save') }
  finally { savingExperiment.value = false }
}

const saveVariant = async (variantId: string) => {
  savingVariant.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: {
        variantDescriptions: [{
          id: variantId,
          description: editVariantDescription.value,
          rules: editVariantRules.value.filter(r => r.param.trim() && r.value.trim()),
        }],
      },
    })
    await refresh()
    toast.success('Variant updated')
  } catch (e: any) { toast.error(e?.data?.message ?? 'Failed to save') }
  finally { savingVariant.value = false }
}

const saveConversion = async () => {
  savingConversion.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH', body: { conversion_url: editConversionUrl.value.trim() || null },
    })
    await refresh()
    toast.success('Conversion goal updated')
  } catch (e: any) { toast.error(e?.data?.message ?? 'Failed to save') }
  finally { savingConversion.value = false }
}

// Rule helpers (replaces addRule/removeRule that were on editForm)
const addEditRule = () => editVariantRules.value.push({ param: '', value: '' })
const removeEditRule = (index: number) => editVariantRules.value.splice(index, 1)
```

---

## Right Panel — Updated States

### Traffic

Current: read-only stats for base_url, worker status, config cache.

New: keep the 3 stat boxes + the existing detail card. Below the detail card, add an editable **Base URL** field + Save button. Disabled when `savingTraffic`.

```
[stat boxes: total visits · variants · config TTL]

── detail card ──
Monitored URL   [editable: editBaseUrl        ]
Worker status   Live
Config cache    KV · 60s TTL

[Save]   (disabled + "Saving…" when savingTraffic)
```

### Experiment

Current: read-only stats (impressions, conversions, avg rate), traffic distribution bars, detail card (split, started, UTM override).

New: keep stats + bars. Make the experiment name and UTM override toggle editable in the detail card. Save applies both.

```
[stat boxes]
[traffic distribution bars — read-only]

── detail card ──
Name             [editable: editExpName        ]
Split            33% / 33% / 34%   (read-only)
Started          Apr 12, 2026      (read-only)
UTM override     [toggle: editOverrideAssignment]

[Save]
```

### Variant (per variant)

Current: read-only stats, conv rate vs others bars, detail card (description, target URL, traffic share, UTM rules).

New: keep stats + bars. Make description, target URL (edge only), and UTM rules editable in the detail card.

```
[stat boxes]
[conv rate bars — read-only]

── detail card ──
Description    [editable textarea: editVariantDescription]
Target URL     [editable if edge type, else read-only]
Traffic share  33%   (read-only)
UTM rules      [list of rule pairs with × to remove + "Add rule" link]

[Save]
```

Target URL for variants: the existing PATCH endpoint's `variantDescriptions` array does not include `target_url`. Since the spec already calls the PATCH with only description + rules per variant, **target URL is not editable in this panel** (it's a post-creation property not exposed by the PATCH endpoint's `variantDescriptions` path). Show it read-only as before.

### Conversion

Current: read-only stats (total conversions, avg rate, best lift), conversions by variant bars, detail card (conversion URL).

New: keep stats + bars. Make conversion URL editable in the detail card.

```
[stat boxes]
[conversions by variant bars — read-only]

── detail card ──
Conversion URL   [editable: editConversionUrl  ]

[Save]
```

---

## Header Changes

Remove the **Edit** button. Header buttons become: `Pause/Resume` · `Complete` · `Delete` (same as today minus Edit).

---

## Visual Style for Editable Fields

Use the same input style already in the file:
```
border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F]
```

Save button: `bg-[#C96A3F] text-white text-sm font-semibold px-4 py-1.5 rounded-lg` — disabled + `opacity-40` when saving.

Divider between read-only stats and editable section: existing `border-t border-gray-100` separator.

---

## What Is NOT Changed

- Flow diagram nodes (layout, click behavior, visual style)
- The Add Variant ghost node and form
- API endpoints
- Status action buttons (Pause, Complete)
- The `useFetch` refresh pattern
