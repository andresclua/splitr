<script setup lang="ts">
import { PLANS, STRIPE_PRICES } from '~/lib/plans'
import type { PlanKey } from '~/lib/plans'

definePageMeta({ layout: 'dashboard', ssr: false, key: route => route.path })

const route = useRoute()
const toast = useToast()
const { currentWorkspace, fetchWorkspaces } = useWorkspace()

await fetchWorkspaces()
if (!currentWorkspace.value) throw createError({ statusCode: 404, statusMessage: "Workspace not found or you don't have access to it." })

const slug = route.params.slug as string

// Show success toast if redirected back from Stripe
onMounted(() => {
  if (route.query.success === '1') {
    toast.success('Subscription activated!')
    // Remove the query param without navigation
    const url = new URL(window.location.href)
    url.searchParams.delete('success')
    window.history.replaceState({}, '', url.toString())
  }
})

const billingPeriod = ref<'monthly' | 'yearly'>('monthly')
const loadingPriceId = ref<string | null>(null)
const loadingPortal = ref(false)

const currentPlan = computed<PlanKey>(() => {
  const plan = currentWorkspace.value?.plan
  if (plan === 'starter' || plan === 'growth') return plan
  return 'free'
})

const planDetails = computed(() => PLANS[currentPlan.value])

const isPaid = computed(() => currentPlan.value !== 'free')

const upgradeablePlans = computed((): PlanKey[] => ['free', 'starter', 'growth'])

const priceFor = (planKey: PlanKey, period: 'monthly' | 'yearly') => {
  return PLANS[planKey].price[period]
}

const stripePriceId = (planKey: PlanKey, period: 'monthly' | 'yearly'): string | null => {
  if (planKey === 'free') return null
  return STRIPE_PRICES[planKey as 'starter' | 'growth'][period]
}

const yearlyDiscount = (planKey: PlanKey) => {
  if (planKey === 'free') return 0
  const monthly = PLANS[planKey as 'starter' | 'growth'].price.monthly
  const yearly = PLANS[planKey as 'starter' | 'growth'].price.yearly
  return Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100)
}

const startCheckout = async (planKey: PlanKey) => {
  const priceId = stripePriceId(planKey, billingPeriod.value)
  if (!priceId) return

  loadingPriceId.value = priceId
  try {
    const { url } = await $fetch<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      body: { workspaceSlug: slug, priceId, period: billingPeriod.value },
    })
    if (url) window.location.href = url
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to start checkout')
  } finally {
    loadingPriceId.value = null
  }
}

const openPortal = async () => {
  loadingPortal.value = true
  try {
    const { url } = await $fetch<{ url: string }>('/api/billing/portal', {
      method: 'POST',
      body: { workspaceSlug: slug },
    })
    if (url) window.location.href = url
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to open billing portal')
  } finally {
    loadingPortal.value = false
  }
}
</script>

