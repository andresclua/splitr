<script setup lang="ts">
definePageMeta({ layout: 'docs' })
useSeoMeta({ title: 'Docs — Koryla', description: 'Documentation for Koryla — edge-based A/B testing.' })

const { data: pages } = await useAsyncData('docs-index', () =>
  queryCollection('docs').order('order', 'ASC').all()
)

const grouped = computed(() => {
  const map: Record<string, any[]> = {}
  for (const page of pages.value ?? []) {
    const section = page.section ?? 'General'
    if (!map[section]) map[section] = []
    map[section].push(page)
  }
  return map
})
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-900 tracking-tight mb-2">Documentation</h1>
    <p class="text-gray-500 text-lg mb-10">Everything you need to run A/B experiments with Koryla.</p>

    <div v-for="(sectionPages, section) in grouped" :key="section" class="mb-10">
      <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{{ section }}</h2>
      <div class="grid sm:grid-cols-2 gap-3">
        <NuxtLink
          v-for="page in sectionPages"
          :key="page.slug"
          :to="`/docs/${page.slug}`"
          class="block p-5 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <p class="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">{{ page.title }}</p>
          <p class="text-sm text-gray-500 leading-relaxed">{{ page.description }}</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
