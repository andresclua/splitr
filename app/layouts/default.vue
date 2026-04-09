<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center px-4">
    <div class="mb-8 flex items-center gap-2">
      <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <span class="text-white font-bold text-sm">S</span>
      </div>
      <span class="text-xl font-semibold text-gray-900">Splitr</span>
    </div>
    <slot />
    <p class="mt-8 text-xs text-gray-400">© 2025 Splitr. All rights reserved.</p>
  </div>
</template>
