<script setup lang="ts">
definePageMeta({ layout: false, ssr: false, middleware: 'admin' })

const supabase = useSupabaseClient()

const { data, pending, error } = await useFetch('/api/admin/stats')

const search = ref('')

const filteredWorkspaces = computed(() => {
  if (!data.value?.workspaces) return []
  const q = search.value.toLowerCase().trim()
  if (!q) return data.value.workspaces
  return data.value.workspaces.filter((ws: any) =>
    ws.name.toLowerCase().includes(q) || ws.slug.toLowerCase().includes(q)
  )
})

const formatMrr = (mrr: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mrr)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}

const planBadgeClass: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  growth: 'bg-purple-100 text-purple-700',
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-900 tracking-tight">Koryla Admin</span>
        <div class="flex items-center gap-4">
          <button class="text-sm text-gray-500 hover:text-gray-800 transition-colors" @click="signOut">Sign out</button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- Loading -->
      <div v-if="pending" class="text-sm text-gray-400 py-12 text-center">Loading...</div>

      <!-- Error -->
      <div v-else-if="error" class="text-sm text-red-500 py-12 text-center">
        Failed to load stats: {{ error.message }}
      </div>

      <template v-else-if="data">
        <!-- Stats row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Workspaces</p>
            <p class="text-2xl font-semibold text-gray-900">{{ data.total_workspaces }}</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">MRR</p>
            <p class="text-2xl font-semibold text-gray-900">{{ formatMrr(data.mrr) }}</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Experiments</p>
            <p class="text-2xl font-semibold text-gray-900">{{ data.total_experiments }}</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-2">By plan</p>
            <div class="flex flex-wrap gap-1.5">
              <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                Free <span class="font-semibold">{{ data.plan_counts.free }}</span>
              </span>
              <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                Starter <span class="font-semibold">{{ data.plan_counts.starter }}</span>
              </span>
              <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                Growth <span class="font-semibold">{{ data.plan_counts.growth }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Workspace table -->
        <div class="bg-white rounded-xl border border-gray-200">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <h2 class="text-sm font-semibold text-gray-900">All Workspaces</h2>
            <input
              v-model="search"
              type="search"
              placeholder="Filter by name or slug..."
              class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-56 outline-none focus:border-gray-400 transition-colors placeholder-gray-400"
            />
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th class="text-left px-5 py-3 font-medium">Name</th>
                  <th class="text-left px-5 py-3 font-medium">Plan</th>
                  <th class="text-left px-5 py-3 font-medium">Billing</th>
                  <th class="text-left px-5 py-3 font-medium">Members</th>
                  <th class="text-left px-5 py-3 font-medium">Created</th>
                  <th class="text-left px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ws in filteredWorkspaces"
                  :key="ws.id"
                  class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                >
                  <td class="px-5 py-3">
                    <p class="font-medium text-gray-900">{{ ws.name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ ws.slug }}</p>
                  </td>

                  <td class="px-5 py-3">
                    <span
                      class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                      :class="planBadgeClass[ws.plan] ?? 'bg-gray-100 text-gray-600'"
                    >
                      {{ ws.plan }}
                    </span>
                  </td>

                  <td class="px-5 py-3 text-gray-500 capitalize">
                    {{ ws.billing_period ?? '—' }}
                  </td>

                  <td class="px-5 py-3 text-gray-700">
                    {{ ws.member_count }}
                  </td>

                  <td class="px-5 py-3 text-gray-500">
                    {{ formatDate(ws.created_at) }}
                  </td>

                  <td class="px-5 py-3">
                    <NuxtLink
                      :to="`/dashboard/${ws.slug}`"
                      class="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View
                    </NuxtLink>
                  </td>
                </tr>

                <tr v-if="filteredWorkspaces.length === 0">
                  <td colspan="6" class="px-5 py-8 text-center text-sm text-gray-400">
                    No workspaces found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
