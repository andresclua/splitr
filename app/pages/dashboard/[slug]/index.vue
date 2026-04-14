<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { currentWorkspace, fetchWorkspaces } = useWorkspace()
const toast = useToast()
const confirm = useConfirm()

await fetchWorkspaces()
if (!currentWorkspace.value) await navigateTo('/dashboard', { replace: true })

const slug = currentWorkspace.value!.slug

// ── Experiments ───────────────────────────────────────────
interface Variant { id: string; name: string; description?: string; traffic_weight: number; target_url: string; is_control: boolean; impressions: number }
interface Experiment {
  id: string; name: string; status: string; type: 'edge' | 'component'; base_url: string
  created_at: string; started_at: string | null; ended_at: string | null
  variants: Variant[]; total_impressions: number; total_conversions: number
}

const { data: experiments, refresh } = await useFetch<Experiment[]>(`/api/workspaces/${slug}/experiments`)

// ── New experiment panel ──────────────────────────────────
const showPanel = ref(false)
const saving = ref(false)

interface VariantDraft { name: string; description: string; target_url: string; traffic_weight: number; is_control: boolean }
const form = reactive({
  name: '',
  type: 'edge' as 'edge' | 'component',
  base_url: '',
  conversion_url: '',
  variants: [
    { name: 'Control', description: '', target_url: '', traffic_weight: 50, is_control: true },
    { name: 'Variant B', description: '', target_url: '', traffic_weight: 50, is_control: false },
  ] as VariantDraft[],
})

const totalWeight = computed(() => form.variants.reduce((s, v) => s + v.traffic_weight, 0))

const addVariant = () => {
  const count = form.variants.length + 1
  const weight = Math.floor(100 / count)
  const remainder = 100 - weight * count
  form.variants.push({ name: `Variant ${String.fromCharCode(65 + form.variants.length)}`, description: '', target_url: '', traffic_weight: weight, is_control: false })
  // Redistribute evenly
  form.variants.forEach((v, i) => { v.traffic_weight = weight + (i === 0 ? remainder : 0) })
}

const removeVariant = (i: number) => {
  if (form.variants.length <= 2) return
  form.variants.splice(i, 1)
}

const resetForm = () => {
  form.name = ''; form.type = 'edge'; form.base_url = ''; form.conversion_url = ''
  form.variants = [
    { name: 'Control', description: '', target_url: '', traffic_weight: 50, is_control: true },
    { name: 'Variant B', description: '', target_url: '', traffic_weight: 50, is_control: false },
  ]
}

const openPanel = () => { resetForm(); showPanel.value = true }
const closePanel = () => { showPanel.value = false }

const createExperiment = async () => {
  if (totalWeight.value !== 100) return toast.error('Weights must sum to 100')
  saving.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/experiments`, {
      method: 'POST',
      body: { name: form.name, type: form.type, base_url: form.base_url, conversion_url: form.conversion_url || undefined, variants: form.variants },
    })
    await refresh()
    closePanel()
    toast.success('Experiment created')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to create experiment')
  } finally {
    saving.value = false
  }
}

// ── Status actions ────────────────────────────────────────
const updatingId = ref<string | null>(null)

const setStatus = async (exp: Experiment, status: string) => {
  updatingId.value = exp.id
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${exp.id}`, { method: 'PATCH', body: { status } })
    await refresh()
    const labels: Record<string, string> = { active: 'Experiment started', paused: 'Experiment paused', completed: 'Experiment completed' }
    toast.success(labels[status] ?? 'Updated')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to update')
  } finally {
    updatingId.value = null
  }
}

