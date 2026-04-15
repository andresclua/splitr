<script setup lang="ts">
definePageMeta({ layout: 'default', ssr: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const error = ref('')

// If opened as a popup, navigate the parent directly then close self.
// More reliable than relying on onAuthStateChange timing in the parent.
const finishAuth = async () => {
  await navigateTo('/dashboard', { replace: true })
}

// Wait for Supabase to update the reactive user state before navigating
const waitForUser = () =>
  new Promise<void>((resolve) => {
    if (user.value) { resolve(); return }
    const unwatch = watch(user, (u) => {
      if (u) { unwatch(); resolve() }
    })
    setTimeout(() => { unwatch(); resolve() }, 3000)
  })

onMounted(async () => {
  const errorParam = route.query.error as string | undefined
  if (errorParam) {
    error.value = route.query.error_description as string || errorParam
    return
  }

  // Already logged in — go straight to dashboard
  if (user.value) {
    await finishAuth()
    return
  }

  // The Supabase client auto-detects tokens from the URL hash on init and
  // fires onAuthStateChange. Wait for that before doing anything manual.
  await waitForUser()
  if (user.value) {
    await finishAuth()
    return
  }

  // Manual fallback: email OTP (token_hash in query)
  const token_hash = route.query.token_hash as string | undefined
  const type = (route.query.type as string | undefined) ?? 'signup'
  if (token_hash) {
    const { error: err } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (err) { error.value = err.message; return }
    await waitForUser()
    await finishAuth()
    return
  }

  // Manual fallback: PKCE (code in query)
  const code = route.query.code as string | undefined
  if (code) {
    const { error: err } = await supabase.auth.exchangeCodeForSession(code)
    if (err) { error.value = err.message; return }
    await waitForUser()
    await finishAuth()
    return
  }

  // Manual fallback: implicit flow tokens still in hash
  const hash = window.location.hash.substring(1)
  const hashParams = new URLSearchParams(hash)
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (accessToken && refreshToken) {
    const { error: err } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (err) { error.value = err.message; return }
    await waitForUser()
    await finishAuth()
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
