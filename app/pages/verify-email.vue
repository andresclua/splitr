<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <div class="w-full max-w-sm text-center">
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-gray-900 mb-2">Check your email</h1>
      <p class="text-sm text-gray-500">
        We sent a confirmation link. Click it to activate your account and access your workspace.
      </p>
      <p class="text-xs text-gray-400 mt-4">Didn't receive it? Check your spam folder.</p>
    </div>
  </div>
</template>
