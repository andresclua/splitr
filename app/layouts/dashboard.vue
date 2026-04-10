<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()
const { workspaces, currentWorkspace, fetchWorkspaces } = useWorkspace()

await fetchWorkspaces()

const signOut = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

const switchWorkspace = (e: Event) => {
  const slug = (e.target as HTMLSelectElement).value
  router.push(`/dashboard/${slug}`)
}
</script>

<template>
  <div class="flex h-screen bg-gray-50 text-gray-900">
    <!-- Sidebar -->
    <aside class="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <!-- Logo -->
      <div class="px-4 h-14 flex items-center gap-2 border-b border-gray-100">
        <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <span class="text-white font-bold text-xs">K</span>
        </div>
        <span class="font-semibold text-gray-900">Koryla</span>
      </div>

      <!-- Workspace selector -->
      <div class="px-3 py-3 border-b border-gray-100">
        <select
          v-if="workspaces.length > 1"
          class="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :value="currentWorkspace?.slug"
          @change="switchWorkspace"
        >
          <option v-for="ws in workspaces" :key="ws.id" :value="ws.slug">{{ ws.name }}</option>
        </select>
        <div v-else class="flex items-center gap-2 px-1">
          <div class="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-purple-500 shrink-0" />
          <span class="text-sm font-medium text-gray-800 truncate">{{ currentWorkspace?.name }}</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-3 space-y-0.5">
        <NuxtLink
          :to="`/dashboard/${currentWorkspace?.slug}`"
          class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          active-class="bg-blue-50 text-blue-700 font-medium hover:bg-blue-50 hover:text-blue-700"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Experiments
        </NuxtLink>

        <NuxtLink
          :to="`/dashboard/${currentWorkspace?.slug}/integrations`"
          class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          active-class="bg-blue-50 text-blue-700 font-medium hover:bg-blue-50 hover:text-blue-700"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Integrations
        </NuxtLink>

        <NuxtLink
          :to="`/dashboard/${currentWorkspace?.slug}/billing`"
          class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          active-class="bg-blue-50 text-blue-700 font-medium hover:bg-blue-50 hover:text-blue-700"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Billing
        </NuxtLink>

        <NuxtLink
          :to="`/dashboard/${currentWorkspace?.slug}/settings`"
          class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          active-class="bg-blue-50 text-blue-700 font-medium hover:bg-blue-50 hover:text-blue-700"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </NuxtLink>
      </nav>

      <!-- User -->
      <div class="px-3 py-3 border-t border-gray-100">
        <button
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          @click="signOut"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
