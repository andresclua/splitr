# Inline Node Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic "Edit experiment" slide-over with per-node inline editing directly in the right panel — each flow node shows its stats plus its own editable fields, with an independent Save button.

**Architecture:** Single file change (`app/pages/dashboard/[slug]/experiments/[id].vue`). The existing PATCH endpoint already accepts partial updates; each node's Save calls it with a different subset of fields. The old slide-over state/functions/template are removed; new per-node state + save functions are added; each right-panel section gets editable inputs below its stats.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>` + TypeScript, Tailwind CSS, existing `$fetch` + `toast` + `refresh` patterns.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — `<script setup>` | Remove slide-over state; add per-node edit refs + save functions; extend selectedNode watcher |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — header template | Remove "Edit" button |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — traffic panel | Add editable base_url input + Save |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — experiment panel | Make name editable, override_assignment toggle editable + Save |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — variant panel | Add editable description + UTM rules editor + Save |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — conversion panel | Add editable conversion_url input + Save |
| Modify | `app/pages/dashboard/[slug]/experiments/[id].vue` — slide-over template | Remove entire `<Teleport>` block (lines ~800–915) |

---

## Task 1: Script Setup — Remove Old State, Add Per-Node State

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — `<script setup>` block

The edit slide-over uses these items that must be removed:
- `const saving = ref(false)` (line 112) — used only by `saveEdit`
- `interface EditVariant { ... }` (lines 114–119)
- `interface EditForm { ... }` (lines 121–126)
- `const editForm = ref<EditForm>({ ... })` (lines 128–133)
- `const openEdit = () => { ... }` (lines 135–149)
- `const saveEdit = async () => { ... }` (lines 151–171)
- `const addRule = (variantId: string) => { ... }` (lines 173–176)
- `const removeRule = (variantId: string, index: number) => { ... }` (lines 178–181)

And the existing `selectedNode` watcher (lines 223–225) must be **extended** (not duplicated).

- [ ] **Step 1: Remove the slide-over script block**

Open `app/pages/dashboard/[slug]/experiments/[id].vue`. Find lines 110–181 (the `// ── Edit panel ──` section through `removeRule`). Remove this entire block:

```typescript
// ── Edit panel ────────────────────────────────────────────
const showEdit = ref(false)
const saving = ref(false)

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

const saveEdit = async () => {
  saving.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: {
        name: editForm.value.name,
        conversion_url: editForm.value.conversion_url || null,
        override_assignment: editForm.value.override_assignment,
        variantDescriptions: editForm.value.variantDescriptions,
      },
    })
    await refresh()
    showEdit.value = false
    toast.success('Experiment updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save')
  } finally {
    saving.value = false
  }
}

const addRule = (variantId: string) => {
  const v = editForm.value.variantDescriptions.find(v => v.id === variantId)
  if (v) v.rules.push({ param: '', value: '' })
}

const removeRule = (variantId: string, index: number) => {
  const v = editForm.value.variantDescriptions.find(v => v.id === variantId)
  if (v) v.rules.splice(index, 1)
}
```

- [ ] **Step 2: Add per-node edit state after the `// ── Add variant form ──` comment block**

Find the `// ── Add variant form ──` section. It starts with `const newVariantName = ref('')`. Add the following **before** that section (i.e., in place of where the removed block was, so the script stays organized):

```typescript
// ── Per-node inline edit state ────────────────────────────

// Traffic
const editBaseUrl = ref('')
const savingTraffic = ref(false)

// Experiment
const editExpName = ref('')
const editOverrideAssignment = ref(false)
const savingExperiment = ref(false)

// Variant (shared, reset per variant on selectedNode change)
const editVariantDescription = ref('')
const editVariantRules = ref<Rule[]>([])
const savingVariant = ref(false)

// Conversion
const editConversionUrl = ref('')
const savingConversion = ref(false)

const saveTraffic = async () => {
  savingTraffic.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: { base_url: editBaseUrl.value.trim() },
    })
    await refresh()
    toast.success('Traffic updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save')
  } finally {
    savingTraffic.value = false
  }
}

const saveExperiment = async () => {
  savingExperiment.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: { name: editExpName.value.trim(), override_assignment: editOverrideAssignment.value },
    })
    await refresh()
    toast.success('Experiment updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save')
  } finally {
    savingExperiment.value = false
  }
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
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save')
  } finally {
    savingVariant.value = false
  }
}

const saveConversion = async () => {
  savingConversion.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: { conversion_url: editConversionUrl.value.trim() || null },
    })
    await refresh()
    toast.success('Conversion goal updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save')
  } finally {
    savingConversion.value = false
  }
}

const addEditRule = () => editVariantRules.value.push({ param: '', value: '' })
const removeEditRule = (index: number) => editVariantRules.value.splice(index, 1)
```

- [ ] **Step 3: Extend the existing selectedNode watcher**

Find this watcher (around the add-variant section):

