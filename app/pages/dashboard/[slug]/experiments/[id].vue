<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { currentWorkspace, fetchWorkspaces } = useWorkspace()
const toast = useToast()
const confirm = useConfirm()

await fetchWorkspaces()
if (!currentWorkspace.value) await navigateTo('/dashboard', { replace: true })

const route = useRoute()
const slug = route.params.slug as string
const id = route.params.id as string

interface Rule {
  param: string
  value: string
}
interface Variant {
  id: string; name: string; description?: string; traffic_weight: number
  target_url: string; is_control: boolean; impressions: number
  conversion_count: number
  rules: Rule[]
}
interface Experiment {
  id: string; name: string; status: string; type: string; base_url: string; conversion_url: string | null
  override_assignment: boolean
  created_at: string; started_at: string | null; ended_at: string | null
  variants: Variant[]; total_impressions: number; total_conversions: number
}

const { data: experiments, refresh } = await useFetch<Experiment[]>(`/api/workspaces/${slug}/experiments`)
const experiment = computed(() => experiments.value?.find(e => e.id === id) ?? null)

if (!experiment.value) await navigateTo(`/dashboard/${slug}`, { replace: true })

const updating = ref(false)

const setStatus = async (status: string) => {
  updating.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, { method: 'PATCH', body: { status } })
    await refresh()
    const labels: Record<string, string> = { active: 'Experiment started', paused: 'Paused', completed: 'Marked as completed' }
    toast.success(labels[status] ?? 'Updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to update')
  } finally {
    updating.value = false
  }
}

const deleteExperiment = async () => {
  const ok = await confirm.ask({
    title: `Delete "${experiment.value?.name}"?`,
    message: 'All variants and event data will be permanently deleted.',
    confirmText: 'Delete',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, { method: 'DELETE' })
    toast.success('Experiment deleted')
    await navigateTo(`/dashboard/${slug}`)
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to delete')
  }
}

