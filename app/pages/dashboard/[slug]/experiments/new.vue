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
  <div><!-- template coming in Task 2 --></div>
</template>
