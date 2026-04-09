<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { currentWorkspace, fetchWorkspaces } = useWorkspace()
const toast = useToast()
const confirm = useConfirm()

await fetchWorkspaces()
if (!currentWorkspace.value) await navigateTo('/dashboard', { replace: true })

const slug = currentWorkspace.value!.slug

// ── Experiments ───────────────────────────────────────────
interface Variant { id: string; name: string; traffic_weight: number; target_url: string; is_control: boolean; impressions: number }
interface Experiment {
  id: string; name: string; status: string; base_url: string
  created_at: string; started_at: string | null; ended_at: string | null
  variants: Variant[]; total_impressions: number; total_conversions: number
}

const { data: experiments, refresh } = await useFetch<Experiment[]>(`/api/workspaces/${slug}/experiments`)

// ── New experiment panel ──────────────────────────────────
const showPanel = ref(false)
const saving = ref(false)

interface VariantDraft { name: string; target_url: string; traffic_weight: number; is_control: boolean }
const form = reactive({
  name: '',
  base_url: '',
  conversion_url: '',
  variants: [
    { name: 'Control', target_url: '', traffic_weight: 50, is_control: true },
    { name: 'Variant B', target_url: '', traffic_weight: 50, is_control: false },
  ] as VariantDraft[],
})

const totalWeight = computed(() => form.variants.reduce((s, v) => s + v.traffic_weight, 0))

const addVariant = () => {
  const remaining = 100 - totalWeight.value
  form.variants.push({ name: `Variant ${String.fromCharCode(65 + form.variants.length)}`, target_url: '', traffic_weight: Math.max(0, remaining), is_control: false })
}

const removeVariant = (i: number) => {
  if (form.variants.length <= 2) return
  form.variants.splice(i, 1)
}

