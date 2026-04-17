# Experiment Detail Flow Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the experiment detail page into a split-screen layout: left half shows a vertical clickable flow diagram, right half shows reactive stats/chart/detail for the selected node.

**Architecture:** Two tasks — first update the API to return per-variant conversion counts (small backend change), then rewrite the Vue page template while keeping all existing script logic intact. No new files needed.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>`, Tailwind CSS, TypeScript.

---

## Files

- Modify: `app/server/api/workspaces/[slug]/experiments/index.get.ts` — add per-variant conversion tracking
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — new interfaces, computed helpers, full template rewrite

---

### Task 1: API — per-variant conversion counts

**Files:**
- Modify: `app/server/api/workspaces/[slug]/experiments/index.get.ts`

The current endpoint tracks conversions per experiment only (`conversions[ev.experiment_id]`). The `variant_id` field is already selected but ignored for conversions. This task changes the data structure to track both a total and a per-variant breakdown.

- [ ] **Step 1: Open the file**

Read `app/server/api/workspaces/[slug]/experiments/index.get.ts`. The relevant section is lines 30–58.

Current conversion type:
```typescript
let conversions: Record<string, number> = {}
```

Current conversion increment (inside the `for` loop):
```typescript
} else {
  conversions[ev.experiment_id] = (conversions[ev.experiment_id] ?? 0) + 1
}
```

Current return usage:
```typescript
total_conversions: conversions[exp.id] ?? 0,
```

- [ ] **Step 2: Replace the conversions type declaration**

Change line 31 from:
```typescript
let conversions: Record<string, number> = {}
```
to:
```typescript
let conversions: Record<string, { total: number; byVariant: Record<string, number> }> = {}
```

- [ ] **Step 3: Replace the conversion event handler**

Change the `else` branch inside the `for` loop from:
```typescript
} else {
  conversions[ev.experiment_id] = (conversions[ev.experiment_id] ?? 0) + 1
}
```
to:
```typescript
} else {
  conversions[ev.experiment_id] ??= { total: 0, byVariant: {} }
  conversions[ev.experiment_id].total += 1
  if (ev.variant_id) {
    conversions[ev.experiment_id].byVariant[ev.variant_id] =
      (conversions[ev.experiment_id].byVariant[ev.variant_id] ?? 0) + 1
  }
}
```

- [ ] **Step 4: Update the return map**

In the `return` at the bottom, change:

```typescript
variants: (exp.variants ?? []).map((v: any) => ({
  ...v,
  impressions: impressions[exp.id]?.[v.id] ?? 0,
})),
total_impressions: Object.values(impressions[exp.id] ?? {}).reduce((a, b) => a + b, 0),
total_conversions: conversions[exp.id] ?? 0,
```

to:

```typescript
variants: (exp.variants ?? []).map((v: any) => ({
  ...v,
  impressions: impressions[exp.id]?.[v.id] ?? 0,
  conversion_count: conversions[exp.id]?.byVariant[v.id] ?? 0,
})),
total_impressions: Object.values(impressions[exp.id] ?? {}).reduce((a, b) => a + b, 0),
total_conversions: conversions[exp.id]?.total ?? 0,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/andres/Documents/Personal/dev/personal/splitr/splitr
npx nuxi typecheck 2>&1 | head -40
```

Expected: no errors in `index.get.ts`. Warnings from other files are OK.

- [ ] **Step 6: Commit**

```bash
git add app/server/api/workspaces/\[slug\]/experiments/index.get.ts
git commit -m "feat: track per-variant conversion counts in experiments API"
```

---

### Task 2: Vue page — script setup additions

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` (script section only)

Add `conversion_count` to the `Variant` interface, add new computed helpers, remove the old `leadingId` computed. Keep everything else in `<script setup>` untouched.

- [ ] **Step 1: Add `conversion_count` to the `Variant` interface**

Current `Variant` interface (around line 19):
```typescript
interface Variant {
  id: string; name: string; description?: string; traffic_weight: number
  target_url: string; is_control: boolean; impressions: number
  rules: Rule[]
}
```

