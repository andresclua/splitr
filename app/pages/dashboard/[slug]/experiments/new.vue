<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { currentWorkspace, fetchWorkspaces } = useWorkspace()
const toast = useToast()

await fetchWorkspaces()
if (!currentWorkspace.value) await navigateTo('/dashboard', { replace: true })

const slug = currentWorkspace.value!.slug

// ── Step state ────────────────────────────────────────────
type Step = 'traffic' | 'experiment' | 'variants' | 'conversion'
const activeStep = ref<Step>('traffic')
const confirmed = reactive({ traffic: false, experiment: false, variants: false })

// ── Form state ────────────────────────────────────────────
const baseUrl = ref('')
const expName = ref('')
const expType = ref<'edge' | 'component'>('edge')

interface VariantDraft {
  name: string
  target_url: string
  traffic_weight: number
  is_control: boolean
}
const variants = ref<VariantDraft[]>([
  { name: 'Control',   target_url: '', traffic_weight: 50, is_control: true  },
  { name: 'Variant B', target_url: '', traffic_weight: 50, is_control: false },
])
const conversionUrl = ref('')

// ── Computed ──────────────────────────────────────────────
const totalWeight = computed(() =>
  variants.value.reduce((s, v) => s + v.traffic_weight, 0)
)

// Hostname only, for the preview pill
const previewHost = computed(() => {
  try { return new URL(baseUrl.value).hostname } catch { return baseUrl.value }
})

// Hostname for conversion URL preview pill
const previewConvHost = computed(() => {
  try { return new URL(conversionUrl.value).hostname } catch { return conversionUrl.value }
})

// ── Variant helpers ───────────────────────────────────────
const VARIANT_LETTERS = ['B','C','D','E','F','G','H','I','J']

const rebalance = () => {
  const count = variants.value.length
  const weight = Math.floor(100 / count)
  const remainder = 100 - weight * count
  variants.value.forEach((v, i) => { v.traffic_weight = weight + (i === 0 ? remainder : 0) })
}

const addVariant = () => {
  const usedNames = new Set(variants.value.map(v => v.name))
  const letter = VARIANT_LETTERS.find(l => !usedNames.has(`Variant ${l}`)) ?? String(variants.value.length)
  variants.value.push({ name: `Variant ${letter}`, target_url: '', traffic_weight: 0, is_control: false })
  rebalance()
}

const removeVariant = (i: number) => {
  if (variants.value.length <= 2) return
  variants.value.splice(i, 1)
  rebalance()
}

// ── Confirm / reopen handlers ─────────────────────────────
const confirmTraffic = () => {
  if (!baseUrl.value.trim()) return
  confirmed.traffic = true
  activeStep.value = 'experiment'
}

const confirmExperiment = () => {
  if (!expName.value.trim()) return
  confirmed.experiment = true
  activeStep.value = 'variants'
}

const confirmVariants = () => {
  const nonCtl = variants.value.filter(v => !v.is_control)
  if (nonCtl.some(v => !v.target_url.trim())) return toast.error('All variant URLs are required')
  if (totalWeight.value !== 100) return toast.error('Weights must sum to 100')
  confirmed.variants = true
  activeStep.value = 'conversion'
}

const reopenStep = (step: Step) => {
  if (step === 'traffic') { confirmed.traffic = false; confirmed.experiment = false; confirmed.variants = false }
  else if (step === 'experiment') { confirmed.experiment = false; confirmed.variants = false }
  else if (step === 'variants') { confirmed.variants = false }
  activeStep.value = step
}

// ── Create ────────────────────────────────────────────────
const saving = ref(false)

const createExperiment = async () => {
  saving.value = true
  try {
    const data = await $fetch<{ id: string }>(`/api/workspaces/${slug}/experiments`, {
      method: 'POST',
      body: {
        name: expName.value,
        type: expType.value,
        base_url: baseUrl.value,
        conversion_url: conversionUrl.value.trim() || undefined,
        variants: variants.value.map(v => ({
          name: v.name,
          target_url: v.is_control ? '' : v.target_url,
          traffic_weight: v.traffic_weight,
          is_control: v.is_control,
        })),
      },
    })
    await navigateTo(`/dashboard/${slug}/experiments/${data.id}`)
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to create experiment')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">

    <!-- Page header -->
    <div class="shrink-0 px-8 py-5 border-b border-gray-100 flex items-center gap-4 bg-white">
      <NuxtLink
        :to="`/dashboard/${slug}`"
        class="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All experiments
      </NuxtLink>
      <span class="text-gray-200">|</span>
      <h1 class="text-sm font-semibold text-gray-900">New experiment</h1>
    </div>

    <!-- Split layout -->
    <div class="flex flex-1 min-h-0">

      <!-- ── Builder column (55%) ── -->
      <div class="w-[55%] overflow-y-auto px-10 py-8 flex flex-col items-center">

        <!-- ─── Node 1: Traffic ─── -->
        <!-- CONFIRMED state -->
        <div
          v-if="confirmed.traffic"
          class="w-full max-w-md relative border-2 border-green-500 bg-green-50 rounded-2xl px-5 py-4 cursor-pointer hover:-translate-y-px transition-transform"
          @click="reopenStep('traffic')"
        >
          <!-- ✓ badge -->
          <span class="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</span>
          <p class="text-sm font-semibold text-green-800">🌐 Traffic</p>
          <p class="text-xs text-green-700 mt-0.5 font-mono">{{ baseUrl }}</p>
        </div>

        <!-- ACTIVE state -->
        <div
          v-else
          class="w-full max-w-md border-2 border-[#C96A3F] bg-white rounded-2xl px-5 py-5 shadow-sm"
        >
          <p class="text-sm font-semibold text-gray-900 mb-4">🌐 Traffic</p>
          <label for="base-url" class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Base URL</label>
          <input
            id="base-url"
            v-model="baseUrl"
            type="url"
            placeholder="https://acme.com/pricing"
            class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300"
            @keydown.enter="confirmTraffic"
          />
          <button
            class="mt-4 bg-[#C96A3F] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#A8522D] transition-colors disabled:opacity-40"
            :disabled="!baseUrl.trim()"
            @click="confirmTraffic"
          >Confirm →</button>
        </div>

        <!-- Connector arrow (visible when node 1 confirmed) -->
        <template v-if="confirmed.traffic">
          <div class="w-px h-6 bg-gray-200 my-1" />
          <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-200 mb-1" />
        </template>

        <!-- Pending placeholder for node 2 (when node 1 not yet confirmed) -->
        <div
          v-if="!confirmed.traffic"
          class="w-full max-w-md border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl px-5 py-4 text-center text-xs text-gray-400 mt-3"
        >
          🔀 Experiment
        </div>

        <!-- nodes 2–4 added in Task 3 & 4 -->

      </div>

      <!-- ── Preview column (45%) ── -->
      <div class="w-[45%] border-l border-gray-100 bg-gray-50 overflow-y-auto px-8 py-8">
        <!-- preview added in Task 4 -->
      </div>

    </div>
  </div>
</template>
