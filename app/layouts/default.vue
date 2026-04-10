<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4" style="background: linear-gradient(160deg, #F5EDE0 0%, #ffffff 60%);">
    <NuxtLink to="/" class="mb-8 flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #C96A3F;">
        <span class="text-white font-bold text-sm">K</span>
      </div>
      <span class="text-xl font-semibold" style="color: #0F2235;">Koryla</span>
    </NuxtLink>
    <slot />
    <p class="mt-8 text-xs text-gray-400">© 2026 Koryla. All rights reserved.</p>
  </div>
</template>
