<script setup lang="ts">
definePageMeta({ layout: 'default', ssr: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const error = ref('')

// If user is already set (module handled the exchange), navigate immediately
watch(user, (u) => {
  if (u) navigateTo('/dashboard', { replace: true })
}, { immediate: true })

onMounted(async () => {
  const errorParam = route.query.error as string | undefined
  if (errorParam) {
    error.value = route.query.error_description as string || errorParam
    return
  }

  // Email OTP (magic link / email confirmation)
  const token_hash = route.query.token_hash as string | undefined
  const type = (route.query.type as string | undefined) ?? 'signup'
  if (token_hash) {
    const { error: err } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (err) { error.value = err.message; return }
    await navigateTo('/dashboard', { replace: true })
    return
  }

  // PKCE code exchange (if module didn't consume it yet)
  const code = route.query.code as string | undefined
  if (code) {
    const { error: err } = await supabase.auth.exchangeCodeForSession(code)
    if (err) { error.value = err.message; return }
    await navigateTo('/dashboard', { replace: true })
    return
  }

  // If no params and no user after 3s, show error
  setTimeout(async () => {
    if (!user.value) {
      error.value = 'No se pudo establecer la sesión. Intenta de nuevo.'
    }
  }, 3000)
})
</script>

<template>
  <div class="text-center">
    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    <p v-else class="text-gray-500 text-sm">Verificando tu cuenta…</p>
  </div>
</template>
