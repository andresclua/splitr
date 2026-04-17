# UI Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add info tooltips throughout every panel, replace plain weight inputs with color bars + inputs, and make the ghost variant node permanently visible at 20% opacity.

**Architecture:** All changes are template-only in a single SFC (`app/pages/dashboard/[slug]/experiments/[id].vue`). The `KTooltip` component at `app/components/KTooltip.vue` already exists and is already imported auto-globally via Nuxt. No script or server changes needed.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>`, Tailwind CSS, existing `KTooltip.vue` component.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` | Template only: ghost node opacity, traffic bars, tooltips |

---

## Task 1: Ghost Variant Node — Always Visible at Opacity 0.2

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` lines ~513–531

- [ ] **Step 1: Replace the ghost node connector classes**

Find (lines 513–517):
```html
          <!-- Ghost node column -->
          <div v-if="experiment.status !== 'completed'" class="flex-1 flex flex-col items-center group">
            <div :class="['flex flex-col items-center transition-opacity duration-150', selectedNode === 'add-variant' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100']">
              <div class="w-0.5 h-2.5 bg-gray-200"></div>
              <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-transparent border-t-gray-200"></div>
            </div>
```

Replace with:
```html
          <!-- Ghost node column -->
          <div v-if="experiment.status !== 'completed'" class="flex-1 flex flex-col items-center group">
            <div :class="['flex flex-col items-center transition-opacity duration-150', selectedNode === 'add-variant' ? 'opacity-100' : 'opacity-20 group-hover:opacity-60']">
              <div class="w-0.5 h-2.5 bg-gray-200"></div>
              <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-transparent border-t-gray-200"></div>
            </div>
```

- [ ] **Step 2: Replace the ghost node card classes**

Find (lines 518–530):
```html
            <div
              :class="[
                'mt-1 w-full border rounded-xl px-3 py-3 text-center cursor-pointer transition-all duration-150 border-dashed',
                selectedNode === 'add-variant'
                  ? 'border-[#C96A3F] ring-2 ring-[#C96A3F] bg-white opacity-100'
                  : 'border-gray-300 bg-gray-50 opacity-0 group-hover:opacity-100'
              ]"
              @click="selectedNode = 'add-variant'"
            >
              <div class="w-3 h-3 rounded-full mx-auto mb-1.5 bg-gray-300"></div>
              <p class="text-[11px] font-bold text-gray-400">+ Variant {{ nextVariantLetter }}</p>
              <p class="text-[10px] text-gray-300 mt-0.5">Click to configure</p>
            </div>
```

Replace with:
```html
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
```

- [ ] **Step 3: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: ghost variant node always visible at opacity-20"
```

---

## Task 2: Traffic Split Visual Bars — Experiment Panel

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` lines ~680–702

- [ ] **Step 1: Replace the traffic split row in the experiment panel**

Find (lines 680–702) the entire `<div>` block that starts with `<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Traffic split</p>` and ends before the next sibling `<div>` (the UTM override toggle).

The current content of the `space-y-2` list is:
```html
                  <div v-for="(row, i) in editVariantWeights" :key="row.id" class="flex items-center gap-2">
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
```

Replace with (adds the color bar between name and input):
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

- [ ] **Step 2: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: visual color bars in experiment panel traffic split"
```

---

## Task 3: Traffic Split Visual Bars — Delete Redistribution Modal

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — delete modal weight rows (around line 1034–1046 based on Teleport block near end of file)

- [ ] **Step 1: Find the delete modal weight rows**

Search for: `v-for="row in deleteRedistWeights"` in the template. The current content:

```html
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
```

Replace with (adds color bar — uses `experiment.variants.findIndex` to get the correct color for each remaining variant):
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

- [ ] **Step 2: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: visual color bars in delete variant redistribution modal"
```

---

## Task 4: Info Icons — Traffic Panel and Experiment Panel

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — traffic panel (lines ~605–619) and experiment panel (lines ~669–721)

`KTooltip` is auto-imported globally by Nuxt (no import needed). Usage: `<KTooltip text="..." />` renders the `ⓘ` icon inline.

- [ ] **Step 1: Add tooltip to "Base URL" label in the traffic panel**

Find (line ~606):
```html
              <label for="edit-base-url" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Base URL</label>
