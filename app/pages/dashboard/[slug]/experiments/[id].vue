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
  id: string; name: string; status: string; base_url: string; conversion_url: string | null
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

const leadingId = computed(() => {
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

const variantColors = ['bg-gray-400', 'bg-[#C96A3F]', 'bg-[#0F2235]', 'bg-emerald-500']
const variantColorDot = ['bg-gray-400', 'bg-[#C96A3F]', 'bg-[#0F2235]', 'bg-emerald-500']

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
</script>

<template>
  <div v-if="experiment" class="flex flex-col min-h-full">

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
            class="text-sm font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg transition-colors"
            @click="openEdit">
            Edit
          </button>
          <button
            class="text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            @click="deleteExperiment">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="flex-1 p-8 space-y-5 max-w-4xl">

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div :class="['bg-white rounded-2xl border px-6 py-5 transition-colors', experiment.status === 'active' ? 'border-green-200 border-l-4 border-l-green-500' : 'border-gray-200']">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            Total impressions
            <KTooltip text="Times a visitor saw a variant — each visitor is counted once" />
          </p>
          <p class="text-3xl font-bold text-gray-900 tabular-nums">{{ experiment.total_impressions.toLocaleString() }}</p>
          <p class="text-xs text-gray-400 mt-1.5">across {{ experiment.variants.length }} variants</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 px-6 py-5">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Conversions</p>
          <p class="text-3xl font-bold text-gray-900 tabular-nums">{{ experiment.total_conversions.toLocaleString() }}</p>
          <p class="text-xs text-gray-400 mt-1.5 truncate font-mono">
            {{ experiment.conversion_url ?? 'no conversion URL set' }}
          </p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 px-6 py-5">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            Conv. rate
            <KTooltip text="% of visitors who reached the conversion URL after seeing a variant" />
          </p>
          <p class="text-3xl font-bold text-gray-900 tabular-nums">
            {{ experiment.total_impressions ? ((experiment.total_conversions / experiment.total_impressions) * 100).toFixed(2) + '%' : '—' }}
          </p>
          <p class="text-xs text-gray-400 mt-1.5 capitalize">{{ experiment.status === 'active' ? 'experiment live' : experiment.status }}</p>
        </div>
      </div>

      <!-- Variants -->
      <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        <!-- Section header -->
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-900">Variants</h2>
          <span class="text-xs text-gray-400">{{ experiment.variants.length }} variants</span>
        </div>

        <!-- Split bar -->
        <div class="px-6 pt-4 pb-1">
          <div class="flex h-1.5 rounded-full overflow-hidden gap-px">
            <div
              v-for="(v, i) in experiment.variants" :key="v.id"
              :class="variantColors[i] ?? 'bg-gray-400'"
              :style="{ width: v.traffic_weight + '%' }"
            />
          </div>
        </div>

        <!-- Variant rows -->
        <div class="divide-y divide-gray-100 mt-2">
          <div v-for="(v, i) in experiment.variants" :key="v.id" class="px-6 py-4">
            <div class="grid grid-cols-[auto_1fr_auto] items-center gap-6">

            <!-- Name + URL -->
            <div class="flex items-center gap-3 w-52">
              <div :class="['w-2.5 h-2.5 rounded-full shrink-0', variantColorDot[i] ?? 'bg-gray-400']" />
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-semibold text-gray-800 truncate">{{ v.name }}</span>
                  <span v-if="v.is_control" class="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">CTL</span>
                  <span v-if="leadingId === v.id && experiment.total_impressions > 0"
                    class="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded ring-1 ring-green-200 shrink-0">▲ Leading</span>
                </div>
                <p class="text-xs text-gray-400 font-mono truncate mt-0.5">{{ v.target_url }}</p>
              </div>
            </div>

            <!-- Traffic bar -->
            <div class="flex items-center gap-3">
              <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  :class="['h-full rounded-full', variantColors[i] ?? 'bg-gray-400']"
                  :style="{ width: v.traffic_weight + '%' }"
                />
              </div>
              <span class="text-xs font-semibold text-gray-500 w-8 text-right tabular-nums">{{ v.traffic_weight }}%</span>
            </div>

            <!-- Stats -->
            <div class="flex items-center gap-8">
              <div class="text-right w-20">
                <p class="text-sm font-bold text-gray-900 tabular-nums">{{ v.impressions.toLocaleString() }}</p>
                <p class="text-xs text-gray-400 mt-0.5">impressions</p>
              </div>
              <div class="text-right w-14">
                <p class="text-sm font-bold tabular-nums"
                  :class="leadingId === v.id && experiment.total_impressions > 0 ? 'text-green-600' : 'text-gray-900'">
                  {{ experiment.total_impressions ? ((v.impressions / experiment.total_impressions) * 100).toFixed(1) + '%' : '—' }}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">share</p>
              </div>
            </div>

            </div>

            <!-- Full-width description -->
            <div v-if="v.description" class="mt-2.5 ml-[1.375rem] flex items-start gap-2">
              <KTooltip text="Description of what's visually different in this variant" position="bottom">
                <span class="text-[10px] font-bold uppercase tracking-wide text-[#C96A3F] bg-[#FEF0E8] px-1.5 py-0.5 rounded shrink-0 cursor-default">Visual changes</span>
              </KTooltip>
              <p class="text-xs text-gray-500 leading-relaxed">{{ v.description }}</p>
            </div>

          </div>
        </div>
      </div>

      <!-- Details -->
      <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100">
          <h2 class="text-sm font-semibold text-gray-900">Details</h2>
        </div>
        <dl>
          <div class="flex items-center justify-between px-6 py-3.5 border-b border-gray-50 last:border-0">
            <dt class="text-sm text-gray-500">Base URL</dt>
            <dd class="text-sm text-gray-800 font-mono">{{ experiment.base_url }}</dd>
          </div>
          <div v-if="experiment.conversion_url" class="flex items-center justify-between px-6 py-3.5 border-b border-gray-50 last:border-0">
            <dt class="text-sm text-gray-500">Conversion URL</dt>
            <dd class="text-sm text-gray-800 font-mono">{{ experiment.conversion_url }}</dd>
          </div>
          <div class="flex items-center justify-between px-6 py-3.5 border-b border-gray-50 last:border-0">
            <dt class="text-sm text-gray-500">Created</dt>
            <dd class="text-sm text-gray-700">{{ formatDate(experiment.created_at) }}</dd>
          </div>
          <div class="flex items-center justify-between px-6 py-3.5 border-b border-gray-50 last:border-0">
            <dt class="text-sm text-gray-500">Started</dt>
            <dd class="text-sm text-gray-700">{{ formatDate(experiment.started_at) }}</dd>
          </div>
          <div v-if="experiment.ended_at" class="flex items-center justify-between px-6 py-3.5">
            <dt class="text-sm text-gray-500">Completed</dt>
            <dd class="text-sm text-gray-700">{{ formatDate(experiment.ended_at) }}</dd>
          </div>
        </dl>
      </div>

    </div>
  </div>

  <!-- Edit panel -->
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showEdit" class="fixed inset-0 z-40 flex">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="showEdit = false" />
        <Transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="translate-x-full" enter-to-class="translate-x-0"
          leave-active-class="transition-transform duration-200 ease-in" leave-from-class="translate-x-0" leave-to-class="translate-x-full">
          <div v-if="showEdit" class="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">

            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 class="text-base font-semibold text-gray-900">Edit experiment</h2>
              <button class="text-gray-400 hover:text-gray-600 transition-colors" @click="showEdit = false">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              <div>
                <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Experiment name</label>
                <input v-model="editForm.name" type="text"
                  class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F]" />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Conversion URL
                  <span class="normal-case font-normal ml-1 text-gray-400">(optional)</span>
                </label>
                <input v-model="editForm.conversion_url" type="url" placeholder="https://acme.com/thank-you"
                  class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300" />
              </div>

              <div>
                <label class="flex items-center gap-3 cursor-pointer select-none">
                  <div class="relative">
                    <input v-model="editForm.override_assignment" type="checkbox" class="sr-only peer" />
                    <div class="w-9 h-5 bg-gray-200 peer-checked:bg-[#C96A3F] rounded-full transition-colors" />
                    <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-700">Rules override existing assignment</p>
                    <p class="text-xs text-gray-400">When active, query param rules reassign visitors even if they already have a cookie.</p>
                  </div>
                </label>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Variant descriptions</label>
                <div class="space-y-3">
                  <div v-for="v in editForm.variantDescriptions" :key="v.id" class="border border-gray-200 rounded-xl p-4 space-y-2">
                    <div class="flex items-center gap-2">
                      <div :class="['w-2 h-2 rounded-full shrink-0', v.id === editForm.variantDescriptions[0]?.id ? 'bg-gray-400' : 'bg-[#C96A3F]']" />
                      <span class="text-sm font-semibold text-gray-700">{{ v.name }}</span>
                    </div>
                    <input v-model="v.description" type="text"
                      placeholder="What's different in this variant? (optional)"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300" />
                    <!-- Targeting rules -->
                    <div class="pt-2 space-y-2">
                      <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Targeting rules
                        <span class="normal-case font-normal ml-1">(OR — any match routes here)</span>
                      </p>
                      <div v-for="(rule, i) in v.rules" :key="i" class="flex items-center gap-2">
                        <input v-model="rule.param" type="text" placeholder="utm_source"
                          class="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300 font-mono" />
                        <span class="text-xs text-gray-400">=</span>
                        <input v-model="rule.value" type="text" placeholder="facebook"
                          class="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300 font-mono" />
                        <button type="button" class="text-gray-300 hover:text-red-400 transition-colors shrink-0" @click="removeRule(v.id, i)">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <button type="button"
                        class="text-xs text-[#C96A3F] hover:text-[#A8522D] font-medium transition-colors flex items-center gap-1"
                        @click="addRule(v.id)">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add rule
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="experiment?.status === 'active'" class="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Variant URLs and traffic weights can't be changed while the experiment is active.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-gray-100 flex items-center gap-3 shrink-0">
              <button
                :disabled="saving || !editForm.name"
                class="flex-1 bg-[#C96A3F] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#A8522D] disabled:opacity-40 transition-colors"
                @click="saveEdit"
              >{{ saving ? 'Saving…' : 'Save changes' }}</button>
              <button class="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 transition-colors" @click="showEdit = false">
                Cancel
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