Replace with:
```typescript
interface Variant {
  id: string; name: string; description?: string; traffic_weight: number
  target_url: string; is_control: boolean; impressions: number
  conversion_count: number
  rules: Rule[]
}
```

- [ ] **Step 2: Remove `leadingId` computed and add new helpers**

Remove this block (around line 79):
```typescript
const leadingId = computed(() => {
  if (!experiment.value?.total_impressions) return null
  return [...(experiment.value.variants ?? [])].sort((a, b) => b.impressions - a.impressions)[0]?.id
})
```

Add these five helpers in its place:
```typescript
const selectedNode = ref('')

const variantConvRate = (v: Variant) =>
  v.impressions ? (v.conversion_count / v.impressions) * 100 : 0

const leadingConvId = computed(() => {
  if (!experiment.value) return null
  return [...(experiment.value.variants)].sort((a, b) => variantConvRate(b) - variantConvRate(a))[0]?.id ?? null
})

const overallConvRate = computed(() => {
  const exp = experiment.value
  if (!exp?.total_impressions) return '—'
  return ((exp.total_conversions / exp.total_impressions) * 100).toFixed(2) + '%'
})

const bestLift = computed(() => {
  const variants = experiment.value?.variants
  if (!variants || variants.length < 2) return '—'
  const sorted = [...variants].sort((a, b) => variantConvRate(b) - variantConvRate(a))
  if (!sorted[0].impressions || !sorted[1].impressions) return '—'
  return '+' + (variantConvRate(sorted[0]) - variantConvRate(sorted[1])).toFixed(1) + 'pp'
})
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/andres/Documents/Personal/dev/personal/splitr/splitr
npx nuxi typecheck 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/pages/dashboard/\[slug\]/experiments/\[id\].vue
git commit -m "feat: add selectedNode, variantConvRate, leadingConvId helpers to experiment detail"
```

---

### Task 3: Vue page — replace template body with split layout

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` (template section)

Replace the entire `<template>` body content. The header stays, the old scrollable body (stats grid + variants table + details dl) is removed and replaced with a `flex` split layout. The edit slide-over (Teleport) is kept exactly as-is.

- [ ] **Step 1: Change the root wrapper class**

Current opening tag (line 162):
```html
<div v-if="experiment" class="flex flex-col min-h-full">
```

Change to:
```html
<div v-if="experiment" class="flex flex-col h-screen overflow-hidden">
```

- [ ] **Step 2: Remove the old body section**

Remove everything between the closing `</div>` of the header (after line 235) and the opening `<!-- Edit panel -->` comment. That is, remove the entire block:

```html
    <!-- ── Body ── -->
    <div class="flex-1 p-8 space-y-5 max-w-4xl">
      ...all the stats, variants, and details content...
    </div>