const resetForm = () => {
  form.name = ''; form.base_url = ''; form.conversion_url = ''
  form.variants = [
    { name: 'Control', target_url: '', traffic_weight: 50, is_control: true },
    { name: 'Variant B', target_url: '', traffic_weight: 50, is_control: false },
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
      body: { name: form.name, base_url: form.base_url, conversion_url: form.conversion_url || undefined, variants: form.variants },
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
const statusConfig: Record<string, { label: string; class: string }> = {
  draft:     { label: 'Draft',     class: 'bg-gray-100 text-gray-600' },
  active:    { label: 'Active',    class: 'bg-green-100 text-green-700' },
  paused:    { label: 'Paused',    class: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', class: 'bg-blue-100 text-blue-700' },
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const conversionRate = (exp: Experiment) => exp.total_impressions ? ((exp.total_conversions / exp.total_impressions) * 100).toFixed(1) + '%' : '—'
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
      <button
        class="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        @click="openPanel"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New experiment
      </button>
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
      <button class="text-sm font-medium text-blue-600 hover:text-blue-700" @click="openPanel">Create experiment →</button>
    </div>

    <!-- Experiment list -->
    <div v-else class="space-y-3">
      <div
        v-for="exp in experiments" :key="exp.id"
        class="bg-white border border-gray-200 rounded-2xl overflow-hidden"
      >
        <!-- Experiment header -->
        <div class="px-6 py-4 flex items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2.5 flex-wrap">
              <NuxtLink :to="`/dashboard/${slug}/experiments/${exp.id}`" class="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {{ exp.name }}
              </NuxtLink>
              <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', statusConfig[exp.status]?.class]">
                {{ statusConfig[exp.status]?.label }}
              </span>
            </div>
            <p class="text-xs text-gray-400 mt-1 truncate">{{ exp.base_url }}</p>
          </div>

          <!-- Stats -->
          <div class="hidden sm:flex items-center gap-6 text-center shrink-0">
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ exp.total_impressions.toLocaleString() }}</p>
              <p class="text-xs text-gray-400">Impressions</p>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ conversionRate(exp) }}</p>
              <p class="text-xs text-gray-400">Conv. rate</p>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ exp.variants.length }}</p>
              <p class="text-xs text-gray-400">Variants</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="exp.status === 'draft' || exp.status === 'paused'"
              :disabled="updatingId === exp.id"
              class="text-xs font-medium text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-50 transition-colors disabled:opacity-40"
              @click="setStatus(exp, 'active')"
            >Start</button>
            <button
              v-if="exp.status === 'active'"
              :disabled="updatingId === exp.id"
              class="text-xs font-medium text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors disabled:opacity-40"
              @click="setStatus(exp, 'paused')"
            >Pause</button>
            <button
              v-if="exp.status === 'active' || exp.status === 'paused'"
              :disabled="updatingId === exp.id"
              class="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-40"
              @click="setStatus(exp, 'completed')"
            >Complete</button>
            <button
              class="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 transition-colors"
              @click="deleteExperiment(exp)"
            >Delete</button>
          </div>
        </div>

        <!-- Variants bar -->
        <div class="px-6 pb-4">
          <div class="flex h-1.5 rounded-full overflow-hidden gap-px">
            <div
              v-for="v in exp.variants" :key="v.id"
              :style="{ width: v.traffic_weight + '%' }"
              :class="v.is_control ? 'bg-gray-400' : 'bg-blue-500'"
            />
          </div>
          <div class="flex items-center gap-4 mt-2 flex-wrap">
            <div v-for="v in exp.variants" :key="v.id" class="flex items-center gap-1.5">
              <div :class="['w-2 h-2 rounded-full shrink-0', v.is_control ? 'bg-gray-400' : 'bg-blue-500']" />
              <span class="text-xs text-gray-600">{{ v.name }}</span>
              <span class="text-xs text-gray-400">{{ v.traffic_weight }}%</span>
              <span v-if="exp.total_impressions" class="text-xs text-gray-400">· {{ v.impressions.toLocaleString() }} imp</span>
            </div>
          </div>
        </div>

        <div class="px-6 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p class="text-xs text-gray-400">Created {{ formatDate(exp.created_at) }}</p>
          <NuxtLink :to="`/dashboard/${slug}/experiments/${exp.id}`" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
            View details →
          </NuxtLink>
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
            <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              <!-- Basic info -->
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Experiment name</label>
                  <input v-model="form.name" type="text" placeholder="Homepage hero test"
                    class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">
                    Base URL
                    <span class="text-gray-400 font-normal ml-1">— URL to intercept</span>
                  </label>
                  <input v-model="form.base_url" type="url" placeholder="https://acme.com/pricing"
                    class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">
                    Conversion URL
                    <span class="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <input v-model="form.conversion_url" type="url" placeholder="https://acme.com/thank-you"
                    class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <!-- Variants -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-medium text-gray-700">Variants</label>
                  <span :class="['text-xs font-medium', totalWeight === 100 ? 'text-green-600' : 'text-red-500']">
                    {{ totalWeight }}/100
                  </span>
                </div>

                <div class="space-y-3">
                  <div v-for="(v, i) in form.variants" :key="i"
                    class="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div :class="['w-2 h-2 rounded-full', v.is_control ? 'bg-gray-400' : 'bg-blue-500']" />
                        <input v-model="v.name" type="text" class="text-sm font-medium text-gray-800 bg-transparent focus:outline-none focus:underline w-32" />
                      </div>
                      <button v-if="!v.is_control && form.variants.length > 2"
                        class="text-xs text-red-400 hover:text-red-600 transition-colors"
                        @click="removeVariant(i)">Remove</button>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                      <div class="col-span-2">
                        <input v-model="v.target_url" type="url" placeholder="https://acme.com/pricing-b"
                          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div class="flex items-center gap-1.5">
                        <input v-model.number="v.traffic_weight" type="number" min="1" max="99"
                          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <span class="text-xs text-gray-400 shrink-0">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button class="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium" @click="addVariant">
                  + Add variant
                </button>
              </div>
            </div>

            <!-- Panel footer -->
            <div class="px-6 py-4 border-t border-gray-100 flex items-center gap-3 shrink-0">
              <button
                :disabled="saving || !form.name || !form.base_url || totalWeight !== 100"
                class="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
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