const deleteExperiment = async (exp: Experiment) => {
  const ok = await confirm.ask({
    title: `Delete "${exp.name}"?`,
    message: 'All variants and event data will be permanently deleted.',
    confirmText: 'Delete',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await $fetch(`/api/workspaces/${slug}/experiments/${exp.id}`, { method: 'DELETE' })
    await refresh()
    toast.success('Experiment deleted')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to delete')
  }
}

// ── Helpers ───────────────────────────────────────────────
const statusConfig: Record<string, { label: string; class: string; pulse: boolean; dot: string }> = {
  draft:     { label: 'Draft',     class: 'bg-gray-100 text-gray-600',              pulse: false, dot: 'bg-gray-300' },
  active:    { label: 'Active',    class: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20', pulse: true,  dot: 'bg-green-500' },
  paused:    { label: 'Paused',    class: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20', pulse: false, dot: 'bg-amber-400' },
  completed: { label: 'Completed', class: 'bg-[#FEF0E8] text-[#C96A3F] ring-1 ring-inset ring-[#C96A3F]/20', pulse: false, dot: 'bg-[#C96A3F]' },
}

const variantColors = ['bg-gray-300', 'bg-[#C96A3F]', 'bg-[#0F2235]', 'bg-emerald-500']

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const conversionRate = (exp: Experiment) => exp.total_impressions ? ((exp.total_conversions / exp.total_impressions) * 100).toFixed(1) + '%' : '—'

// ── Filters ───────────────────────────────────────────────
const search = ref('')
const filterStatus = ref('all')
const filterType = ref('all')

const statusFilters = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'paused',    label: 'Paused' },
  { value: 'draft',     label: 'Draft' },
  { value: 'completed', label: 'Completed' },
]

const typeFilters = [
  { value: 'all',       label: 'All types' },
  { value: 'edge',      label: 'Edge' },
  { value: 'component', label: 'SDK' },
]

const filteredExperiments = computed(() => {
  return (experiments.value ?? []).filter(exp => {
    const matchSearch = !search.value || exp.name.toLowerCase().includes(search.value.toLowerCase()) || exp.base_url.toLowerCase().includes(search.value.toLowerCase())
    const matchStatus = filterStatus.value === 'all' || exp.status === filterStatus.value
    const matchType   = filterType.value === 'all' || exp.type === filterType.value
    return matchSearch && matchStatus && matchType
  })
})

const hasActiveFilters = computed(() => search.value || filterStatus.value !== 'all' || filterType.value !== 'all')

const clearFilters = () => { search.value = ''; filterStatus.value = 'all'; filterType.value = 'all' }

// ── Plan limits ───────────────────────────────────────────
const EXPERIMENT_LIMITS: Record<string, number> = { free: 3, starter: 3, growth: Infinity }
const experimentLimit = computed(() => EXPERIMENT_LIMITS[currentWorkspace.value?.plan ?? 'free'] ?? 3)
const atExperimentLimit = computed(() => isFinite(experimentLimit.value) && (experiments.value?.length ?? 0) >= experimentLimit.value)
</script>

<template>
  <div class="p-8 max-w-5xl">

    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Experiments</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          <span class="font-medium text-gray-700">{{ currentWorkspace?.name }}</span>
          <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{{ currentWorkspace?.plan }}</span>
        </p>
      </div>
      <div v-if="!currentWorkspace?.is_demo" class="relative group">
        <button
          :disabled="atExperimentLimit"
          class="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :class="atExperimentLimit ? 'bg-[#C96A3F] text-white' : 'bg-[#C96A3F] text-white hover:bg-[#A8522D]'"
          @click="!atExperimentLimit && openPanel()"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New experiment
        </button>
        <div v-if="atExperimentLimit" class="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
          <div class="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 w-56 text-center leading-snug shadow-lg">
            <span class="capitalize">{{ currentWorkspace?.plan }}</span> plan allows up to {{ experimentLimit }} experiment{{ experimentLimit === 1 ? '' : 's' }}.
            <NuxtLink
              :to="`/dashboard/${slug}/billing`"
              class="pointer-events-auto underline text-[#F4A87C] hover:text-white ml-0.5"
            >Upgrade to Growth →</NuxtLink>
          </div>
          <div class="w-2 h-2 bg-gray-900 rotate-45 ml-auto mr-4 -mt-1" />
        </div>
      </div>
      <span v-else class="text-xs text-gray-400 bg-gray-100 px-3 py-2 rounded-lg">Read-only demo</span>
    </div>

    <!-- Filters -->
    <div v-if="experiments?.length" class="flex flex-wrap items-center gap-3 mb-5">
      <!-- Search -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="search" type="text" placeholder="Search experiments…"
          class="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C96A3F] w-52 placeholder:text-gray-300"
        />
      </div>

      <!-- Status pills -->
      <div class="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        <button
          v-for="f in statusFilters" :key="f.value"
          :class="['px-3 py-1.5 text-xs font-medium rounded-lg transition-all', filterStatus === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          @click="filterStatus = f.value"
        >{{ f.label }}</button>
      </div>

      <!-- Type pills -->
      <div class="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        <button
          v-for="f in typeFilters" :key="f.value"
          :class="['px-3 py-1.5 text-xs font-medium rounded-lg transition-all', filterType === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          @click="filterType = f.value"
        >{{ f.label }}</button>
      </div>

      <!-- Clear -->
      <button v-if="hasActiveFilters" class="text-xs text-gray-400 hover:text-gray-600 transition-colors" @click="clearFilters">
        Clear filters
      </button>

      <span class="ml-auto text-xs text-gray-400">{{ filteredExperiments.length }} of {{ experiments?.length }}</span>
    </div>

    <!-- Empty state -->
    <div v-if="!experiments?.length" class="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
      <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 class="text-sm font-semibold text-gray-900 mb-1">No experiments yet</h3>
      <p class="text-sm text-gray-500 max-w-xs mx-auto mb-4">Create your first experiment to start splitting traffic between variants.</p>
      <button class="text-sm font-medium text-[#C96A3F] hover:text-[#A8522D]" @click="openPanel">Create experiment →</button>
    </div>

    <!-- No results -->
    <div v-else-if="experiments?.length && !filteredExperiments.length" class="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
      <p class="text-sm font-semibold text-gray-900 mb-1">No experiments match</p>
      <p class="text-sm text-gray-400 mb-4">Try adjusting your filters or search term.</p>
      <button class="text-sm font-medium text-[#C96A3F] hover:text-[#A8522D]" @click="clearFilters">Clear filters</button>
    </div>

    <!-- Experiment list -->
    <div v-else class="space-y-3">
      <div
        v-for="exp in filteredExperiments" :key="exp.id"
        class="bg-white border border-gray-200 rounded-2xl overflow-hidden transition-shadow duration-150 hover:shadow-md hover:border-gray-300"
      >
        <!-- Experiment header -->
        <div class="px-6 pt-5 pb-4 flex items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Pulse dot -->
              <span v-if="statusConfig[exp.status]?.pulse" class="relative flex h-2 w-2 shrink-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span v-else :class="['w-2 h-2 rounded-full shrink-0', statusConfig[exp.status]?.dot]" />

              <NuxtLink :to="`/dashboard/${slug}/experiments/${exp.id}`" class="text-sm font-semibold text-gray-900 hover:text-[#C96A3F] transition-colors">
                {{ exp.name }}
              </NuxtLink>
              <span :class="['text-[11px] font-semibold px-2 py-0.5 rounded-full', statusConfig[exp.status]?.class]">
                {{ statusConfig[exp.status]?.label }}
              </span>
              <KTooltip :text="exp.type === 'component' ? 'Runs inside a React/Vue/Astro component using the @koryla library' : 'Runs at the server before the page renders — zero flicker, no JS needed'">
                <span
                  class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-default"
                  :style="exp.type === 'component'
                    ? 'background: #FEF0E8; color: #C96A3F;'
                    : 'background: #EEF2FF; color: #4338CA;'"
                >
                  <!-- eye icon for SDK/component -->
                  <svg v-if="exp.type === 'component'" class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <!-- zap icon for Edge -->
                  <svg v-else class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {{ exp.type === 'component' ? 'SDK' : 'Edge' }}
                </span>
              </KTooltip>
            </div>
            <p class="text-xs text-gray-400 mt-1 truncate font-mono">{{ exp.base_url }}</p>
          </div>

          <!-- Stats -->
          <div class="hidden sm:flex items-center gap-6 text-center shrink-0">
            <div>
              <p class="text-sm font-semibold text-gray-900 tabular-nums">{{ exp.total_impressions.toLocaleString() }}</p>
              <p class="text-[11px] text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                Impressions
                <KTooltip text="Times a visitor saw a variant — each visitor is counted once" />
              </p>
            </div>
            <div>
              <p :class="['text-sm font-bold tabular-nums', exp.total_impressions && exp.total_conversions ? 'text-green-600' : 'text-gray-900']">
                {{ conversionRate(exp) }}
              </p>
              <p class="text-[11px] text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                Conv. rate
                <KTooltip text="% of visitors who reached the conversion URL after seeing a variant" />
              </p>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-400 tabular-nums">
                {{ exp.started_at ? formatDate(exp.started_at) : exp.status === 'draft' ? 'Not started' : formatDate(exp.created_at) }}
              </p>
              <p class="text-[11px] text-gray-400 mt-0.5">{{ exp.started_at ? 'Started' : 'Created' }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="!currentWorkspace?.is_demo" class="flex items-center gap-1.5 shrink-0">
            <button
              v-if="exp.status === 'draft' || exp.status === 'paused'"
              :disabled="updatingId === exp.id"
              class="text-xs font-medium text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-50 transition-colors disabled:opacity-40"
              @click="setStatus(exp, 'active')"
            >Start</button>
            <KTooltip v-if="exp.status === 'active'" text="Pauses the experiment — no new assignments, existing visitors keep their variant">
              <button
                :disabled="updatingId === exp.id"
                class="text-xs font-medium text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors disabled:opacity-40"
                @click="setStatus(exp, 'paused')"
              >Pause</button>
            </KTooltip>
            <KTooltip v-if="exp.status === 'active' || exp.status === 'paused'" text="Ends the experiment permanently and locks the results">
              <button
                :disabled="updatingId === exp.id"
                class="text-xs font-medium text-[#0F2235] hover:text-[#C96A3F] px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-[#FEF0E8] transition-colors disabled:opacity-40"
                @click="setStatus(exp, 'completed')"
              >Complete</button>
            </KTooltip>
            <button
              class="text-xs text-gray-300 hover:text-red-400 px-2 py-1.5 transition-colors"
              @click="deleteExperiment(exp)"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Variants bar -->
        <div class="px-6 pb-5">
          <div class="flex h-1 rounded-full overflow-hidden gap-px mb-2.5">
            <div
              v-for="(v, i) in exp.variants" :key="v.id"
              :style="{ width: v.traffic_weight + '%' }"
              :class="variantColors[i] ?? 'bg-gray-400'"
            />
          </div>
          <div class="flex items-start gap-5 flex-wrap">
            <div v-for="(v, i) in exp.variants" :key="v.id" class="flex items-start gap-1.5">
              <div :class="['w-2 h-2 rounded-full shrink-0 mt-[3px]', variantColors[i] ?? 'bg-gray-400']" />
              <div>
                <span class="text-xs text-gray-700 font-medium">{{ v.name }}</span>
                <span class="text-xs text-gray-400 ml-1">{{ v.traffic_weight }}%</span>
                <span v-if="exp.total_impressions" class="text-xs text-gray-400"> · {{ v.impressions.toLocaleString() }} imp</span>
                <p v-if="v.description" class="text-[11px] text-gray-400 mt-0.5 leading-relaxed italic">{{ v.description }}</p>
              </div>
            </div>
            <div class="ml-auto">
              <NuxtLink :to="`/dashboard/${slug}/experiments/${exp.id}`" class="text-xs text-gray-400 hover:text-[#C96A3F] transition-colors">
                View details →
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- New experiment slide-over -->
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showPanel" class="fixed inset-0 z-40 flex">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="closePanel" />
        <Transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="translate-x-full" enter-to-class="translate-x-0"
          leave-active-class="transition-transform duration-200 ease-in" leave-from-class="translate-x-0" leave-to-class="translate-x-full">
          <div v-if="showPanel" class="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">

            <!-- Panel header -->
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 class="text-base font-semibold text-gray-900">New experiment</h2>
              <button class="text-gray-400 hover:text-gray-600 transition-colors" @click="closePanel">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Panel body -->
            <div class="flex-1 overflow-y-auto px-6 py-6 space-y-8">

              <!-- Step 1: Type -->
              <div class="space-y-4">
                <div class="flex items-center gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <p class="text-sm font-semibold text-gray-800">Choose type</p>
                </div>

                <!-- Type -->
                <div>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      :class="['flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left', form.type === 'edge' ? 'border-[#4338CA] bg-[#EEF2FF] text-[#4338CA]' : 'border-gray-200 text-gray-500 hover:border-gray-300']"
                      @click="form.type = 'edge'"
                    >
                      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                      </svg>
                      <div>
                        <p>Edge</p>
                        <p class="text-xs font-normal opacity-70">Worker / Middleware</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      :class="['flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left', form.type === 'component' ? 'border-[#C96A3F] bg-[#FEF0E8] text-[#C96A3F]' : 'border-gray-200 text-gray-500 hover:border-gray-300']"
                      @click="form.type = 'component'"
                    >
                      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <div>
                        <p>SDK</p>
                        <p class="text-xs font-normal opacity-70">React / Vue / Astro</p>
                      </div>
                    </button>
                  </div>
                </div>

              </div>

              <!-- Step 2: Name & URLs -->
              <div class="space-y-4">
                <div class="flex items-center gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <p class="text-sm font-semibold text-gray-800">Name & URLs</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Experiment name</label>
                  <input v-model="form.name" type="text" placeholder="Homepage hero test"
                    class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    {{ form.type === 'component' ? 'Page URL' : 'Base URL' }}
                    <span class="normal-case font-normal ml-1 text-gray-400">{{ form.type === 'component' ? '— where the component renders' : '— URL to intercept' }}</span>
                  </label>
                  <input v-model="form.base_url" type="url" placeholder="https://acme.com/pricing"
                    class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Conversion URL
                    <span class="normal-case font-normal ml-1 text-gray-400">(optional)</span>
                  </label>
                  <input v-model="form.conversion_url" type="url" placeholder="https://acme.com/thank-you"
                    class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300" />
                </div>
              </div>

              <!-- Step 3: Variants -->
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2.5">
                    <span class="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                    <p class="text-sm font-semibold text-gray-800">Variants</p>
                  </div>
                  <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500']">
                    {{ totalWeight }}/100
                  </span>
                </div>

                <div class="space-y-2.5">
                  <div v-for="(v, i) in form.variants" :key="i"
                    :class="['border rounded-xl p-4 space-y-3', v.is_control ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200']">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div :class="['w-2 h-2 rounded-full shrink-0', v.is_control ? 'bg-gray-400' : 'bg-[#C96A3F]']" />
                        <input v-model="v.name" type="text" class="text-sm font-semibold text-gray-800 bg-transparent focus:outline-none border-b border-transparent focus:border-gray-300 w-32 pb-px" />
                        <span v-if="v.is_control" class="text-[10px] font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">CONTROL</span>
                      </div>
                      <button v-if="!v.is_control && form.variants.length > 2"
                        class="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                        @click="removeVariant(i)">Remove</button>
                    </div>
                    <div class="flex gap-2">
                      <!-- URL field: Edge only -->
                      <input
                        v-if="form.type === 'edge'"
                        v-model="v.target_url" type="url"
                        :placeholder="v.is_control ? 'Leave empty — uses Base URL' : 'https://acme.com/pricing-b'"
                        :disabled="v.is_control"
                        :class="['flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300', v.is_control ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : '']"
                      />
                      <div class="flex items-center gap-1.5" :class="form.type === 'edge' ? 'w-24 shrink-0' : 'flex-1'">
                        <input v-model.number="v.traffic_weight" type="number" min="1" max="99"
                          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#C96A3F]" />
                        <span class="text-xs text-gray-400 shrink-0">%</span>
                      </div>
                    </div>
                    <input v-model="v.description" type="text" placeholder="What's different? e.g. 'Blue CTA button, shorter headline' (optional)"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300" />
                  </div>
                </div>

                <button class="mt-3 w-full text-sm text-gray-400 hover:text-[#C96A3F] font-medium border border-dashed border-gray-200 hover:border-[#C96A3F] rounded-xl py-2.5 transition-colors" @click="addVariant">
                  + Add variant
                </button>
              </div>
            </div>

            <!-- Panel footer -->
            <div class="px-6 py-4 border-t border-gray-100 flex items-center gap-3 shrink-0">
              <button
                :disabled="saving || !form.name || !form.base_url || totalWeight !== 100"
                class="flex-1 bg-[#C96A3F] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#A8522D] disabled:opacity-40 transition-colors"
                @click="createExperiment"
              >
                {{ saving ? 'Creating…' : 'Create experiment' }}
              </button>
              <button class="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 transition-colors" @click="closePanel">
                Cancel
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
