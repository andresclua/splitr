<script setup lang="ts">
const error = useError()

const title = computed(() => {
  if (error.value?.statusCode === 403) return 'Access denied'
  if (error.value?.statusCode === 404) return 'Not found'
  return 'Something went wrong'
})

const message = computed(() => {
  if (error.value?.statusMessage) return error.value.statusMessage
  if (error.value?.statusCode === 403) return "You don't have access to this workspace."
  if (error.value?.statusCode === 404) return "This workspace doesn't exist or you don't have access to it."
  return 'An unexpected error occurred.'
})

const handleError = () => clearError({ redirect: '/dashboard' })
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-sm text-center">
      <!-- Logo -->
      <div class="flex items-center justify-center gap-2.5 mb-10">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: #C96A3F;">
          <span class="text-white font-bold text-sm">K</span>
        </div>
        <span class="font-semibold text-lg" style="color: #0F2235;">Koryla</span>
      </div>

      <!-- Error code -->
      <p class="text-5xl font-bold text-gray-200 mb-2 tabular-nums">{{ error?.statusCode }}</p>

      <!-- Title & message -->
      <h1 class="text-xl font-semibold text-gray-900 mb-2">{{ title }}</h1>
      <p class="text-sm text-gray-500 mb-8 leading-relaxed">{{ message }}</p>

      <!-- CTA -->
      <button
        class="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl text-white transition-colors hover:bg-[#A8522D]"
        style="background: #C96A3F;"
        @click="handleError"
      >
        Go to dashboard
      </button>
    </div>
  </div>
</template>
