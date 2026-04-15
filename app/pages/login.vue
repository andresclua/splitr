<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ robots: 'noindex, nofollow' })

const supabase = useSupabaseClient()

const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/confirm`,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })
  if (error || !data.url) return

  const w = 500, h = 600
  const left = Math.round(screen.width / 2 - w / 2)
  const top = Math.round(screen.height / 2 - h / 2)
  window.open(data.url, 'google-auth', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes`)
  // Navigation is handled by confirm.vue via window.opener.location.href
}
</script>

<template>
  <div class="min-h-screen flex" style="font-family: 'Space Grotesk', system-ui, sans-serif;">

    <!-- Left panel — product context -->
    <div class="hidden lg:flex flex-col justify-between w-1/2 p-12" style="background: #0F2235;">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #C96A3F;">
          <span class="text-white font-black text-sm">K</span>
        </div>
        <span class="font-bold text-lg text-white">Koryla</span>
      </NuxtLink>

      <!-- Middle content -->
      <div>
        <p class="text-3xl font-bold text-white leading-snug mb-10">
          A/B tests that run<br/>
          <span style="color: #C96A3F;">before the page loads.</span>
        </p>

        <div class="space-y-4">
          <div v-for="item in [
            { icon: '⚡', text: 'Zero flicker — variants served at the edge' },
            { icon: '🧩', text: 'SDK for React, Vue, Astro and Next.js' },
            { icon: '📊', text: 'GA4, PostHog, Mixpanel and more' },
            { icon: '🔌', text: 'Works with any stack' },
          ]" :key="item.text" class="flex items-center gap-3">
            <span class="text-lg">{{ item.icon }}</span>
            <p class="text-sm text-gray-400">{{ item.text }}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-xs text-gray-600">© 2026 Koryla. All rights reserved.</p>
    </div>

    <!-- Right panel — login -->
    <div class="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
      <!-- Mobile logo -->
      <NuxtLink to="/" class="flex items-center gap-2 mb-10 lg:hidden">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: #C96A3F;">
          <span class="text-white font-black text-xs">K</span>
        </div>
        <span class="font-bold text-base" style="color: #0F2235;">Koryla</span>
      </NuxtLink>

      <div class="w-full max-w-sm">
        <div class="mb-8">
          <h1 class="text-2xl font-bold mb-1" style="color: #0F2235;">Welcome back</h1>
          <p class="text-sm text-gray-500">Sign in to your Koryla workspace</p>
        </div>

        <button
          class="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          @click="loginWithGoogle"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p class="text-center text-xs text-gray-400 mt-6">
          By signing in you agree to our
          <NuxtLink to="/terms" class="underline hover:text-gray-600">Terms</NuxtLink> and
          <NuxtLink to="/privacy" class="underline hover:text-gray-600">Privacy Policy</NuxtLink>.
        </p>
      </div>
    </div>

  </div>
</template>
