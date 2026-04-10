<script setup lang="ts">
definePageMeta({ layout: 'default', ssr: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const error = ref('')

watch(user, (u) => {
  console.log('[confirm] user watcher:', u?.email ?? 'null')
  if (u) navigateTo('/dashboard', { replace: true })
}, { immediate: true })

onMounted(async () => {
  console.log('[confirm] mounted, URL:', window.location.href)
  console.log('[confirm] query:', JSON.stringify(route.query))
  console.log('[confirm] hash:', window.location.hash)

  const errorParam = route.query.error as string | undefined
  if (errorParam) {
    error.value = route.query.error_description as string || errorParam
    console.log('[confirm] error param:', error.value)
    return
  }

  const token_hash = route.query.token_hash as string | undefined
  const type = (route.query.type as string | undefined) ?? 'signup'
  if (token_hash) {
    console.log('[confirm] verifying OTP token_hash...')
    const { error: err } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (err) { error.value = err.message; console.log('[confirm] OTP error:', err.message); return }
    await navigateTo('/dashboard', { replace: true })
    return
  }

  const code = route.query.code as string | undefined
  if (code) {
    console.log('[confirm] exchanging code...')
    const { data, error: err } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[confirm] exchange result:', data?.session?.user?.email, err?.message)
    if (err) { error.value = err.message; return }
    await navigateTo('/dashboard', { replace: true })
    return
  }

  // Implicit flow: tokens are in the URL hash (Google OAuth)
  const hash = window.location.hash.substring(1)
  const hashParams = new URLSearchParams(hash)
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (accessToken && refreshToken) {
    console.log('[confirm] found hash tokens, calling setSession...')
    const { error: err } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    console.log('[confirm] setSession error:', err?.message ?? 'none')
    if (err) { error.value = err.message; return }
    await navigateTo('/dashboard', { replace: true })
    return
  }

  console.log('[confirm] no params found at all')
  error.value = 'No se pudo establecer la sesión. Intenta de nuevo.'
})
</script>

<template>
  <div class="text-center">
    <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    <p v-else class="text-gray-500 text-sm">Verificando tu cuenta…</p>
  </div>
</template>
