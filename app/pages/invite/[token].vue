<script setup lang="ts">
definePageMeta({ layout: 'default' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const router = useRouter()

const invite = ref<any>(null)
const error = ref('')
const loading = ref(false)
const joining = ref(false)

onMounted(async () => {
  loading.value = true
  const { data, error: err } = await supabase
    .from('workspace_invites')
    .select('id, email, role, expires_at, accepted_at, workspace:workspaces(id, name, slug)')
    .eq('token', route.params.token)
    .maybeSingle()

  loading.value = false

  if (!data) { error.value = 'Invite not found or expired.'; return }
  if (data.accepted_at) { error.value = 'This invite has already been used.'; return }
  if (new Date(data.expires_at) < new Date()) { error.value = 'This invite has expired.'; return }

  invite.value = data
})

const accept = async () => {
  if (!user.value) {
    const config = useRuntimeConfig()
    const supabaseUrl = (config.public as any).supabase?.url
    const redirectTo = encodeURIComponent(`${window.location.origin}/invite/${route.params.token}`)
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`
    return
  }

  joining.value = true
  try {
    await $fetch(`/api/workspaces/${(invite.value.workspace as any).slug}/invites/accept`, {
      method: 'POST',
      body: { token: route.params.token },
    })
    router.push(`/dashboard/${(invite.value.workspace as any).slug}`)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to join workspace'
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
      <div v-if="loading" class="text-sm text-gray-500">Loading invite…</div>

      <div v-else-if="error" class="space-y-3">
        <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
          <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p class="text-sm text-gray-600">{{ error }}</p>
        <NuxtLink to="/login" class="text-sm text-blue-600 hover:underline">Go to login</NuxtLink>
      </div>

      <div v-else-if="invite" class="space-y-5">
        <div class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto">
          <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-semibold text-gray-900">You're invited</h1>
          <p class="text-sm text-gray-500 mt-1">
            Join <span class="font-medium text-gray-700">{{ (invite.workspace as any).name }}</span> on Splitr as <span class="font-medium capitalize">{{ invite.role }}</span>.
          </p>
        </div>
        <button
          :disabled="joining"
          class="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          @click="accept"
        >
          {{ joining ? 'Joining…' : user ? 'Accept invite' : 'Sign in to accept' }}
        </button>
      </div>
    </div>
  </div>
</template>