const statusConfig: Record<string, { label: string; pulse: boolean; dot: string; badge: string }> = {
  draft:     { label: 'Draft',     pulse: false, dot: 'bg-gray-300',  badge: 'text-gray-500 bg-gray-100' },
  active:    { label: 'Live',      pulse: true,  dot: 'bg-green-500', badge: 'text-green-700 bg-green-50 ring-1 ring-inset ring-green-600/20' },
  paused:    { label: 'Paused',    pulse: false, dot: 'bg-amber-400', badge: 'text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-600/20' },
  completed: { label: 'Completed', pulse: false, dot: 'bg-[#C96A3F]',  badge: 'text-[#C96A3F] bg-[#FEF0E8] ring-1 ring-inset ring-[#C96A3F]/20' },
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const selectedNode = ref('')

const variantConvRate = (v: Variant) =>
  v.impressions ? (v.conversion_count / v.impressions) * 100 : 0

const leadingConvId = computed(() => {
  if (!experiment.value) return null
  return [...(experiment.value.variants ?? [])].sort((a, b) => variantConvRate(b) - variantConvRate(a))[0]?.id ?? null
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

const maxConvRate = computed(() =>
  Math.max(...(experiment.value?.variants.map(variantConvRate) ?? [0]))
)

const variantColors = ['bg-gray-400', 'bg-[#C96A3F]', 'bg-[#0F2235]', 'bg-emerald-500']

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
  const url = editBaseUrl.value.trim()
  try { new URL(url) } catch {
    toast.error('Please enter a valid URL (e.g. https://acme.com)')
    return
  }
  savingTraffic.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: { base_url: url },
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
  if (!editExpName.value.trim()) return
  savingExperiment.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: { name: editExpName.value.trim(), override_assignment: editOverrideAssignment.value },
    })
    await refresh()
    editExpName.value = experiment.value?.name ?? editExpName.value
    editOverrideAssignment.value = experiment.value?.override_assignment ?? editOverrideAssignment.value
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
    const saved = experiment.value?.variants.find(v => v.id === variantId)
    if (saved) {
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

const saveConversion = async () => {
  const url = editConversionUrl.value.trim()
  if (url) {
    try { new URL(url) } catch {
      toast.error('Please enter a valid URL (e.g. https://acme.com/thank-you)')
      return
    }
  }
  savingConversion.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${id}`, {
      method: 'PATCH',
      body: { conversion_url: url || null },
    })
    await refresh()
    editConversionUrl.value = experiment.value?.conversion_url ?? ''
    toast.success('Conversion goal updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save')
  } finally {
    savingConversion.value = false
  }
}

const addEditRule = () => editVariantRules.value.push({ param: '', value: '' })
const removeEditRule = (index: number) => editVariantRules.value.splice(index, 1)

// ── Add variant form ──────────────────────────────────────
const newVariantName = ref('')
const newVariantUrl = ref('')
const newVariantWeights = ref<Array<{ id: string; name: string; weight: number; isNew?: boolean; isControl?: boolean }>>([])
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
      isControl: v.is_control,
    })),
    { id: '__new__', name: newVariantName.value, weight, isNew: true },
  ]
}

const newVariantTotalWeight = computed(() =>
  newVariantWeights.value.reduce((s, v) => s + v.weight, 0)
)

const canAddVariant = computed(() =>
  !addingVariant.value &&
  newVariantTotalWeight.value === 100 &&
  newVariantName.value.trim() !== '' &&
  (experiment.value?.type !== 'edge' || newVariantUrl.value.trim() !== '')
)

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
    await refresh() // sync UI with DB in case insert succeeded but weight updates failed
  } finally {
    addingVariant.value = false
  }
}
</script>

<template>
  <div v-if="experiment" class="flex flex-col h-screen overflow-hidden">

    <!-- ── Header ── -->
    <div class="bg-white border-b border-gray-100 px-8 py-5 shrink-0">

      <!-- Back -->
      <NuxtLink :to="`/dashboard/${slug}`"
        class="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5 whitespace-nowrap">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All experiments
      </NuxtLink>

      <!-- Title row -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <!-- Animated dot -->
          <KTooltip :text="{ draft: 'Not started — set to Active to begin splitting traffic', active: 'Actively splitting traffic between variants', paused: 'Temporarily stopped — existing visitors keep their variant', completed: 'Experiment ended — results are locked' }[experiment.status] ?? experiment.status">
            <span v-if="statusConfig[experiment.status]?.pulse" class="relative flex h-2.5 w-2.5 shrink-0 cursor-default">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span v-else :class="['w-2.5 h-2.5 rounded-full shrink-0 cursor-default', statusConfig[experiment.status]?.dot]" />
          </KTooltip>

          <div class="min-w-0">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h1 class="text-xl font-bold text-gray-900 tracking-tight">{{ experiment.name }}</h1>
              <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig[experiment.status]?.badge]">
                {{ statusConfig[experiment.status]?.label }}
              </span>
            </div>
            <p class="text-xs text-gray-400 font-mono mt-0.5 truncate">{{ experiment.base_url }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="!currentWorkspace?.is_demo" class="flex items-center gap-2 shrink-0">
          <button v-if="experiment.status === 'draft' || experiment.status === 'paused'"
            :disabled="updating"
            class="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            @click="setStatus('active')">
            Start
          </button>
          <KTooltip v-if="experiment.status === 'active'" text="Pauses the experiment — no new assignments, existing visitors keep their variant">
            <button
              :disabled="updating"
              class="text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
              @click="setStatus('paused')">
              Pause
            </button>
          </KTooltip>
          <KTooltip v-if="experiment.status === 'active' || experiment.status === 'paused'" text="Ends the experiment permanently and locks the results">
            <button
              :disabled="updating"
              class="text-sm font-semibold text-[#0F2235] bg-[#FEF0E8] hover:bg-[#F0C9B0] border border-[#F0C9B0] px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
              @click="setStatus('completed')">
              Complete
            </button>
          </KTooltip>
          <button
            class="text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            @click="deleteExperiment">
            Delete
          </button>
        </div>
      </div>
    </div>

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
              <div :class="['w-3 h-3 rounded-full mx-auto mb-1.5', variantColors[i] ?? 'bg-gray-400']"></div>
              <p class="text-[11px] font-bold text-gray-700 truncate">{{ v.name }}</p>
              <p :class="['text-[13px] font-bold mt-1', leadingConvId === v.id ? 'text-green-600' : 'text-gray-700']">
                {{ v.impressions ? variantConvRate(v).toFixed(1) + '%' : '—' }}
                <span v-if="leadingConvId === v.id" class="text-[10px]">▲</span>
              </p>
              <p class="text-[10px] text-gray-400">conv. rate</p>
            </div>
          </div>
          <!-- Ghost node column -->
          <div v-if="experiment.status !== 'completed'" class="flex-1 flex flex-col items-center group">
            <div :class="['flex flex-col items-center transition-opacity duration-150', selectedNode === 'add-variant' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100']">
              <div class="w-0.5 h-2.5 bg-gray-200"></div>
              <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-transparent border-t-gray-200"></div>
            </div>
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
                      :style="{ width: maxConvRate > 0 ? (variantConvRate(ov) / maxConvRate * 100) + '%' : '0%' }"
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
            </template>
          </template>
        </template>

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
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
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
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
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
                  <span :class="['w-2.5 h-2.5 rounded-full shrink-0', row.isNew ? 'bg-[#C96A3F]' : row.isControl ? 'bg-gray-400' : 'bg-[#C96A3F]']"></span>
                  <span :class="['text-xs truncate', row.isNew ? 'text-[#C96A3F] font-semibold' : 'text-gray-600']">
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
                      'w-14 border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-[#C96A3F]',
                      row.isNew ? 'border-[#C96A3F] text-[#C96A3F] font-semibold' : 'border-gray-200'
                    ]"
                  />
                  <span class="text-xs text-gray-400">%</span>
                </div>
              </div>
            </div>

            <!-- Total badge -->
            <div class="flex justify-end items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
              <span class="text-xs text-gray-400">Total:</span>
              <span :class="['text-xs font-bold px-2 py-0.5 rounded-full', newVariantTotalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600']">
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
              :disabled="!canAddVariant"
              :class="[
                'flex-1 bg-[#C96A3F] text-white text-sm font-semibold py-2 rounded-lg transition-opacity',
                !canAddVariant ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
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
                  :style="{ width: maxConvRate > 0 ? (variantConvRate(v) / maxConvRate * 100) + '%' : '0%' }"
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
        </template>

      </div>
    </div>
  </div>

</template>