```

- [ ] **Step 3: Insert the split layout container**

In place of the removed body, insert:

```html
    <!-- ── Split body ── -->
    <div class="flex flex-1 min-h-0">

      <!-- LEFT: Flow panel -->
      <div class="w-1/2 border-r border-gray-100 bg-white overflow-y-auto px-8 py-6 flex flex-col items-center">
        <p class="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-5 self-start">Experiment flow</p>

        <!-- Traffic node -->
        <div
          :class="['w-full max-w-sm border rounded-2xl px-4 py-3.5 cursor-pointer transition-all duration-150 relative border-green-400 bg-green-50 hover:-translate-y-px hover:shadow-md', selectedNode === 'traffic' ? 'ring-2 ring-[#C96A3F]' : '']"
          @click="selectedNode = 'traffic'"
        >
          <span class="absolute top-2 right-3 text-[9px] text-gray-300">click for details</span>
          <div class="flex items-center gap-3">
            <span class="text-2xl">🌐</span>
            <div>
              <p class="text-[13px] font-bold text-gray-900">Incoming traffic</p>
              <p class="text-xs text-gray-500 mt-0.5 font-mono truncate">{{ experiment.base_url }} · {{ experiment.total_impressions.toLocaleString() }} visits</p>
            </div>
          </div>
        </div>

        <!-- Arrow -->
        <div class="flex flex-col items-center py-1 w-full max-w-sm">
          <div class="w-0.5 h-5 bg-gray-200"></div>
          <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-gray-200"></div>
        </div>

        <!-- Experiment node -->
        <div
          :class="['w-full max-w-sm border rounded-2xl px-4 py-3.5 cursor-pointer transition-all duration-150 relative border-[#C96A3F] bg-[#FEF0E8] hover:-translate-y-px hover:shadow-md', selectedNode === 'experiment' ? 'ring-2 ring-[#C96A3F]' : '']"
          @click="selectedNode = 'experiment'"
        >
          <span class="absolute top-2 right-3 text-[9px] text-gray-300">click for details</span>
          <div class="flex items-center gap-3">
            <span class="text-2xl">🔀</span>
            <div>
              <p class="text-[13px] font-bold text-gray-900">{{ experiment.name }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Random split · {{ experiment.variants.map(v => v.traffic_weight + '%').join(' / ') }}</p>
            </div>
          </div>
        </div>

        <!-- Branch stem -->
        <div class="flex flex-col items-center w-full max-w-sm">
          <div class="w-0.5 h-3 bg-gray-200"></div>
          <div class="w-3/5 h-px bg-gray-200"></div>
        </div>

        <!-- Variant columns -->
        <div class="flex gap-3 w-full max-w-sm">
          <div v-for="(v, i) in experiment.variants" :key="v.id" class="flex-1 flex flex-col items-center">
            <div class="flex flex-col items-center">
              <div class="w-0.5 h-2.5 bg-gray-200"></div>
              <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-transparent border-t-gray-200"></div>
            </div>
            <div
              :class="['mt-1 w-full border rounded-xl px-3 py-3 text-center cursor-pointer transition-all duration-150 relative hover:-translate-y-px hover:shadow-md hover:border-[#C96A3F]', selectedNode === 'variant-' + v.id ? 'border-[#C96A3F] ring-2 ring-[#C96A3F]' : 'border-gray-200']"
              @click="selectedNode = 'variant-' + v.id"
            >
              <span class="absolute top-1.5 right-2 text-[8px] text-gray-300">click</span>
              <div :class="['w-3 h-3 rounded-full mx-auto mb-1.5', variantColorDot[i] ?? 'bg-gray-400']"></div>
              <p class="text-[11px] font-bold text-gray-700 truncate">{{ v.name }}</p>
              <p :class="['text-[13px] font-bold mt-1', leadingConvId === v.id ? 'text-green-600' : 'text-gray-700']">
                {{ v.impressions ? variantConvRate(v).toFixed(1) + '%' : '—' }}
                <span v-if="leadingConvId === v.id" class="text-[10px]">▲</span>
              </p>
              <p class="text-[10px] text-gray-400">conv. rate</p>
            </div>
          </div>
        </div>

        <!-- Merge back -->
        <div class="flex justify-around w-full max-w-sm px-5 pt-1">
          <div v-for="v in experiment.variants" :key="v.id + '-merge'" class="w-0.5 h-3 bg-gray-200"></div>
        </div>
        <div class="w-3/5 h-px bg-gray-200"></div>
        <div class="flex flex-col items-center w-full max-w-sm">
          <div class="w-0.5 h-3 bg-gray-200"></div>
          <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-gray-200"></div>
        </div>

        <!-- Conversion node -->
        <div
          :class="['w-full max-w-sm border rounded-2xl px-4 py-3.5 cursor-pointer transition-all duration-150 relative border-blue-400 bg-blue-50 hover:-translate-y-px hover:shadow-md', selectedNode === 'conversion' ? 'ring-2 ring-[#C96A3F]' : '']"
          @click="selectedNode = 'conversion'"
        >
          <span class="absolute top-2 right-3 text-[9px] text-gray-300">click for details</span>
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎯</span>
            <div>
              <p class="text-[13px] font-bold text-gray-900">Conversion goal</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ experiment.total_conversions.toLocaleString() }} conversions · {{ overallConvRate }} avg</p>
            </div>
          </div>
        </div>

      </div>

      <!-- RIGHT: Data panel -->
      <div class="w-1/2 overflow-y-auto px-6 py-5 bg-gray-50">

        <!-- Placeholder -->
        <div v-if="!selectedNode" class="flex flex-col items-center justify-center min-h-64 gap-3 mt-12">
          <span class="text-4xl">👈</span>
          <p class="text-xs text-gray-300">Click a node to see its data</p>
        </div>

        <!-- ── Traffic ── -->
        <template v-else-if="selectedNode === 'traffic'">
          <p class="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Traffic node</p>
          <div class="grid grid-cols-3 gap-2.5 mb-4">
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900 tabular-nums">{{ experiment.total_impressions.toLocaleString() }}</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Total visits</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900">{{ experiment.variants.length }}</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Variants</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900">60s</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Config TTL</p>
            </div>
          </div>
          <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <span class="text-2xl">🌐</span>
              <div>
                <p class="text-sm font-bold text-gray-900">Incoming traffic</p>
                <p class="text-xs text-gray-400 mt-0.5">Entry point of the experiment</p>
              </div>
            </div>
            <div class="px-5 py-1">
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Monitored URL</span>
                <span class="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-700">{{ experiment.base_url }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Worker status</span>
                <span :class="['text-[10px] font-semibold px-2 py-0.5 rounded-full', statusConfig[experiment.status]?.badge]">{{ statusConfig[experiment.status]?.label }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5">
                <span class="text-xs text-gray-400">Config cache</span>
                <span class="text-xs font-semibold text-gray-700">KV · 60s TTL</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Experiment ── -->
        <template v-else-if="selectedNode === 'experiment'">
          <p class="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Experiment node</p>
          <div class="grid grid-cols-3 gap-2.5 mb-4">
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900 tabular-nums">{{ experiment.total_impressions.toLocaleString() }}</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Impressions</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900 tabular-nums">{{ experiment.total_conversions.toLocaleString() }}</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Conversions</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900">{{ overallConvRate }}</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Avg rate</p>
            </div>
          </div>
          <div class="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
            <p class="text-xs font-bold text-gray-700 mb-4">Traffic distribution</p>
            <div v-for="(v, i) in experiment.variants" :key="v.id" class="flex items-center gap-3 mb-2.5 last:mb-0">
              <span class="text-[11px] text-gray-500 w-20 text-right shrink-0 truncate">{{ v.name }}</span>
              <div class="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  :class="['h-full rounded-lg flex items-center px-2.5 transition-all', variantColors[i] ?? 'bg-gray-400']"
                  :style="{ width: v.traffic_weight + '%' }"
                >
                  <span class="text-[11px] font-bold text-white">{{ v.traffic_weight }}%</span>
                </div>
              </div>
              <span class="text-[11px] text-gray-400 w-16 text-right shrink-0 tabular-nums">{{ v.impressions.toLocaleString() }} visits</span>
            </div>
          </div>
          <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <span class="text-2xl">🔀</span>
              <div>
                <p class="text-sm font-bold text-gray-900">{{ experiment.name }}</p>
                <p class="text-xs text-gray-400 mt-0.5">Active experiment</p>
              </div>
            </div>
            <div class="px-5 py-1">
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Split</span>
                <span class="text-xs font-semibold text-gray-700">{{ experiment.variants.map(v => v.traffic_weight + '%').join(' / ') }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Started</span>
                <span class="text-xs font-semibold text-gray-700">{{ formatDate(experiment.started_at) }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5">
                <span class="text-xs text-gray-400">UTM override</span>
                <span :class="['text-[10px] font-semibold px-2 py-0.5 rounded-full', experiment.override_assignment ? 'bg-[#FEF0E8] text-[#C96A3F]' : 'bg-gray-100 text-gray-500']">
                  {{ experiment.override_assignment ? 'On' : 'Off' }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Variant (dynamic per v.id) ── -->
        <template v-else-if="selectedNode.startsWith('variant-')">
          <template v-for="v in experiment.variants" :key="v.id">
            <template v-if="selectedNode === 'variant-' + v.id">
              <p class="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">{{ v.is_control ? 'Control variant' : 'Variant' }}</p>
              <div class="grid grid-cols-3 gap-2.5 mb-4">
                <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
                  <p class="text-xl font-extrabold text-gray-900 tabular-nums">{{ v.impressions.toLocaleString() }}</p>
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Visits</p>
                </div>
                <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
                  <p :class="['text-xl font-extrabold tabular-nums', leadingConvId === v.id ? 'text-green-600' : 'text-gray-900']">
                    {{ v.impressions ? variantConvRate(v).toFixed(1) + '%' : '—' }}
                  </p>
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Conv. rate</p>
                </div>
                <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
                  <p class="text-xl font-extrabold text-gray-900 tabular-nums">{{ v.conversion_count }}</p>
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Conversions</p>
                </div>
              </div>
              <div class="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
                <p class="text-xs font-bold text-gray-700 mb-4">Conversion rate vs others</p>
                <div v-for="(ov, i) in experiment.variants" :key="ov.id" class="flex items-center gap-3 mb-2.5 last:mb-0">
                  <span class="text-[11px] text-gray-500 w-20 text-right shrink-0 truncate">{{ ov.name }}</span>
                  <div class="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      :class="['h-full rounded-lg flex items-center px-2.5 transition-all', variantColors[i] ?? 'bg-gray-400']"
                      :style="{ width: (experiment.variants.reduce((max, x) => Math.max(max, variantConvRate(x)), 0.001) > 0 ? (variantConvRate(ov) / experiment.variants.reduce((max, x) => Math.max(max, variantConvRate(x)), 0.001)) * 100 : 0) + '%' }"
                    >
                      <span class="text-[11px] font-bold text-white">{{ ov.impressions ? variantConvRate(ov).toFixed(1) + '%' : '—' }}</span>
                    </div>
                  </div>
                  <span class="text-[11px] text-gray-400 w-14 text-right shrink-0 tabular-nums">{{ ov.conversion_count }} conv.</span>
                </div>
              </div>
              <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <span class="text-2xl">{{ v.is_control ? '⚪' : '🟠' }}</span>
                  <div>
                    <p class="text-sm font-bold text-gray-900">{{ v.name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ v.is_control ? 'Original variant' : 'Test variant' }}{{ leadingConvId === v.id ? ' · Leading' : '' }}</p>
                  </div>
                </div>
                <div class="px-5 py-1">
                  <div v-if="v.description" class="flex justify-between items-start py-2.5 border-b border-gray-50 gap-4">
                    <span class="text-xs text-gray-400 shrink-0">Description</span>
                    <span class="text-xs text-gray-700 text-right">{{ v.description }}</span>
                  </div>
                  <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                    <span class="text-xs text-gray-400">Target URL</span>
                    <span class="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-700 truncate max-w-[200px]">{{ v.target_url }}</span>
                  </div>
                  <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                    <span class="text-xs text-gray-400">Traffic share</span>
                    <span class="text-xs font-semibold text-gray-700">{{ v.traffic_weight }}%</span>
                  </div>
                  <div v-if="v.rules?.length" class="py-2.5">
                    <span class="text-xs text-gray-400 block mb-1.5">UTM rules</span>
                    <div v-for="(rule, ri) in v.rules" :key="ri" class="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-700 inline-block mr-1 mb-1">{{ rule.param }}={{ rule.value }}</div>
                  </div>
                  <div v-else class="flex justify-between items-center py-2.5">
                    <span class="text-xs text-gray-400">UTM rules</span>
                    <span class="text-xs text-gray-400">None</span>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </template>

        <!-- ── Conversion ── -->
        <template v-else-if="selectedNode === 'conversion'">
          <p class="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Conversion goal</p>
          <div class="grid grid-cols-3 gap-2.5 mb-4">
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900 tabular-nums">{{ experiment.total_conversions.toLocaleString() }}</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Total</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900">{{ overallConvRate }}</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Avg rate</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <p class="text-xl font-extrabold text-gray-900">{{ bestLift }}</p>
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Best lift</p>
            </div>
          </div>
          <div class="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
            <p class="text-xs font-bold text-gray-700 mb-4">Conversions by variant</p>
            <div v-for="(v, i) in experiment.variants" :key="v.id" class="flex items-center gap-3 mb-2.5 last:mb-0">
              <span class="text-[11px] text-gray-500 w-20 text-right shrink-0 truncate">{{ v.name }}</span>
              <div class="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  :class="['h-full rounded-lg flex items-center px-2.5 transition-all', variantColors[i] ?? 'bg-gray-400']"
                  :style="{ width: (experiment.variants.reduce((max, x) => Math.max(max, variantConvRate(x)), 0.001) > 0 ? (variantConvRate(v) / experiment.variants.reduce((max, x) => Math.max(max, variantConvRate(x)), 0.001)) * 100 : 0) + '%' }"
                >
                  <span class="text-[11px] font-bold text-white">{{ v.conversion_count }}</span>
                </div>
              </div>
              <span class="text-[11px] text-gray-400 w-12 text-right shrink-0 tabular-nums">{{ v.impressions ? variantConvRate(v).toFixed(1) + '%' : '—' }}</span>
            </div>
          </div>
          <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <span class="text-2xl">🎯</span>
              <div>
                <p class="text-sm font-bold text-gray-900">Conversion goal</p>
                <p class="text-xs text-gray-400 mt-0.5">Experiment objective</p>
              </div>
            </div>
            <div class="px-5 py-1">
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Conversion URL</span>
                <span class="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-700 truncate max-w-[200px]">{{ experiment.conversion_url ?? 'not set' }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Best variant</span>
                <span class="text-xs font-semibold text-[#C96A3F]">{{ experiment.variants.find(v => v.id === leadingConvId)?.name ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5">
                <span class="text-xs text-gray-400">Tracking</span>
                <span :class="['text-[10px] font-semibold px-2 py-0.5 rounded-full', experiment.conversion_url ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-400']">
                  {{ experiment.conversion_url ? 'Active' : 'No URL set' }}
                </span>
              </div>
            </div>
          </div>
        </template>

      </div>
    </div>
```

- [ ] **Step 4: Verify no broken references**

Ensure `leadingId` no longer appears anywhere in the template (it was renamed to `leadingConvId`):

```bash
grep -n "leadingId" app/pages/dashboard/\[slug\]/experiments/\[id\].vue
```

Expected: no output.

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/andres/Documents/Personal/dev/personal/splitr/splitr
npx nuxi typecheck 2>&1 | head -40
```

Expected: no errors in `[id].vue`.

- [ ] **Step 6: Commit**

```bash
git add app/pages/dashboard/\[slug\]/experiments/\[id\].vue
git commit -m "feat: redesign experiment detail as split-screen flow view"
```

---

### Task 4: Visual verification

**Files:** none — this is a manual check.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/andres/Documents/Personal/dev/personal/splitr/splitr/app
npm run dev
```

Expected: server starts on `http://localhost:3000`.

- [ ] **Step 2: Navigate to an experiment detail page**

Open `http://localhost:3000/dashboard/<your-slug>/experiments/<experiment-id>` in a browser.

Verify:
- Page fills the full viewport height (no scrollbar on the outer page)
- Left panel shows the flow: Traffic → Experiment → variant nodes (side-by-side) → Conversion
- Right panel shows a placeholder with a left-pointing arrow
- Each variant node shows a conversion rate (or `—` if no data)
- The leading variant shows a green rate + `▲`

- [ ] **Step 3: Click each node**

Click each node in sequence and verify the right panel updates:

| Node clicked | Right panel shows |
|---|---|
| Traffic | Total visits · Variant count · 60s TTL · detail card |
| Experiment | Impressions · Conversions · Avg rate · traffic bar chart · detail card |
| Control variant | Visits · conv. rate · conversions · comparison bar chart · detail card |
| Variant B | Same structure, green conv. rate if leading |
| Conversion | Total · avg rate · lift · conversions bar chart · detail card |

- [ ] **Step 4: Verify Edit button still works**

Click the "Edit" button in the header. The slide-over should open with all fields (name, conversion URL, UTM override toggle, variant descriptions + rules).

- [ ] **Step 5: Verify status buttons still work**

If the experiment is active, "Pause" and "Complete" buttons should be visible and functional.
