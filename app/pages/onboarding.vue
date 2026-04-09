<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const user = useSupabaseUser()
const router = useRouter()

const workspaceName = ref('')
const error = ref('')
const loading = ref(false)

const create = async () => {
  if (!workspaceName.value.trim()) return
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/workspaces', {
      method: 'POST',
      body: {
        userId: user.value!.id,
        workspaceName: workspaceName.value.trim(),
        email: user.value!.email ?? '',
      },
    })
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to create workspace'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div class="mb-6">
        <div class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
          <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 class="text-xl font-semibold text-gray-900">Create your workspace</h1>
        <p class="text-sm text-gray-500 mt-1">This is where your team will run A/B experiments.</p>
      </div>

      <form class="space-y-4" @submit.prevent="create">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Workspace name</label>
          <input
            v-model="workspaceName"
            type="text"
            required
            placeholder="Acme Inc"
            class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading || !workspaceName.trim()"
          class="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {{ loading ? 'Creating…' : 'Create workspace' }}
        </button>
      </form>
    </div>
  </div>
</template>
