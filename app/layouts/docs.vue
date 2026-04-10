<script setup lang="ts">
import type { TocItem } from '~/composables/useToc'

const { data: allPages } = await useAsyncData('docs-nav-layout', () =>
  queryCollection('docs').order('order', 'ASC').all()
)

const toc = useToc()

const route = useRoute()
const mobileMenuOpen = ref(false)

const grouped = computed(() => {
  const map: Record<string, any[]> = {}
  for (const p of allPages.value ?? []) {
    const section = p.section ?? 'General'
    if (!map[section]) map[section] = []
    map[section].push(p)
  }
  return map
})

const currentIndex = computed(() =>
  (allPages.value ?? []).findIndex(p => p.slug === route.params.slug)
)
const prevPage = computed(() => allPages.value?.[currentIndex.value - 1] ?? null)
const nextPage = computed(() => allPages.value?.[currentIndex.value + 1] ?? null)

watch(() => route.path, () => { mobileMenuOpen.value = false })
</script>

<template>
  <div class="docs-layout">
    <!-- Header -->
    <header class="docs-header">
      <div class="docs-header-inner">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 shrink-0">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: #C96A3F;">
            <span class="text-white font-bold text-xs">K</span>
          </div>
          <span class="font-semibold" style="color: #0F2235;">Koryla</span>
          <span class="text-gray-300 mx-1">/</span>
          <span class="text-sm text-gray-500">Docs</span>
        </NuxtLink>

        <!-- Nav links -->
        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink to="/docs" class="text-sm text-gray-600 hover:text-gray-900 transition-colors">Documentation</NuxtLink>
          <NuxtLink to="/blog" class="text-sm text-gray-600 hover:text-gray-900 transition-colors">Blog</NuxtLink>
          <a href="/#waitlist" class="text-sm font-semibold px-3.5 py-1.5 rounded-lg text-white transition-colors" style="background: #C96A3F;">Get started</a>
        </nav>

        <!-- Mobile menu button -->
        <button class="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" @click="mobileMenuOpen = !mobileMenuOpen">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <div class="docs-body">
      <!-- Sidebar -->
      <aside class="docs-sidebar" :class="{ 'mobile-open': mobileMenuOpen }">
        <div class="docs-sidebar-inner">
          <div v-for="(pages, section) in grouped" :key="section" class="sidebar-section">
            <p class="sidebar-section-title">{{ section }}</p>
            <ul class="sidebar-list">
              <li v-for="p in pages" :key="p.slug">
                <NuxtLink
                  :to="`/docs/${p.slug}`"
                  class="sidebar-link"
                  :class="{ 'sidebar-link-active': p.slug === route.params.slug }"
                >
                  {{ p.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <main class="docs-content">
        <slot />

        <!-- Prev / Next -->
        <nav v-if="prevPage || nextPage" class="docs-pagination">
          <NuxtLink v-if="prevPage" :to="`/docs/${prevPage.slug}`" class="pagination-card pagination-prev">
            <span class="pagination-label">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Previous
            </span>
            <span class="pagination-title">{{ prevPage.title }}</span>
          </NuxtLink>
          <div v-else />
          <NuxtLink v-if="nextPage" :to="`/docs/${nextPage.slug}`" class="pagination-card pagination-next">
            <span class="pagination-label">
              Next
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
            <span class="pagination-title">{{ nextPage.title }}</span>
          </NuxtLink>
          <div v-else />
        </nav>
      </main>

      <!-- Right TOC -->
      <aside class="docs-toc">
        <div v-if="toc.length">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">On this page</p>
          <ul class="space-y-0.5">
            <li v-for="h in toc" :key="h.id" :class="{ 'pl-3': h.depth === 3 }">
              <a
                :href="`#${h.id}`"
                class="block text-sm py-1 text-gray-500 hover:text-gray-900 transition-colors"
              >
                {{ h.text }}
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout shell ── */
.docs-layout {
  min-height: 100vh;
  background: #fff;
}

/* ── Header ── */
.docs-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4rem;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e5e7eb;
  z-index: 10;
}
.docs-header-inner {
  max-width: 90rem;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* ── Body (sidebar + content + toc) ── */
.docs-body {
  display: flex;
  padding-top: 4rem;
  max-width: 90rem;
  margin: 0 auto;
  min-height: calc(100vh - 4rem);
}

/* ── Left Sidebar ── */
.docs-sidebar {
  width: 17rem;
  shrink: 0;
  border-right: 1px solid #e5e7eb;
  background: #f8fafc;
  position: fixed;
  top: 4rem;
  bottom: 0;
  overflow-y: auto;
  display: none;
  scrollbar-width: none;
}
.docs-sidebar::-webkit-scrollbar { display: none; }
@media (min-width: 50em) {
  .docs-sidebar { display: block; }
}
.docs-sidebar.mobile-open {
  display: block;
  z-index: 9;
  width: 100%;
}
.docs-sidebar-inner {
  padding: 1.5rem 1rem;
}
.sidebar-section {
  margin-bottom: 1.5rem;
}
.sidebar-section-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
  padding: 0 0.5rem;
  margin-bottom: 0.375rem;
}
.sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sidebar-link {
  display: block;
  font-size: 0.875rem;
  color: #374151;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.sidebar-link:hover {
  background: #e5e7eb;
  color: #111827;
}
.sidebar-link-active {
  background: #FEF0E8;
  color: #C96A3F;
  font-weight: 600;
}
.sidebar-link-active:hover {
  background: #FEF0E8;
  color: #C96A3F;
}

/* ── Main content ── */
.docs-content {
  flex: 1;
  min-width: 0;
  padding: 2.5rem 2rem 4rem;
  margin-left: 0;
}
@media (min-width: 50em) {
  .docs-content { margin-left: 17rem; }
}
@media (min-width: 72em) {
  .docs-content {
    margin-right: 16rem;
    padding: 2.5rem 3rem 4rem;
  }
}

/* ── Right TOC ── */
.docs-toc {
  display: none;
  width: 16rem;
  position: fixed;
  top: 4rem;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  padding: 2rem 1.25rem;
  border-left: 1px solid #e5e7eb;
  scrollbar-width: none;
}
.docs-toc::-webkit-scrollbar { display: none; }
@media (min-width: 72em) {
  .docs-toc { display: block; }
}

/* ── Pagination ── */
.docs-pagination {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}
.pagination-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.pagination-card:hover {
  border-color: #F0C9B0;
  box-shadow: 0 1px 6px rgba(201,106,63,0.1);
}
.pagination-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}
.pagination-next .pagination-label { justify-content: flex-end; }
.pagination-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}
.pagination-next .pagination-title { text-align: right; }
</style>
