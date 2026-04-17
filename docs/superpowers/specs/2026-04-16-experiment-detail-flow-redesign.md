# Experiment Detail — Flow View Redesign

**Date:** 2026-04-16

## Summary

Redesign the experiment detail page (`/dashboard/[slug]/experiments/[id]`) from a vertical scrollable layout into a split-screen view:

- **Left half (50%):** Vertical flow diagram with clickable nodes representing each step of the experiment pipeline (Traffic → Split → Variants → Conversion).
- **Right half (50%):** A dynamic data panel that updates when the user clicks a node, showing stats, a bar chart, and a context card for that specific node.

The existing header, edit slide-over, and all status management functionality are preserved unchanged.

---

## Architecture

The page is a single Vue SFC at `app/pages/dashboard/[slug]/experiments/[id].vue`. No new files are needed — the template is restructured in place, keeping the same `<script setup>` logic, the same `useFetch` data, and the same edit panel.

One small addition to the API endpoint (`app/server/api/workspaces/[slug]/experiments/index.get.ts`): track conversions per variant (the `variant_id` field already exists on conversion events — it just wasn't being used). This allows showing per-variant conversion rates in the flow nodes and data panel.

---

## Layout

```
┌─────────────────────── page header ───────────────────────┐
│ ← All experiments  |  Experiment name  ● Live  [actions]  │
├──────────────────────────┬────────────────────────────────┤
│     FLOW PANEL (50%)     │     DATA PANEL (50%)           │
│                          │                                 │
│  ┌──────────────────┐    │  [stat cards row]               │
│  │ 🌐 Traffic        │    │  [bar chart card]               │
│  └────────┬─────────┘    │  [detail card with desc + rows] │
│           ↓              │                                 │
│  ┌──────────────────┐    │  (updates on node click)        │
│  │ 🔀 Experiment     │    │                                 │
│  └──┬───────────┬───┘    │                                 │
│     ↓           ↓        │                                 │
│  ┌──────┐  ┌──────┐      │                                 │
│  │ CTL  │  │ VAR B│      │                                 │
│  └──┬───┘  └──┬───┘      │                                 │
│     └────┬────┘           │                                 │
│          ↓               │                                 │
│  ┌──────────────────┐    │                                 │
│  │ 🎯 Conversion     │    │                                 │
│  └──────────────────┘    │                                 │
└──────────────────────────┴────────────────────────────────┘
```

The header height is fixed (`shrink-0`). The split area fills `flex-1 h-0 overflow-hidden` so neither panel causes the page to scroll outside its own container.

---

## Components

### Flow nodes

Four node types, all Tailwind-styled `<div>` elements with `cursor-pointer` and `@click`:

| Node | Style | Data displayed |
|---|---|---|
| Traffic | Green border + tint | `experiment.base_url`, `total_impressions` |
| Experiment (split) | Orange border + tint | name, `total_impressions`, split ratio |
| Variant (control / others) | Gray / orange border | `v.name`, `v.impressions`, conv. rate |
| Conversion | Blue border + tint | `total_conversions`, avg conv. rate |

Active/selected node gets an orange ring (`ring-2 ring-[#C96A3F]`). On hover, a subtle lift (`-translate-y-px`) and orange border.

Variant nodes show their conversion rate inline (e.g. `3.8%`) and a `▲ Leading` badge on the best performer.

Connector arrows: CSS-only (a 2px `<div>` line + a 0-size border triangle for the arrowhead). The variant branch uses a horizontal line at 60% width to fan out to two columns.

### Data panel

A `ref<string>('') selectedNode` tracks which key is selected (`'traffic'`, `'experiment'`, `'control'`, `'variant-<id>'`, `'conversion'`). The panel renders the appropriate content via `computed` properties — not a `panels` string map (since data is reactive). Structure per selection:

1. **Stats row** — 3 `<div>` cards with a big number + label
2. **Bar chart card** — one bar per variant (filled with Tailwind inline `style` width %)
3. **Detail card** — icon, title, description paragraph, key/value rows

When nothing is selected, a placeholder with a left-pointing arrow and hint text is shown.

---

## API Change

**File:** `app/server/api/workspaces/[slug]/experiments/index.get.ts`

Currently, the conversions loop only increments a per-experiment counter. Change it to also track per-variant:

```typescript
// Before
conversions[ev.experiment_id] = (conversions[ev.experiment_id] ?? 0) + 1

// After
if (!conversions[ev.experiment_id]) conversions[ev.experiment_id] = { total: 0, byVariant: {} }
conversions[ev.experiment_id].total += 1
if (ev.variant_id) {
  conversions[ev.experiment_id].byVariant[ev.variant_id] =
    (conversions[ev.experiment_id].byVariant[ev.variant_id] ?? 0) + 1
}
```

Update the return map:
- `total_conversions: conversions[exp.id]?.total ?? 0`
- Per variant: `conversion_count: conversions[exp.id]?.byVariant[v.id] ?? 0`

The `Variant` interface in `[id].vue` gains `conversion_count: number`. Conv. rate per variant = `v.conversion_count / v.impressions * 100`.

---

## Computed helpers (script setup additions)

```typescript
const selectedNode = ref('')

// Per-variant conv rate (0 if no impressions)
const variantConvRate = (v: Variant) =>
  v.impressions ? (v.conversion_count / v.impressions) * 100 : 0

// Variant with highest conv rate
const leadingConvId = computed(() => {
  if (!experiment.value) return null
  return [...(experiment.value.variants)].sort((a, b) => variantConvRate(b) - variantConvRate(a))[0]?.id ?? null
})

// Overall conv rate
const overallConvRate = computed(() => {
  const exp = experiment.value
  if (!exp?.total_impressions) return '—'
  return ((exp.total_conversions / exp.total_impressions) * 100).toFixed(2) + '%'
})
```

The existing `leadingId` (by impressions) is replaced by `leadingConvId` for the flow view. The variants section of the old layout is gone, so this is a clean swap.

---

## Template restructure

The existing template structure:

```html
<div class="flex flex-col min-h-full">
  <!-- header (keep as-is) -->
  <div class="flex-1 p-8 space-y-5 max-w-4xl">
    <!-- stats cards, variants table, details dl -->
  </div>
</div>
```

Becomes:

```html
<div class="flex flex-col h-screen">
  <!-- header (keep as-is, add shrink-0) -->
  <div class="flex flex-1 h-0 overflow-hidden">
    <!-- flow-panel: left 50%, overflow-y-auto, flex flex-col items-center, px-8 py-6 -->
    <!-- data-panel: right 50%, overflow-y-auto, px-6 py-5, bg-gray-50 -->
  </div>
</div>
```

The edit slide-over (Teleport to body) is kept entirely unchanged.

---

## What is NOT changed

- The header HTML (back link, animated dot, title, badge, action buttons)
- The edit panel slide-over (all fields, save logic, rule editor)
- `setStatus`, `deleteExperiment`, `openEdit`, `saveEdit`, `addRule`, `removeRule`
- `statusConfig`, `formatDate`, `variantColors`, `variantColorDot`
- The `useFetch` call
- The `definePageMeta`, `useWorkspace`, `useToast`, `useConfirm` setup

---

## What is removed

- The old stats grid (`grid grid-cols-3`)
- The old variants section (`bg-white rounded-2xl` with split bar + variant rows)
- The old details `<dl>` section
- `leadingId` computed (replaced by `leadingConvId`)

These are replaced entirely by the flow + data panel. All the same data is visible through node clicks.

---

## Visual style reference

Node colors follow existing project conventions:

| Element | Color |
|---|---|
| Traffic node | `border-green-500 bg-green-50` |
| Experiment node | `border-[#C96A3F] bg-[#FEF0E8]` |
| Conversion node | `border-blue-500 bg-blue-50` |
| Control variant | `bg-gray-400` dot |
| Other variants | `bg-[#C96A3F]` dot |
| Selected ring | `ring-2 ring-[#C96A3F]` |
| Panel background | `bg-gray-50` |
| Stat cards | `bg-white border border-gray-200` |
| Bar fills | `bg-gray-400` (control) / `bg-[#C96A3F]` (variants) |