```

Replace with:
```html
              <label for="edit-base-url" class="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Base URL
                <KTooltip text="The URL your experiment runs on. All visitors to this URL get routed to a variant." />
              </label>
```

- [ ] **Step 2: Add tooltip to "Config cache" row in the traffic panel**

Find (line ~601–603):
```html
              <div class="flex justify-between items-center py-2.5">
                <span class="text-xs text-gray-400">Config cache</span>
                <span class="text-xs font-semibold text-gray-700">KV · 60s TTL</span>
              </div>
```

Replace with:
```html
              <div class="flex justify-between items-center py-2.5">
                <span class="flex items-center gap-1 text-xs text-gray-400">
                  Config cache
                  <KTooltip text="Experiment config is cached for 60 seconds. Changes take up to 1 minute to propagate to visitors." />
                </span>
                <span class="text-xs font-semibold text-gray-700">KV · 60s TTL</span>
              </div>
```

- [ ] **Step 3: Add tooltip to "Traffic split" heading in the experiment panel**

Find (line ~680):
```html
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Traffic split</p>
```

Replace with:
```html
                <p class="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Traffic split
                  <KTooltip text="What % of visitors see each variant. Must always add up to 100%." />
                </p>
```

- [ ] **Step 4: Add tooltip to "UTM override" toggle label in the experiment panel**

Find (line ~711):
```html
                    <p class="text-sm font-medium text-gray-700">UTM override</p>
```

Replace with:
```html
                    <p class="flex items-center gap-1 text-sm font-medium text-gray-700">
                      UTM override
                      <KTooltip text="When enabled, visitors can be re-assigned to a specific variant via a URL query param — useful for testing or sharing a specific variant." />
                    </p>
```

- [ ] **Step 5: Add tooltips to stat box labels in the experiment panel**

Find the three stat boxes in the experiment panel (lines ~627–638):
```html
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Impressions</p>
```
```html
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Conversions</p>
```
```html
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Avg rate</p>
```

Replace each with:
```html
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1 flex items-center justify-center gap-1">
                Impressions
                <KTooltip text="Total visitors assigned to any variant of this experiment." />
              </p>
```
```html
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1 flex items-center justify-center gap-1">
                Conversions
                <KTooltip text="Total conversion events recorded across all variants." />
              </p>
```
```html
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1 flex items-center justify-center gap-1">
                Avg rate
                <KTooltip text="Overall conversion rate: total conversions ÷ total impressions." />
              </p>
```

- [ ] **Step 6: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: info tooltips in traffic panel and experiment panel"
```

---

## Task 5: Info Icons — Variant Panel and Flow Diagram

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — variant panel (lines ~730–849) and flow diagram variant cards (lines ~502–510)

- [ ] **Step 1: Add tooltips to stat box labels in the variant panel**

Find the three stat boxes in the variant panel (lines ~732–745):
```html
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Visits</p>
```
```html
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Conv. rate</p>
```
```html
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Conversions</p>
```

Replace each with:
```html
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1 flex items-center justify-center gap-1">
                    Visits
                    <KTooltip text="How many visitors were assigned to this variant." />
                  </p>
```
```html
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1 flex items-center justify-center gap-1">
                    Conv. rate
                    <KTooltip text="% of visitors who completed the conversion goal (e.g. clicked a button)." />
                  </p>
```
```html
                  <p class="text-[10px] uppercase tracking-wide text-gray-400 mt-1 flex items-center justify-center gap-1">
                    Conversions
                    <KTooltip text="Total number of conversion events for this variant." />
                  </p>
```

- [ ] **Step 2: Add tooltip to "Traffic share" row in the variant panel**

