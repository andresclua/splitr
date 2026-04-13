export default defineNuxtRouteMiddleware((to) => {
  // Session lives in localStorage — skip on SSR, check client-side only
  if (import.meta.server) return
  const user = useSupabaseUser()
  if (to.path.startsWith('/dashboard') && !user.value) {
    return navigateTo('/login')
  }
})
