<script setup lang="ts">
definePageMeta({ layout: 'default' })

const supabase = useSupabaseClient()
const router = useRouter()

const email = ref('')
const password = ref('')
const workspaceName = ref('')
const domainWorkspace = ref<{ id: string; name: string; slug: string } | null>(null)
const joinExisting = ref(false)
const error = ref('')
const loading = ref(false)
const domainChecked = ref(false)

const checkDomain = async () => {
  if (!email.value || domainChecked.value) return
  domainChecked.value = true
  const data = await $fetch<{ domain: string | null; workspace: { id: string; name: string; slug: string } | null }>(
    '/api/auth/domain-check',
    { method: 'POST', body: { email: email.value } }
  )
  if (data.workspace) {
    domainWorkspace.value = data.workspace
    workspaceName.value = data.workspace.name
    joinExisting.value = true
  }
}

const resetDomainCheck = () => {
  domainChecked.value = false
  domainWorkspace.value = null
  joinExisting.value = false
  workspaceName.value = ''
}

const signup = async () => {
  if (!workspaceName.value.trim()) {
    error.value = 'Workspace name is required'
    return
  }
  error.value = ''
  loading.value = true

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  })

  if (authErr || !authData.user) {
    error.value = authErr?.message ?? 'Signup failed'
    loading.value = false
    return
  }

  try {
    await $fetch('/api/workspaces', {
      method: 'POST',
      body: {
        userId: authData.user.id,
        workspaceName: workspaceName.value.trim(),
        email: email.value,
        joinWorkspaceId: joinExisting.value ? domainWorkspace.value?.id : null,
      },
    })
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to create workspace'
    loading.value = false
    return
  }

  loading.value = false
  router.push('/verify-email')
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h1 class="text-xl font-semibold text-gray-900 mb-6">Create your account</h1>

      <form class="space-y-4" @submit.prevent="signup">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Work email</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @blur="checkDomain"
            @input="resetDomainCheck"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            minlength="8"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ joinExisting ? 'Joining workspace' : 'Workspace name' }}
          </label>

          <div v-if="joinExisting" class="flex items-center gap-2">
            <div class="flex-1 border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700 font-medium">
              {{ workspaceName }}
            </div>
            <button
              type="button"
              class="text-xs text-gray-400 hover:text-gray-600"
              @click="joinExisting = false; workspaceName = ''"
            >
              Create new
            </button>
          </div>

          <input
            v-else
            v-model="workspaceName"
            type="text"
            required
            placeholder="Acme Inc"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <p v-if="joinExisting" class="text-xs text-blue-600 mt-1">
            Your email domain matches this workspace — you'll join as a member.
          </p>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="text-center text-sm text-gray-500 mt-4">
        Already have an account?
        <NuxtLink to="/login" class="text-blue-600 hover:underline">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
