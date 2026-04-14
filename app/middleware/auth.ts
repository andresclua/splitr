export default defineNuxtRouteMiddleware(async (to) => {
  // Session lives in localStorage — skip on SSR, check client-side only
  if (import.meta.server) return
  if (!to.path.startsWith('/dashboard')) return

  const user = useSupabaseUser()
  if (user.value) return

  // user.value can be null briefly while Supabase hydrates from localStorage.
  // Double-check with getSession() before redirecting to avoid a login loop.
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return navigateTo('/login')
  }
})
