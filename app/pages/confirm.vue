<script setup lang="ts">
definePageMeta({ layout: 'default', ssr: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const error = ref('')

onMounted(async () => {
  // Already logged in — go straight to dashboard
  if (user.value) {
    window.location.replace('/dashboard')
    return
  }

  const errorParam = route.query.error as string | undefined
  if (errorParam) {
    error.value = route.query.error_description as string || errorParam
    return
  }

  const token_hash = route.query.token_hash as string | undefined
  const type = (route.query.type as string | undefined) ?? 'signup'
  if (token_hash) {
    const { error: err } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (err) { error.value = err.message; return }
    window.location.replace('/dashboard')
    return
  }

  const code = route.query.code as string | undefined
  if (code) {
    const { data, error: err } = await supabase.auth.exchangeCodeForSession(code)
    if (err) { error.value = err.message; return }
    // Hard navigation so auth middleware sees the session from cookie on reload
    window.location.replace('/dashboard')
    return
  }

  // Implicit flow: tokens in URL hash
  const hash = window.location.hash.substring(1)
  const hashParams = new URLSearchParams(hash)
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (accessToken && refreshToken) {
    const { error: err } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (err) { error.value = err.message; return }
    window.location.replace('/dashboard')
    return
  }

  error.value = 'No se pudo establecer la sesión. Intenta de nuevo.'
})
</script>

<template>
  <div class="text-center">
    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    <p v-else class="text-gray-500 text-sm">Verificando tu cuenta…</p>
  </div>
</template>
