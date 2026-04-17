# UI Improvements — Design Spec

**Date:** 2026-04-17

## Summary

Three independent UI improvements to `app/pages/dashboard/[slug]/experiments/[id].vue`:

1. **Info icons** — Add `KTooltip` to every section header and technical concept so first-time users understand the UI without external docs.
2. **Traffic split visual bars** — Add color bars alongside the number inputs in the experiment panel's editable traffic split and in the delete-variant redistribution modal.
3. **Ghost variant node at opacity 0.2** — The "add variant" ghost node in the flow diagram is always visible at 20% opacity instead of invisible, making it obvious that more variants can be added.

All changes are template-only in `[id].vue`. No server or script changes required.

---

## Feature 1 — Info Icons (KTooltip)

`KTooltip` already exists at `app/components/KTooltip.vue`. It renders a gray `ⓘ` SVG icon that shows a tooltip on hover. It already wraps the status dot and action buttons in the header. Usage:

```html
<KTooltip text="Your explanation here" />
```

### Locations and tooltip texts

| Location | Trigger | Text |
|----------|---------|------|
| **Traffic panel** — "Base URL" label | `KTooltip` after label text | `"The URL your experiment runs on. All visitors to this URL get routed to a variant."` |
| **Traffic panel** — "Config cache" row | `KTooltip` after "KV · 60s TTL" | `"Experiment config is cached for 60 seconds. Changes take up to 1 minute to propagate."` |
| **Experiment panel** — "Traffic split" heading | `KTooltip` after heading text | `"What % of visitors see each variant. Must always add up to 100%."` |
| **Experiment panel** — "UTM override" toggle label | `KTooltip` after "UTM override" text | `"When enabled, visitors can be re-assigned to a specific variant via a URL query param — useful for testing or sharing a specific variant."` |
| **Variant panel** — "Visits" stat box | `KTooltip` replacing the label | `"How many visitors were assigned to this variant."` |
| **Variant panel** — "Conv. rate" stat box | `KTooltip` replacing the label | `"% of visitors who completed the conversion goal (e.g. clicked a button)."` |
| **Variant panel** — "Traffic share" row | `KTooltip` after label text | `"This variant's share of total traffic. Change it in the experiment panel's Traffic split section."` |
| **Variant panel** — "UTM rules" heading | `KTooltip` after heading text | `"Route visitors here based on URL parameters. E.g. utm_source=facebook sends Facebook traffic to this variant. Any matching rule applies."` |
| **Variant panel** — "Name" label | `KTooltip` after label text | `"Display name for this variant. Shown in reports and the flow diagram."` |
| **Experiment panel** — "Impressions" stat box | `KTooltip` replacing the label | `"Total visitors who have been assigned to any variant of this experiment."` |
| **Experiment panel** — "Conversions" stat box | `KTooltip` replacing the label | `"Total conversion events recorded across all variants."` |
| **Experiment panel** — "Avg rate" stat box | `KTooltip` replacing the label | `"Overall conversion rate: total conversions ÷ total impressions."` |
| **Flow diagram** — "conv. rate" text in variant card | inline `KTooltip` wrapping | `"Conversion rate for this variant. Higher is better — but wait for statistical significance before drawing conclusions."` |
| **Delete modal** — subtitle ("Redistribute its X% traffic") | `KTooltip` after text | `"When you delete a variant, its traffic must be reassigned to the remaining ones. They must still add up to 100%."` |

### Pattern for stat box label with tooltip

Replace plain `<p class="text-[10px] ...">Label</p>` with:
```html
<p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1 flex items-center justify-center gap-1">
  Label
  <KTooltip text="..." />
</p>
```

---

## Feature 2 — Traffic Split Visual Bars

### Experiment panel (editable traffic split, lines 680–702)

Current row layout: `[name] [input] [%]`
New row layout: `[name (w-20)] [bar (flex-1)] [input (w-14)] [%]`

The bar uses `variantColors[i]` (same as the read-only distribution chart above it) and width = `row.weight + '%'`.

```html
<div v-for="(row, i) in editVariantWeights" :key="row.id" class="flex items-center gap-2">
  <span class="text-xs text-gray-600 w-20 shrink-0 truncate">{{ row.name }}</span>
  <div class="flex-1 h-5 bg-gray-100 rounded-lg overflow-hidden">
    <div
      :class="['h-full rounded-lg transition-all', variantColors[i] ?? 'bg-gray-400']"
      :style="{ width: Math.min(row.weight, 100) + '%' }"
    ></div>
  </div>
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
```

### Delete redistribution modal (lines ~1034–1046)

Same pattern. The color index is looked up from `experiment.variants` by ID since `deleteRedistWeights` is a subset:

```html
<div v-for="row in deleteRedistWeights" :key="row.id" class="flex items-center gap-3">
  <span class="text-sm text-gray-700 w-24 shrink-0 truncate">{{ row.name }}</span>
  <div class="flex-1 h-5 bg-gray-100 rounded-lg overflow-hidden">
    <div
      :class="['h-full rounded-lg transition-all', variantColors[experiment.variants.findIndex(v => v.id === row.id)] ?? 'bg-gray-400']"
      :style="{ width: Math.min(row.weight, 100) + '%' }"
    ></div>
  </div>
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
```

---

## Feature 3 — Ghost Variant Node at Opacity 0.2

### Current behavior (lines 512–531)
- Connector: `opacity-0 group-hover:opacity-100`
- Card: `opacity-0 group-hover:opacity-100`
- Selected: `opacity-100`

### New behavior
- Connector: always `opacity-20`, hover `opacity-60`, selected `opacity-100`
- Card: always `opacity-20`, hover `opacity-60`, selected `opacity-100`

```html
<!-- Ghost node column -->
<div v-if="experiment.status !== 'completed'" class="flex-1 flex flex-col items-center group">
  <div :class="['flex flex-col items-center transition-opacity duration-150', selectedNode === 'add-variant' ? 'opacity-100' : 'opacity-20 group-hover:opacity-60']">
    <div class="w-0.5 h-2.5 bg-gray-200"></div>
    <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-transparent border-t-gray-200"></div>
  </div>
  <div
    :class="[
      'mt-1 w-full border rounded-xl px-3 py-3 text-center cursor-pointer transition-all duration-150 border-dashed',
      selectedNode === 'add-variant'
        ? 'border-[#C96A3F] ring-2 ring-[#C96A3F] bg-white opacity-100'
        : 'border-gray-300 bg-gray-50 opacity-20 group-hover:opacity-60'
    ]"
    @click="selectedNode = 'add-variant'"
  >
    <div class="w-3 h-3 rounded-full mx-auto mb-1.5 bg-gray-300"></div>
    <p class="text-[11px] font-bold text-gray-400">+ Variant {{ nextVariantLetter }}</p>
    <p class="text-[10px] text-gray-300 mt-0.5">Click to configure</p>
  </div>
</div>
```

---

## What Is NOT Changed

- `KTooltip.vue` component — no modifications
- Script setup block of `[id].vue` — no changes
- Server endpoints — no changes
- Any other component or file