```typescript
watch(selectedNode, (val) => {
  if (val === 'add-variant') initAddVariantForm()
})
```

Replace it with:

```typescript
watch(selectedNode, (val) => {
  const exp = experiment.value
  if (!exp) return
  if (val === 'add-variant') {
    initAddVariantForm()
  } else if (val === 'traffic') {
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
```

- [ ] **Step 4: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: per-node inline edit state, remove slide-over script"
```

---

## Task 2: Remove "Edit" Button from Header + Remove Slide-Over Template

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — header + slide-over template

- [ ] **Step 1: Remove the Edit button from the header**

In the template, find the header button row. It currently has four buttons: Pause/Resume, Complete, **Edit**, Delete. The Edit button looks like:

```html
<button
  class="border border-gray-200 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
  @click="openEdit"
>Edit</button>
```

Remove only that button. Leave Pause/Resume, Complete, and Delete untouched.

- [ ] **Step 2: Remove the entire slide-over Teleport block**

Find `<!-- Edit panel -->` (around line 800). Remove from that comment through `</Teleport>` at line ~915. The block to remove:

```html
  <!-- Edit panel -->
  <Teleport to="body">
    <Transition ...>
      <div v-if="showEdit" class="fixed inset-0 z-40 flex">
        ...
      </div>
    </Transition>
  </Teleport>
```

This is ~115 lines. After removal, `</template>` closes the component.

- [ ] **Step 3: Verify the file still compiles**

Run: `grep -n "openEdit\|showEdit\|saveEdit\|editForm\|addRule\|removeRule" "app/pages/dashboard/[slug]/experiments/[id].vue"`

Expected: no matches (all old references gone).

- [ ] **Step 4: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: remove Edit button and slide-over template"
```

---

## Task 3: Traffic Panel — Inline Base URL Editing

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — `selectedNode === 'traffic'` template block

Currently the traffic panel ends with a read-only detail card. After the card's closing `</div>` and before `</template>`, add an editable section.

- [ ] **Step 1: Replace the "Monitored URL" read-only row with an editable input**

Find the traffic panel's detail card body (inside `<div class="px-5 py-1">`). The "Monitored URL" row currently is:

```html
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Monitored URL</span>
                <span class="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-700">{{ experiment.base_url }}</span>
              </div>
```

Replace with an editable input row + Save button. Replace that entire traffic detail card `<div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">` block (from its opening to its closing `</div>`) with:

```html
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
                <span class="text-xs text-gray-400">Worker status</span>
                <span :class="['text-[10px] font-semibold px-2 py-0.5 rounded-full', statusConfig[experiment.status]?.badge]">{{ statusConfig[experiment.status]?.label }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5">
                <span class="text-xs text-gray-400">Config cache</span>
                <span class="text-xs font-semibold text-gray-700">KV · 60s TTL</span>
              </div>
            </div>
            <div class="px-5 pt-2 pb-4 border-t border-gray-100">
              <label for="edit-base-url" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Base URL</label>
              <input
                id="edit-base-url"
                v-model="editBaseUrl"
                type="url"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
              />
              <button
                type="button"
                :disabled="savingTraffic || !editBaseUrl.trim()"
                :class="['mt-3 bg-[#C96A3F] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-opacity', (savingTraffic || !editBaseUrl.trim()) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90']"
                @click="saveTraffic"
              >{{ savingTraffic ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
```

- [ ] **Step 2: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: inline base URL editing in traffic panel"
```

---

## Task 4: Experiment Panel — Inline Name + Override Toggle

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — `selectedNode === 'experiment'` template block

The experiment detail card currently shows name (read-only), split, started, UTM override badge. Replace the read-only name display and UTM override badge with editable inputs.

- [ ] **Step 1: Replace the experiment detail card with an editable version**

Find the experiment panel's detail card `<div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">` (inside the `selectedNode === 'experiment'` template, after the traffic distribution bars). Replace the entire card with:

```html
          <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <span class="text-2xl">🔀</span>
              <div>
                <p class="text-sm font-bold text-gray-900">{{ experiment.name }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ statusConfig[experiment.status]?.label ?? experiment.status }} experiment</p>
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
            </div>
            <div class="px-5 pt-2 pb-4 border-t border-gray-100 space-y-3">
              <div>
                <label for="edit-exp-name" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Experiment name</label>
                <input
                  id="edit-exp-name"
                  v-model="editExpName"
                  type="text"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
                />
              </div>
              <div>
                <label class="flex items-center gap-3 cursor-pointer select-none">
                  <div class="relative shrink-0">
                    <input v-model="editOverrideAssignment" type="checkbox" class="sr-only peer" />
                    <div class="w-9 h-5 bg-gray-200 peer-checked:bg-[#C96A3F] rounded-full transition-colors" />
                    <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-700">UTM override</p>
                    <p class="text-xs text-gray-400">Reassign visitors via query param rules</p>
                  </div>
                </label>
              </div>
              <button
                type="button"
                :disabled="savingExperiment || !editExpName.trim()"
                :class="['bg-[#C96A3F] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-opacity', (savingExperiment || !editExpName.trim()) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90']"
                @click="saveExperiment"
              >{{ savingExperiment ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
```

