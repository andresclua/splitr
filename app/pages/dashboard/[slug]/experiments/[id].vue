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

interface Variant {
  id: string; name: string; traffic_weight: number
  target_url: string; is_control: boolean; impressions: number
}
interface Experiment {
  id: string; name: string; status: string; base_url: string; conversion_url: string | null
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

const leadingId = computed(() => {
  if (!experiment.value?.total_impressions) return null
  return [...(experiment.value.variants ?? [])].sort((a, b) => b.impressions - a.impressions)[0]?.id
})

const variantColors = ['bg-gray-400', 'bg-[#C96A3F]', 'bg-[#0F2235]', 'bg-emerald-500']
const variantColorDot = ['bg-gray-400', 'bg-[#C96A3F]', 'bg-[#0F2235]', 'bg-emerald-500']
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
          <span v-if="statusConfig[experiment.status]?.pulse" class="relative flex h-2.5 w-2.5 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span v-else :class="['w-2.5 h-2.5 rounded-full shrink-0', statusConfig[experiment.status]?.dot]" />

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
        <div class="flex items-center gap-2 shrink-0">
          <button v-if="experiment.status === 'draft' || experiment.status === 'paused'"
            :disabled="updating"
            class="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            @click="setStatus('active')">
            Start
          </button>
          <button v-if="experiment.status === 'active'"
            :disabled="updating"
            class="text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            @click="setStatus('paused')">
            Pause
          </button>
          <button v-if="experiment.status === 'active' || experiment.status === 'paused'"
            :disabled="updating"
            class="text-sm font-semibold text-[#0F2235] bg-[#FEF0E8] hover:bg-[#F0C9B0] border border-[#F0C9B0] px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            @click="setStatus('completed')">
            Complete
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
        <div class="bg-white rounded-2xl border border-gray-200 px-6 py-5">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Total impressions</p>
          <p class="text-3xl font-bold text-gray-900">{{ experiment.total_impressions.toLocaleString() }}</p>
          <p class="text-xs text-gray-400 mt-1.5">across {{ experiment.variants.length }} variants</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 px-6 py-5">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Conversions</p>
          <p class="text-3xl font-bold text-gray-900">{{ experiment.total_conversions.toLocaleString() }}</p>
          <p class="text-xs text-gray-400 mt-1.5 truncate font-mono">
            {{ experiment.conversion_url ?? 'no conversion URL' }}
          </p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 px-6 py-5">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Conv. rate</p>
          <p class="text-3xl font-bold text-gray-900">
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
          <div v-for="(v, i) in experiment.variants" :key="v.id"
            class="grid grid-cols-[auto_1fr_auto] items-center gap-6 px-6 py-4">

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
</template>
