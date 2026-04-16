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
          target_url: v.is_control ? '' : v.target_url, // API stores empty string as null for control
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

        <!-- ─── Node 2: Experiment ─── -->
        <template v-if="confirmed.traffic">

          <!-- CONFIRMED state -->
          <div
            v-if="confirmed.experiment"
            class="w-full max-w-md relative border-2 border-[#C96A3F] bg-[#FEF0E8] rounded-2xl px-5 py-4 cursor-pointer hover:-translate-y-px transition-transform"
            @click="reopenStep('experiment')"
          >
            <span class="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</span>
            <p class="text-sm font-semibold text-[#9a3412]">🔀 {{ expName }}</p>
            <p class="text-xs text-[#9a3412] mt-0.5 opacity-70">{{ expType === 'edge' ? 'Edge · Worker / Middleware' : 'SDK · Component' }}</p>
          </div>

          <!-- ACTIVE state -->
          <div
            v-else
            class="w-full max-w-md border-2 border-[#C96A3F] bg-white rounded-2xl px-5 py-5 shadow-sm"
          >
            <p class="text-sm font-semibold text-gray-900 mb-4">🔀 Experiment</p>

            <label for="exp-name" class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Experiment name</label>
            <input
              id="exp-name"
              v-model="expName"
              type="text"
              placeholder="Homepage hero test"
              class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300"
              @keydown.enter="confirmExperiment"
            />

            <label class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1.5">Type</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                :class="['flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left', expType === 'edge' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300']"
                @click="expType = 'edge'"
              >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <p>Edge</p>
                  <p class="text-xs font-normal opacity-70">Worker / Middleware</p>
                </div>
              </button>
              <button
                type="button"
                :class="['flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left', expType === 'component' ? 'border-[#C96A3F] bg-[#FEF0E8] text-[#C96A3F]' : 'border-gray-200 text-gray-500 hover:border-gray-300']"
                @click="expType = 'component'"
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

            <button
              class="mt-4 bg-[#C96A3F] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#A8522D] transition-colors disabled:opacity-40"
              :disabled="!expName.trim()"
              @click="confirmExperiment"
            >Confirm →</button>
          </div>

          <!-- Connector -->
          <template v-if="confirmed.experiment">
            <div class="w-px h-6 bg-gray-200 my-1" />
            <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-200 mb-1" />
          </template>

          <!-- Pending placeholder for node 3 -->
          <div
            v-if="!confirmed.experiment"
            class="w-full max-w-md border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl px-5 py-4 text-center text-xs text-gray-400 mt-3"
          >
            🔀 Variants
          </div>
        </template>

        <!-- ─── Node 3: Variants ─── -->
        <template v-if="confirmed.experiment">

          <!-- CONFIRMED state -->
          <div
            v-if="confirmed.variants"
            class="w-full max-w-md relative border-2 border-green-500 bg-green-50 rounded-2xl px-5 py-4 cursor-pointer hover:-translate-y-px transition-transform"
            @click="reopenStep('variants')"
          >
            <span class="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</span>
            <p class="text-sm font-semibold text-green-800">🔀 Variants</p>
            <p class="text-xs text-green-700 mt-0.5">
              {{ variants.map(v => `${v.is_control ? '⚪' : '🟠'} ${v.name} ${v.traffic_weight}%`).join(' · ') }}
            </p>
          </div>

          <!-- ACTIVE state -->
          <div
            v-else
            class="w-full max-w-md border-2 border-[#C96A3F] bg-white rounded-2xl px-5 py-5 shadow-sm"
          >
            <div class="flex items-center justify-between mb-4">
              <p class="text-sm font-semibold text-gray-900">🔀 Variants</p>
              <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500']">
                {{ totalWeight }}/100
              </span>
            </div>

            <div class="space-y-3">
              <div
                v-for="(v, i) in variants"
                :key="i"
                :class="['border rounded-xl p-3.5', v.is_control ? 'border-gray-200 bg-gray-50' : 'border-[#C96A3F]/30']"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <div :class="['w-2 h-2 rounded-full shrink-0', v.is_control ? 'bg-gray-400' : 'bg-[#C96A3F]']" />
                    <span class="text-xs font-semibold text-gray-700">{{ v.name }}</span>
                    <span v-if="v.is_control" class="text-[10px] font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">CONTROL</span>
                  </div>
                  <button
                    v-if="!v.is_control && variants.length > 2"
                    class="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                    @click="removeVariant(i)"
                  >Remove</button>
                </div>
                <div class="flex gap-2">
                  <input
                    :id="`variant-url-${i}`"
                    v-model="v.target_url"
                    type="url"
                    :placeholder="v.is_control ? 'Uses base URL' : 'https://acme.com/pricing-b'"
                    :disabled="v.is_control"
                    :class="['flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300', v.is_control ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : '']"
                  />
                  <div class="flex items-center gap-1 w-20 shrink-0">
                    <input
                      :id="`variant-weight-${i}`"
                      v-model.number="v.traffic_weight"
                      type="number"
                      min="1"
                      max="99"
                      class="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
                    />
                    <span class="text-xs text-gray-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              class="mt-3 w-full text-xs text-gray-400 hover:text-[#C96A3F] font-medium border border-dashed border-gray-200 hover:border-[#C96A3F] rounded-xl py-2 transition-colors"
              @click="addVariant"
            >+ Add variant</button>

            <button
              class="mt-3 bg-[#C96A3F] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#A8522D] transition-colors"
              @click="confirmVariants"
            >Confirm →</button>
          </div>

          <!-- Connector -->
          <template v-if="confirmed.variants">
            <div class="w-px h-6 bg-gray-200 my-1" />
            <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-200 mb-1" />
          </template>

          <!-- Pending placeholder for node 4 -->
          <div
            v-if="!confirmed.variants"
            class="w-full max-w-md border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl px-5 py-4 text-center text-xs text-gray-400 mt-3"
          >
            🎯 Conversion goal (optional)
          </div>
        </template>

        <!-- ─── Node 4: Conversion Goal ─── -->
        <template v-if="confirmed.variants">

          <!-- CONFIRMED / SKIPPED state (skipped = no URL, but step done) -->
          <div
            v-if="activeStep !== 'conversion'"
            class="w-full max-w-md border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl px-5 py-4 cursor-pointer hover:-translate-y-px transition-transform"
            @click="activeStep = 'conversion'"
          >
            <p class="text-sm font-semibold text-gray-500">
              🎯 {{ conversionUrl.trim() ? previewConvHost : 'No conversion goal' }}
            </p>
          </div>

          <!-- ACTIVE state -->
          <div
            v-else
            class="w-full max-w-md border-2 border-gray-300 bg-white rounded-2xl px-5 py-5 shadow-sm"
          >
            <p class="text-sm font-semibold text-gray-900 mb-1">🎯 Conversion goal</p>
            <p class="text-xs text-gray-400 mb-4">Optional — the URL that counts as a successful conversion.</p>

            <label for="conversion-url" class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Conversion URL</label>
            <input
              id="conversion-url"
              v-model="conversionUrl"
              type="url"
              placeholder="https://acme.com/thank-you"
              class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] placeholder:text-gray-300"
            />

            <div class="flex items-center gap-3 mt-4">
              <button
                type="button"
                class="bg-[#C96A3F] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#A8522D] transition-colors disabled:opacity-40"
                :disabled="saving"
                @click="createExperiment"
              >{{ saving ? 'Creating…' : 'Create experiment' }}</button>
              <button
                type="button"
                class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                :disabled="saving"
                @click="conversionUrl = ''; createExperiment()"
              >Skip & create</button>
            </div>
          </div>
        </template>

        <!-- "Create experiment" shortcut — shown below node 3 once variants confirmed,
             so the user can create without filling a conversion goal -->
        <div v-if="confirmed.variants && activeStep !== 'conversion'" class="mt-6">
          <button
            class="bg-[#C96A3F] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[#A8522D] transition-colors disabled:opacity-40"
            :disabled="saving"
            @click="createExperiment"
          >{{ saving ? 'Creating…' : 'Create experiment' }}</button>
        </div>

      </div>

      <!-- ── Preview column (45%) ── -->
      <div class="w-[45%] border-l border-gray-100 bg-gray-50 overflow-y-auto px-8 py-8">
        <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">Flow preview</p>

        <!-- Traffic pill -->
        <div :class="['text-xs font-semibold px-3 py-1.5 rounded-full text-center', confirmed.traffic ? 'bg-green-100 text-green-700' : 'border border-dashed border-gray-300 text-gray-400']">
          🌐 {{ confirmed.traffic ? previewHost : 'Traffic' }}
        </div>

        <!-- Arrow -->
        <div class="flex flex-col items-center my-1.5">
          <div class="w-px h-4 bg-gray-200" />
          <div class="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-200" />
        </div>

        <!-- Experiment pill -->
        <div :class="['text-xs font-semibold px-3 py-1.5 rounded-full text-center', confirmed.experiment ? 'bg-[#FEF0E8] text-[#C96A3F]' : 'border border-dashed border-gray-300 text-gray-400']">
          🔀 {{ confirmed.experiment ? expName : 'Experiment' }}
        </div>

        <!-- Arrow -->
        <div class="flex flex-col items-center my-1.5">
          <div class="w-px h-4 bg-gray-200" />
          <div class="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-200" />
        </div>

        <!-- Variant pills (side by side once confirmed, single pill otherwise) -->
        <div v-if="confirmed.variants" class="flex flex-wrap gap-1.5 justify-center">
          <div
            v-for="(v, i) in variants"
            :key="i"
            :class="['text-xs font-semibold px-2.5 py-1 rounded-full', v.is_control ? 'bg-gray-100 text-gray-600' : 'bg-[#FEF0E8] text-[#C96A3F]']"
          >
            {{ v.is_control ? '⚪' : '🟠' }} {{ v.name }} {{ v.traffic_weight }}%
          </div>
        </div>
        <div
          v-else
          class="text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 text-center"
        >
          ⚪🟠 Variants
        </div>

        <!-- Arrow -->
        <div class="flex flex-col items-center my-1.5">
          <div class="w-px h-4 bg-gray-200" />
          <div class="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-200" />
        </div>

        <!-- Conversion pill -->
        <div :class="['text-xs font-semibold px-3 py-1.5 rounded-full text-center', conversionUrl.trim() ? 'bg-blue-50 text-blue-600' : 'border border-dashed border-gray-300 text-gray-400']">
          🎯 {{ conversionUrl.trim() ? previewConvHost : 'Goal?' }}
        </div>
      </div>

    </div>
  </div>
</template>
