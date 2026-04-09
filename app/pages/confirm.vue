<script setup lang="ts">
definePageMeta({ layout: 'default', ssr: false })

const supabase = useSupabaseClient()
const route = useRoute()
const error = ref('')

onMounted(async () => {
  const errorParam = route.query.error as string | undefined
  if (errorParam) {
    error.value = route.query.error_description as string || errorParam
    return
  }

  const token_hash = route.query.token_hash as string | undefined
  const type = (route.query.type as string | undefined) ?? 'signup'
  const code = route.query.code as string | undefined

  if (token_hash) {
    const { error: err } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (err) { error.value = err.message; return }
  } else if (code) {
    const { error: err } = await supabase.auth.exchangeCodeForSession(code)
    if (err) { error.value = err.message; return }
  }
  // Google OAuth already sets the session before redirecting here — just check it
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    error.value = 'No se pudo establecer la sesión. Intenta de nuevo.'
    return
  }

  await navigateTo('/dashboard', { replace: true })
})
</script>

<template>
  <div class="text-center">
    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    <p v-else class="text-gray-500 text-sm">Verificando tu cuenta…</p>
  </div>
</template>
