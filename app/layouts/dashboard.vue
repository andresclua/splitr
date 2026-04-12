<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()
const route = useRoute()
const { workspaces, currentWorkspace, fetchWorkspaces } = useWorkspace()

await fetchWorkspaces()

// Demo workspace visibility (stored in localStorage)
const showDemo = ref(true)
onMounted(() => {
  const stored = localStorage.getItem('koryla-show-demo')
  if (stored !== null) showDemo.value = stored !== 'false'
})

const visibleWorkspaces = computed(() =>
  workspaces.value.filter(w => !w.is_demo || showDemo.value)
)

const signOut = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

// New workspace modal
const showNewWs = ref(false)
const newWsName = ref('')
const newWsLoading = ref(false)
const newWsError = ref('')

const WORKSPACE_LIMITS: Record<string, number> = { free: 1, starter: 1, growth: 3 }

const ownedWorkspaces = computed(() =>
  workspaces.value.filter(w => !w.is_demo && w.role === 'owner')
)
const highestPlan = computed(() => {
  const order = ['free', 'starter', 'growth']
  return ownedWorkspaces.value.reduce((best, w) =>
    order.indexOf(w.plan) > order.indexOf(best) ? w.plan : best, 'free')
})
const wsLimit = computed(() => WORKSPACE_LIMITS[highestPlan.value] ?? 1)
const atLimit = computed(() => ownedWorkspaces.value.length >= wsLimit.value)

const createWorkspace = async () => {
  if (!newWsName.value.trim()) return
  newWsLoading.value = true
  newWsError.value = ''
  try {
    const user = useSupabaseUser()
    const { data: { session } } = await supabase.auth.getSession()
    const { slug } = await $fetch<{ slug: string }>('/api/workspaces', {
      method: 'POST',
      body: { userId: user.value!.id, workspaceName: newWsName.value.trim(), email: session?.user?.email ?? '' },
    })
    showNewWs.value = false
    newWsName.value = ''
    window.location.href = `/dashboard/${slug}`
  } catch (e: any) {
    newWsError.value = e?.data?.message ?? 'Failed to create workspace'
  } finally {
    newWsLoading.value = false
  }
}

const switchWorkspace = (e: Event) => {
  const slug = (e.target as HTMLSelectElement).value
  router.push(`/dashboard/${slug}`)
}

const navLinks = computed(() => [
  {
    to: `/dashboard/${currentWorkspace.value?.slug}`,
    label: 'Experiments',
    active: route.path === `/dashboard/${currentWorkspace.value?.slug}`,
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    to: `/dashboard/${currentWorkspace.value?.slug}/integrations`,
    label: 'Integrations',
    active: route.path.includes('/integrations'),
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  },
  {
    to: `/dashboard/${currentWorkspace.value?.slug}/billing`,
    label: 'Billing',
    active: route.path.includes('/billing'),
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    to: `/dashboard/${currentWorkspace.value?.slug}/settings`,
    label: 'Settings',
    active: route.path.includes('/settings'),
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
])
</script>

<template>
  <div class="flex h-screen bg-gray-50 text-gray-900">

    <!-- Sidebar -->
    <aside class="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0 shadow-[1px_0_0_0_#f3f4f6]">

      <!-- Logo -->
      <div class="px-5 h-14 flex items-center gap-2.5 border-b border-gray-100 shrink-0">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background: #C96A3F;">
          <span class="text-white font-bold text-xs">K</span>
        </div>
        <span class="font-semibold text-[15px]" style="color: #0F2235;">Koryla</span>
      </div>

      <!-- Workspace -->
      <div class="px-4 py-3 border-b border-gray-100 shrink-0">
        <select
          v-if="visibleWorkspaces.length > 1"
          class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C96A3F]"
          :value="currentWorkspace?.slug"
          @change="switchWorkspace"
        >
          <option v-for="ws in visibleWorkspaces" :key="ws.id" :value="ws.slug">
            {{ ws.name }}{{ ws.is_demo ? ' (Demo)' : '' }}
          </option>
        </select>
        <div v-else class="flex items-center gap-2.5 px-1">
          <div class="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style="background: linear-gradient(135deg, #C96A3F, #0F2235);">
            {{ currentWorkspace?.name?.[0]?.toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="text-sm font-medium text-gray-800 truncate leading-tight">{{ currentWorkspace?.name }}</p>
              <span v-if="currentWorkspace?.is_demo" class="text-[9px] font-bold uppercase tracking-wide text-[#C96A3F] bg-[#FEF0E8] px-1.5 py-0.5 rounded shrink-0">Demo</span>
            </div>
            <p class="text-[10px] text-gray-400 capitalize leading-tight">{{ currentWorkspace?.is_demo ? 'Read-only' : currentWorkspace?.plan + ' plan' }}</p>
          </div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          :class="[
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            link.active
              ? 'bg-[#FEF0E8] text-[#C96A3F] font-medium'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
          ]"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" :d="link.icon" />
          </svg>
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- New workspace + sign out -->
      <div class="px-3 py-3 border-t border-gray-100 shrink-0 space-y-1">
        <div class="relative group">
          <button
            :disabled="atLimit"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :class="atLimit ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'"
            @click="!atLimit && (showNewWs = true)"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New workspace
          </button>
          <div v-if="atLimit" class="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 group-hover:block z-50">
            <div class="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 w-52 text-center leading-snug shadow-lg">
              <span class="capitalize">{{ highestPlan }}</span> plan allows {{ wsLimit }} workspace{{ wsLimit === 1 ? '' : 's' }}.
              <NuxtLink
                :to="`/dashboard/${currentWorkspace?.slug}/billing`"
                class="pointer-events-auto underline text-[#F4A87C] hover:text-white ml-0.5"
              >Upgrade to Growth →</NuxtLink>
            </div>
            <div class="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
          </div>
        </div>
        <button
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          @click="signOut"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>

      <!-- New workspace modal -->
      <Teleport to="body">
        <div v-if="showNewWs" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showNewWs = false">
          <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 class="text-base font-semibold text-gray-900 mb-1">New workspace</h2>
            <p class="text-sm text-gray-400 mb-4">Each workspace has its own experiments, API keys and billing.</p>
            <input
              v-model="newWsName"
              type="text"
              placeholder="My project"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] mb-4"
              @keydown.enter="createWorkspace"
              @keydown.esc="showNewWs = false"
            />
            <p v-if="newWsError" class="text-xs text-red-600 mb-3">{{ newWsError }}</p>
            <div class="flex gap-2">
              <button
                class="flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                @click="showNewWs = false; newWsError = ''"
              >Cancel</button>
              <button
                :disabled="!newWsName.trim() || newWsLoading"
                class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
                style="background: #C96A3F"
                @click="createWorkspace"
              >{{ newWsLoading ? 'Creating…' : 'Create' }}</button>
            </div>
          </div>
        </div>
      </Teleport>
    </aside>

    <!-- Main -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