<template>
  <div class="p-8 max-w-5xl">

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-gray-900">Billing</h1>
      <p class="text-sm text-gray-500 mt-0.5">Manage your plan and subscription</p>
    </div>

    <!-- Current plan card -->
    <div class="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Current plan</p>
          <div class="flex items-center gap-2.5">
            <h2 class="text-xl font-semibold text-gray-900">{{ planDetails.name }}</h2>
            <span
              v-if="isPaid"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF0E8] text-[#C96A3F] capitalize"
            >
              {{ currentWorkspace?.billing_period ?? 'monthly' }}
            </span>
          </div>
          <p v-if="!isPaid" class="text-sm text-gray-500 mt-1">Free forever, no credit card required</p>
          <p v-else class="text-sm text-gray-500 mt-1">
            ${{ priceFor(currentPlan, (currentWorkspace?.billing_period ?? 'monthly') as 'monthly' | 'yearly') }}/{{ currentWorkspace?.billing_period === 'yearly' ? 'year' : 'month' }}
          </p>
        </div>

        <button
          v-if="isPaid"
          :disabled="loadingPortal"
          class="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          @click="openPortal"
        >
          <svg v-if="loadingPortal" class="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Manage billing
        </button>
      </div>

      <!-- Plan limits -->
      <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-gray-100">
        <div>
          <p class="text-xs text-gray-400 mb-0.5">Experiments</p>
          <p class="text-sm font-semibold text-gray-800">{{ planDetails.experiments.toLocaleString() }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-0.5">Monthly visits</p>
          <p class="text-sm font-semibold text-gray-800">{{ planDetails.visitsPerMonth.toLocaleString() }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-0.5">Workspaces</p>
          <p class="text-sm font-semibold text-gray-800">{{ planDetails.workspaces }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-0.5">Multivariate</p>
          <p class="text-sm font-semibold text-gray-800">{{ planDetails.multivariate ? 'Yes' : 'No' }}</p>
        </div>
      </div>
    </div>

    <!-- Plan options -->
    <template v-if="upgradeablePlans.length > 0">
      <!-- Period toggle -->
      <div class="flex items-center gap-3 mb-6">
        <span class="text-sm text-gray-700 font-medium">Billing period</span>
        <div class="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            :class="[
              'text-sm px-3.5 py-1.5 rounded-md transition-colors font-medium',
              billingPeriod === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            ]"
            @click="billingPeriod = 'monthly'"
          >Monthly</button>
          <button
            :class="[
              'text-sm px-3.5 py-1.5 rounded-md transition-colors font-medium',
              billingPeriod === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            ]"
            @click="billingPeriod = 'yearly'"
          >
            Yearly
            <span class="ml-1 text-xs font-semibold text-green-600">save {{ yearlyDiscount('starter') }}%</span>
          </button>
        </div>
      </div>

      <!-- Upgrade cards -->
      <div class="grid sm:grid-cols-3 gap-4">
        <div
          v-for="planKey in upgradeablePlans"
          :key="planKey"
          class="bg-white border rounded-2xl p-6 flex flex-col"
          :class="planKey === currentPlan ? 'border-green-400 ring-1 ring-green-400' : planKey === 'growth' ? 'border-[#C96A3F] ring-1 ring-[#C96A3F]' : 'border-gray-200'"
        >
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-semibold text-gray-900">{{ PLANS[planKey].name }}</h3>
            <span v-if="planKey === currentPlan" class="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Current plan</span>
            <span v-else-if="planKey === 'growth'" class="text-xs font-semibold text-[#C96A3F] bg-[#FEF0E8] px-2 py-0.5 rounded-full">Popular</span>
          </div>

          <div class="mb-4">
            <template v-if="planKey === 'free'">
              <span class="text-3xl font-bold text-gray-900">$0</span>
              <span class="text-sm text-gray-400 ml-1">/ month</span>
              <p class="text-xs text-gray-400 mt-0.5">Cancel anytime, effective at period end</p>
            </template>
            <template v-else>
              <span class="text-3xl font-bold text-gray-900">${{ priceFor(planKey, billingPeriod) }}</span>
              <span class="text-sm text-gray-400 ml-1">/ {{ billingPeriod === 'yearly' ? 'year' : 'month' }}</span>
              <p v-if="billingPeriod === 'yearly'" class="text-xs text-green-600 mt-0.5 font-medium">
                Save ${{ PLANS[planKey as 'starter' | 'growth'].price.monthly * 12 - PLANS[planKey as 'starter' | 'growth'].price.yearly }} vs monthly
              </p>
            </template>
          </div>

          <ul class="space-y-2 mb-6 flex-1">
            <li class="flex items-center gap-2 text-sm text-gray-600">
              <svg class="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {{ PLANS[planKey].experiments }} experiments
            </li>
            <li class="flex items-center gap-2 text-sm text-gray-600">
              <svg class="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {{ PLANS[planKey].visitsPerMonth.toLocaleString() }} visits/month
            </li>
            <li class="flex items-center gap-2 text-sm text-gray-600">
              <svg class="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {{ PLANS[planKey].workspaces }} workspace{{ PLANS[planKey].workspaces > 1 ? 's' : '' }}
            </li>
            <li v-if="PLANS[planKey].multivariate" class="flex items-center gap-2 text-sm text-gray-600">
              <svg class="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Multivariate testing
            </li>
            <li v-if="PLANS[planKey].webhooks" class="flex items-center gap-2 text-sm text-gray-600">
              <svg class="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Webhooks
            </li>
            <li class="flex items-center gap-2 text-sm text-gray-600">
              <svg class="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              No branding
            </li>
          </ul>

          <button
            v-if="planKey !== currentPlan"
            :disabled="planKey === 'free' ? loadingPortal : loadingPriceId === stripePriceId(planKey, billingPeriod)"
            class="w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            :class="planKey === 'growth' ? 'bg-[#C96A3F] text-white hover:bg-[#A8522D]' : planKey === 'free' ? 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50' : 'bg-gray-900 text-white hover:bg-gray-800'"
            @click="planKey === 'free' ? openPortal() : startCheckout(planKey)"
          >
            <svg
              v-if="planKey === 'free' ? loadingPortal : loadingPriceId === stripePriceId(planKey, billingPeriod)"
              class="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ planKey === 'free' ? 'Downgrade to Free' : (currentPlan === 'free' || planKey === 'growth' ? 'Upgrade' : 'Downgrade') + ' to ' + PLANS[planKey].name }}
          </button>
          <div
            v-else
            class="w-full py-2.5 rounded-xl text-sm font-medium text-center text-gray-400 bg-gray-50 border border-gray-100"
          >
            Your current plan
          </div>
        </div>
      </div>
    </template>

  </div>
</template>