- [ ] **Step 2: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: inline experiment name and UTM override editing"
```

---

## Task 5: Variant Panel — Inline Description + Rules

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — `selectedNode.startsWith('variant-')` template block

The variant detail card currently shows description (read-only, only if set), target URL (read-only), traffic share, UTM rules (read-only chips). Replace the description and UTM rules rows with editable inputs.

- [ ] **Step 1: Replace the variant detail card with an editable version**

Find the variant panel's detail card `<div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">` (inside the variant template, after the conv rate bars). Replace the entire card (from `<div class="bg-white ...` through its closing `</div>`) with:

```html
              <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <span class="text-2xl">{{ v.is_control ? '⚪' : '🟠' }}</span>
                  <div>
                    <p class="text-sm font-bold text-gray-900">{{ v.name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ v.is_control ? 'Original variant' : 'Test variant' }}{{ leadingConvId === v.id ? ' · Leading' : '' }}</p>
                  </div>
                </div>
                <div class="px-5 py-1">
                  <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                    <span class="text-xs text-gray-400">Target URL</span>
                    <span class="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-700 truncate max-w-[200px]">{{ v.target_url || '—' }}</span>
                  </div>
                  <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                    <span class="text-xs text-gray-400">Traffic share</span>
                    <span class="text-xs font-semibold text-gray-700">{{ v.traffic_weight }}%</span>
                  </div>
                </div>
                <div class="px-5 pt-2 pb-4 border-t border-gray-100 space-y-3">
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
                  <button
                    type="button"
                    :disabled="savingVariant"
                    :class="['bg-[#C96A3F] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-opacity', savingVariant ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90']"
                    @click="saveVariant(v.id)"
                  >{{ savingVariant ? 'Saving…' : 'Save' }}</button>
                </div>
              </div>
```

- [ ] **Step 2: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: inline variant description and UTM rules editing"
```

---

## Task 6: Conversion Panel — Inline Conversion URL Editing

**Files:**
- Modify: `app/pages/dashboard/[slug]/experiments/[id].vue` — `selectedNode === 'conversion'` template block

The conversion detail card shows conversion URL (read-only), best variant, tracking status. Replace the read-only URL with an editable input.

- [ ] **Step 1: Replace the conversion detail card with an editable version**

Find the conversion panel's detail card `<div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">` (inside the `selectedNode === 'conversion'` template, after the conversions-by-variant bars). Replace the entire card with:

```html
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
                <span class="text-xs text-gray-400">Best variant</span>
                <span class="text-xs font-semibold text-[#C96A3F]">{{ experiment.variants.find(v => v.id === leadingConvId)?.name ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
                <span class="text-xs text-gray-400">Tracking</span>
                <span :class="['text-[10px] font-semibold px-2 py-0.5 rounded-full', experiment.conversion_url ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-400']">
                  {{ experiment.conversion_url ? 'Active' : 'No URL set' }}
                </span>
              </div>
            </div>
            <div class="px-5 pt-2 pb-4 border-t border-gray-100">
              <label for="edit-conv-url" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Conversion URL
                <span class="normal-case font-normal text-gray-400 ml-1">(optional)</span>
              </label>
              <input
                id="edit-conv-url"
                v-model="editConversionUrl"
                type="url"
                placeholder="https://acme.com/thank-you"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300"
              />
              <button
                type="button"
                :disabled="savingConversion"
                :class="['mt-3 bg-[#C96A3F] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-opacity', savingConversion ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90']"
                @click="saveConversion"
              >{{ savingConversion ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
```

- [ ] **Step 2: Commit**

```bash
git add "app/pages/dashboard/[slug]/experiments/[id].vue"
git commit -m "feat: inline conversion URL editing"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Remove showEdit, editForm, EditVariant, EditForm interfaces | Task 1 |
| Remove openEdit, saveEdit, addRule, removeRule | Task 1 |
| Add editBaseUrl, savingTraffic, saveTraffic | Task 1 |
| Add editExpName, editOverrideAssignment, savingExperiment, saveExperiment | Task 1 |
| Add editVariantDescription, editVariantRules, savingVariant, saveVariant | Task 1 |
| Add editConversionUrl, savingConversion, saveConversion | Task 1 |
| Add addEditRule, removeEditRule | Task 1 |
| Extend selectedNode watcher to init per-node state | Task 1 |
| Remove "Edit" button from header | Task 2 |
| Remove Teleport slide-over template | Task 2 |
| Traffic panel: editable base_url + Save | Task 3 |
| Experiment panel: editable name + override toggle + Save | Task 4 |
| Variant panel: editable description + UTM rules + Save | Task 5 |
| Conversion panel: editable conversion_url + Save | Task 6 |

All spec requirements covered. No placeholders. Types consistent across all tasks (Rule[], string refs, boolean refs).
