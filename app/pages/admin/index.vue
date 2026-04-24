<script setup lang="ts">
definePageMeta({ layout: false, ssr: false, middleware: 'admin' })

const supabase = useSupabaseClient()
const { data, pending, error, refresh } = await useFetch('/api/admin/stats')

const search = ref('')
const sortBy = ref<'created_at' | 'impressions_30d' | 'experiment_count' | 'last_active'>('impressions_30d')

const filteredWorkspaces = computed(() => {
  if (!data.value?.workspaces) return []
  const q = search.value.toLowerCase().trim()
  let list = data.value.workspaces.filter((ws: any) =>
    !q || ws.name.toLowerCase().includes(q) || ws.slug.toLowerCase().includes(q)
  )
  list = [...list].sort((a: any, b: any) => {
    if (sortBy.value === 'impressions_30d') return (b.impressions_30d ?? 0) - (a.impressions_30d ?? 0)
    if (sortBy.value === 'experiment_count') return (b.experiment_count ?? 0) - (a.experiment_count ?? 0)
    if (sortBy.value === 'last_active') return (b.last_active ?? '').localeCompare(a.last_active ?? '')
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  return list
})

const formatMrr = (mrr: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mrr)

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const formatRelative = (date: string | null) => {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}

// ── Skill editor ──────────────────────────────────────────
const skillContent = ref('')
const skillSaving = ref(false)
const skillRegenerating = ref(false)
const skillMsg = ref('')

async function loadSkill() {
  try {
    const { content } = await $fetch<{ content: string }>('/api/admin/skill')
    skillContent.value = content
  } catch (e) {
    console.error('loadSkill error:', e)
    skillContent.value = ''
  }
}

async function saveSkill() {
  skillSaving.value = true; skillMsg.value = ''
  try {
    await $fetch('/api/admin/skill', { method: 'PUT', body: { content: skillContent.value } })
    skillMsg.value = 'Saved!'
  } catch { skillMsg.value = 'Error saving' }
  finally { skillSaving.value = false; setTimeout(() => skillMsg.value = '', 2500) }
}

async function regenerateSkill() {
  skillRegenerating.value = true; skillMsg.value = ''
  try {
    const { content } = await $fetch<{ content: string }>('/api/admin/skill/regenerate', { method: 'POST' })
    skillContent.value = content
    skillMsg.value = 'Regenerated!'
  } catch (e) {
    console.error('regenerateSkill error:', e)
    skillMsg.value = 'Error regenerating'
  } finally { skillRegenerating.value = false; setTimeout(() => skillMsg.value = '', 2500) }
}

const skillOpen = ref(false)
onMounted(() => loadSkill())

// ── Users ─────────────────────────────────────────────────
const activeTab = ref<'workspaces' | 'users'>('workspaces')
const { data: usersData } = await useFetch('/api/admin/users')

const userSearch = ref('')
const filteredUsers = computed(() => {
  if (!usersData.value) return []
  const q = userSearch.value.toLowerCase().trim()
  if (!q) return usersData.value
  return usersData.value.filter((u: any) => u.email?.toLowerCase().includes(q))
})

const planBadge: Record<string, string> = {
  free:    'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  growth:  'bg-purple-100 text-purple-700',
}

const limitBar = (used: number, limit: number | null) => {
  if (!limit) return null
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const color = pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
  return { pct, color }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded bg-[#0F2235] flex items-center justify-center">
            <span class="text-white text-[10px] font-bold">K</span>
          </div>
          <span class="text-sm font-semibold text-gray-900">Admin</span>
          <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">internal</span>
        </div>
        <div class="flex items-center gap-3">
          <button class="text-xs text-gray-400 hover:text-gray-600 transition-colors" @click="refresh()">↻ Refresh</button>
          <button class="text-sm text-gray-500 hover:text-gray-800 transition-colors" @click="signOut">Sign out</button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8 space-y-6">

      <!-- Loading -->
      <div v-if="pending" class="text-sm text-gray-400 py-16 text-center">Loading...</div>
      <div v-else-if="error" class="text-sm text-red-500 py-16 text-center">{{ error.message }}</div>

      <template v-else-if="data">

        <!-- ── Top stats ───────────────────────────────────── -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div class="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Workspaces</p>
            <p class="text-2xl font-bold text-gray-900">{{ data.total_workspaces }}</p>
            <div class="flex gap-1.5 mt-2 flex-wrap">
              <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Free {{ data.plan_counts.free }}</span>
              <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Starter {{ data.plan_counts.starter }}</span>
              <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Growth {{ data.plan_counts.growth }}</span>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">MRR</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatMrr(data.mrr) }}</p>
            <p class="text-xs text-gray-400 mt-2">{{ data.total_experiments }} experiments total</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Impressions</p>
            <p class="text-2xl font-bold text-gray-900">{{ data.total_impressions_30d.toLocaleString() }}</p>
            <p class="text-xs text-gray-400 mt-2">{{ data.impressions_this_month.toLocaleString() }} this month</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Claude Skill</p>
            <p class="text-2xl font-bold text-gray-900">{{ data.skill_downloads }}</p>
            <p class="text-xs text-gray-400 mt-2">total downloads</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Conversions</p>
            <p class="text-2xl font-bold text-gray-900">{{ data.total_conversions_30d.toLocaleString() }}</p>
            <p class="text-xs text-gray-400 mt-2">
              {{
                data.total_impressions_30d
                  ? ((data.total_conversions_30d / data.total_impressions_30d) * 100).toFixed(1) + '% conv. rate'
                  : '—'
              }}
            </p>
          </div>
        </div>

        <!-- ── Skill editor ──────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer select-none" @click="skillOpen = !skillOpen">
            <h2 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Claude Skill — koryla.md
              <span class="text-gray-400 text-xs transition-transform" :class="skillOpen ? 'rotate-180' : ''">▼</span>
            </h2>
            <div class="flex items-center gap-2" @click.stop>
              <span v-if="skillMsg" class="text-xs text-green-600 font-medium">{{ skillMsg }}</span>
              <a href="/api/public/skill/download" download="koryla.md"
                class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                ↓ Download
              </a>
<button :disabled="skillSaving"
                class="text-xs px-3 py-1.5 rounded-lg bg-[#0F2235] text-white hover:bg-[#1a3a5c] disabled:opacity-40 transition-colors"
                @click="saveSkill">
                {{ skillSaving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
          <textarea
            v-if="skillOpen"
            v-model="skillContent"
            class="w-full h-[600px] px-5 py-4 text-xs font-mono text-gray-800 bg-gray-50 resize-none focus:outline-none focus:bg-white transition-colors border-t border-gray-100"
            spellcheck="false"
          />
        </div>

        <!-- ── Tabs ───────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">

            <!-- Tab switcher -->
            <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 text-[11px]">
              <button
                :class="['px-2.5 py-1 rounded-md font-medium transition-all', activeTab === 'workspaces' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                @click="activeTab = 'workspaces'"
              >Workspaces</button>
              <button
                :class="['px-2.5 py-1 rounded-md font-medium transition-all', activeTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                @click="activeTab = 'users'"
              >Users</button>
            </div>

            <!-- Workspace sort -->
            <template v-if="activeTab === 'workspaces'">
              <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 text-[11px]">
                <button v-for="s in [
                  { value: 'impressions_30d', label: 'Most active' },
                  { value: 'created_at',      label: 'Newest' },
                  { value: 'experiment_count', label: 'Experiments' },
                ]" :key="s.value"
                  :class="['px-2.5 py-1 rounded-md font-medium transition-all', sortBy === s.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  @click="sortBy = s.value as any"
                >{{ s.label }}</button>
              </div>
              <input
                v-model="search" type="search" placeholder="Search workspace..."
                class="ml-auto text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-52 outline-none focus:border-gray-400 transition-colors placeholder-gray-300"
              />
            </template>

            <!-- User search -->
            <template v-if="activeTab === 'users'">
              <input
                v-model="userSearch" type="search" placeholder="Search email..."
                class="ml-auto text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-52 outline-none focus:border-gray-400 transition-colors placeholder-gray-300"
              />
            </template>
          </div>

          <!-- ── Workspaces tab ─────────────────────────── -->
          <div v-if="activeTab === 'workspaces'" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                  <th class="text-left px-5 py-3 font-medium">Workspace</th>
                  <th class="text-left px-5 py-3 font-medium">Plan</th>
                  <th class="text-left px-5 py-3 font-medium">Experiments</th>
                  <th class="text-left px-5 py-3 font-medium">Impressions 30d</th>
                  <th class="text-left px-5 py-3 font-medium">Conv. rate 30d</th>
                  <th class="text-left px-5 py-3 font-medium">Last active</th>
                  <th class="text-left px-5 py-3 font-medium">Created</th>
                  <th class="text-left px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ws in filteredWorkspaces" :key="ws.id"
                  class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <!-- Workspace -->
                  <td class="px-5 py-3.5">
                    <p class="font-medium text-gray-900">{{ ws.name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5 font-mono">{{ ws.slug }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ ws.member_count }} member{{ ws.member_count !== 1 ? 's' : '' }}</p>
                  </td>

                  <!-- Plan -->
                  <td class="px-5 py-3.5">
                    <span
                      class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                      :class="planBadge[ws.plan] ?? 'bg-gray-100 text-gray-600'"
                    >{{ ws.plan }}</span>
                    <p v-if="ws.billing_period" class="text-[11px] text-gray-400 mt-1 capitalize">{{ ws.billing_period }}</p>
                  </td>

                  <!-- Experiments + limit bar -->
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-gray-900">{{ ws.experiment_count }}</span>
                      <span v-if="ws.experiment_limit" class="text-xs text-gray-400">/ {{ ws.experiment_limit }}</span>
                      <span v-if="ws.active_experiments" class="text-[11px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">
                        {{ ws.active_experiments }} live
                      </span>
                    </div>
                    <div v-if="ws.experiment_limit" class="mt-1.5 w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        :class="['h-full rounded-full', limitBar(ws.experiment_count, ws.experiment_limit)?.color]"
                        :style="{ width: (limitBar(ws.experiment_count, ws.experiment_limit)?.pct ?? 0) + '%' }"
                      />
                    </div>
                  </td>

                  <!-- Impressions 30d -->
                  <td class="px-5 py-3.5">
                    <p :class="['font-semibold tabular-nums', ws.impressions_30d > 0 ? 'text-gray-900' : 'text-gray-300']">
                      {{ ws.impressions_30d.toLocaleString() }}
                    </p>
                    <p v-if="ws.impressions_30d === 0" class="text-[11px] text-gray-300 mt-0.5">no activity</p>
                  </td>

                  <!-- Conv. rate -->
                  <td class="px-5 py-3.5">
                    <p v-if="ws.conv_rate_30d !== null"
                      :class="['font-semibold tabular-nums', ws.conv_rate_30d > 0 ? 'text-green-600' : 'text-gray-400']">
                      {{ ws.conv_rate_30d }}%
                    </p>
                    <p v-else class="text-gray-300">—</p>
                    <p v-if="ws.conversions_30d > 0" class="text-[11px] text-gray-400 mt-0.5">{{ ws.conversions_30d }} conv.</p>
                  </td>

                  <!-- Última actividad API -->
                  <td class="px-5 py-3.5">
                    <p :class="['text-sm', ws.last_active ? 'text-gray-700' : 'text-gray-300']">
                      {{ formatRelative(ws.last_active) }}
                    </p>
                  </td>

                  <!-- Creado -->
                  <td class="px-5 py-3.5 text-gray-500 text-xs">
                    {{ formatDate(ws.created_at) }}
                  </td>

                  <!-- Actions -->
                  <td class="px-5 py-3.5">
                    <NuxtLink
                      :to="`/dashboard/${ws.slug}`"
                      class="text-xs font-medium text-[#C96A3F] hover:text-[#A8522D] transition-colors"
                    >View →</NuxtLink>
                  </td>
                </tr>

                <tr v-if="filteredWorkspaces.length === 0">
                  <td colspan="8" class="px-5 py-10 text-center text-sm text-gray-400">
                    No results.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ── Users tab ──────────────────────────────── -->
          <div v-if="activeTab === 'users'" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                  <th class="text-left px-5 py-3 font-medium">Email</th>
                  <th class="text-left px-5 py-3 font-medium">Provider</th>
                  <th class="text-left px-5 py-3 font-medium">Workspaces</th>
                  <th class="text-left px-5 py-3 font-medium">Last sign in</th>
                  <th class="text-left px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="u in filteredUsers" :key="u.id"
                  class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-5 py-3.5 font-medium text-gray-900">{{ u.email }}</td>
                  <td class="px-5 py-3.5">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize">{{ u.provider }}</span>
                  </td>
                  <td class="px-5 py-3.5">
                    <div v-if="u.workspaces.length" class="flex flex-wrap gap-1">
                      <span
                        v-for="ws in u.workspaces" :key="ws?.slug"
                        class="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
                      >{{ ws?.name }}</span>
                    </div>
                    <span v-else class="text-gray-300">—</span>
                  </td>
                  <td class="px-5 py-3.5 text-gray-500 text-xs">{{ formatRelative(u.last_sign_in_at) }}</td>
                  <td class="px-5 py-3.5 text-gray-500 text-xs">{{ formatDate(u.created_at) }}</td>
                </tr>
                <tr v-if="filteredUsers.length === 0">
                  <td colspan="5" class="px-5 py-10 text-center text-sm text-gray-400">No results.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>
