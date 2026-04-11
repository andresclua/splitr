<script setup lang="ts">
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  ],
  templateParams: { siteName: 'Koryla' },
})

useSeoMeta({
  ogSiteName: 'Koryla',
  ogImage: 'https://koryla.com/og-default.png',
  twitterCard: 'summary_large_image',
  twitterSite: '@korylaapp',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppToast />
  <AppConfirm />
</template>