Find (line ~776–778):
```html
                  <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                    <span class="text-xs text-gray-400">Traffic share</span>
                    <span class="text-xs font-semibold text-gray-700">{{ v.traffic_weight }}%</span>
                  </div>
```

Replace with:
```html
                  <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                    <span class="flex items-center gap-1 text-xs text-gray-400">
                      Traffic share
                      <KTooltip text="This variant's share of total traffic. Change it in the experiment panel's Traffic split section." />
                    </span>
                    <span class="text-xs font-semibold text-gray-700">{{ v.traffic_weight }}%</span>
                  </div>
```

- [ ] **Step 3: Add tooltip to "Name" label in the variant panel**

Find (line ~782):
```html
                    <label :for="'edit-name-' + v.id" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Name</label>
```

Replace with:
```html
                    <label :for="'edit-name-' + v.id" class="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Name
                      <KTooltip text="Display name for this variant. Shown in reports and the flow diagram." />
                    </label>
```

- [ ] **Step 4: Add tooltip to "UTM rules" heading in the variant panel**

Find (lines ~801–804):
```html
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      UTM rules
                      <span class="normal-case font-normal text-gray-400 ml-1">(OR — any match routes here)</span>
                    </p>
```

Replace with:
```html
                    <p class="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      UTM rules
                      <KTooltip text="Route visitors here based on URL parameters. E.g. utm_source=facebook sends Facebook traffic to this variant. Any matching rule applies." />
                      <span class="normal-case font-normal text-gray-400 ml-1">(OR — any match routes here)</span>
                    </p>
```

- [ ] **Step 5: Add tooltip to "conv. rate" text in the flow diagram variant cards**

Find (line ~509):
```html
              <p class="text-[10px] text-gray-400">conv. rate</p>
```

Replace with:
```html
              <p class="text-[10px] text-gray-400 flex items-center justify-center gap-0.5">
                conv. rate
                <KTooltip text="Conversion rate for this variant. Higher is better — but wait for enough data before drawing conclusions." />
              </p>
```

- [ ] **Step 6: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: info tooltips in variant panel and flow diagram"
```

---

## Task 6: Info Icon — Delete Modal Subtitle

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — delete modal (near end of file, inside `<Teleport>` block)

- [ ] **Step 1: Add tooltip to the delete modal subtitle**

Find (in the Teleport block):
```html
            <p class="text-sm text-gray-500 mb-5">
              Redistribute its {{ experiment?.variants.find(v => v.id === deletingVariantId)?.traffic_weight }}% traffic to remaining variants.
            </p>
```

Replace with:
```html
            <p class="text-sm text-gray-500 mb-5 flex items-center gap-1 flex-wrap">
              Redistribute its {{ experiment?.variants.find(v => v.id === deletingVariantId)?.traffic_weight }}% traffic to remaining variants.
              <KTooltip text="When you delete a variant, its traffic must be reassigned to the remaining ones. They must still add up to 100%." />
            </p>
```

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all 54 tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: info tooltip in delete variant modal"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Ghost node connector opacity-20 base, opacity-60 hover, opacity-100 selected | Task 1 |
| Ghost node card opacity-20 base, opacity-60 hover, opacity-100 selected | Task 1 |
| Traffic split bars in experiment panel | Task 2 |
| Traffic split bars in delete modal | Task 3 |
| KTooltip on "Base URL" label | Task 4 |
| KTooltip on "Config cache" row | Task 4 |
| KTooltip on "Traffic split" heading | Task 4 |
| KTooltip on "UTM override" toggle | Task 4 |
| KTooltip on experiment stat boxes (Impressions, Conversions, Avg rate) | Task 4 |
| KTooltip on variant stat boxes (Visits, Conv. rate, Conversions) | Task 5 |
| KTooltip on "Traffic share" row | Task 5 |
| KTooltip on "Name" label | Task 5 |
| KTooltip on "UTM rules" heading | Task 5 |
| KTooltip on "conv. rate" in flow diagram | Task 5 |
| KTooltip in delete modal subtitle | Task 6 |

All spec requirements covered. No placeholders. All code is complete.
