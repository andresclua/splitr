<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({
  title: 'Blog — Koryla',
  description: 'Articles about A/B testing, experimentation and product growth.',
  ogTitle: 'Blog — Koryla',
  ogDescription: 'Articles about A/B testing, experimentation and product growth.',
  ogUrl: 'https://koryla.com/blog',
  ogType: 'website',
  twitterTitle: 'Blog — Koryla',
  twitterDescription: 'Articles about A/B testing, experimentation and product growth.',
})

const { data: posts } = await useAsyncData('blog', () =>
  queryCollection('blog').order('date', 'DESC').all()
)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Nav -->
    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #C96A3F;">
            <span class="text-white font-black text-sm">K</span>
          </div>
          <span class="font-bold text-lg" style="color: #0F2235;">Koryla</span>
        </NuxtLink>
        <div class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
          <NuxtLink to="/docs" class="hover:text-gray-900 transition-colors">Docs</NuxtLink>
          <NuxtLink to="/blog" class="hover:text-gray-900 transition-colors" style="color: #C96A3F;">Blog</NuxtLink>
          <a href="/#pricing" class="hover:text-gray-900 transition-colors">Pricing</a>
        </div>
        <a href="/#waitlist" class="px-4 py-2 rounded-lg text-sm font-semibold text-white" style="background: #C96A3F;">Register</a>
      </div>
    </nav>

    <!-- Hero -->
    <div class="texture-dots-sand border-b border-gray-100" style="background: linear-gradient(160deg, #F5EDE0 0%, #ffffff 60%);">
      <div class="max-w-3xl mx-auto px-6 py-16">
        <h1 class="text-4xl font-bold tracking-tight" style="color: #0F2235;">Blog</h1>
        <p class="text-lg text-gray-500 mt-3">Thoughts on A/B testing, experimentation and product growth.</p>
      </div>
    </div>

    <!-- Posts -->
    <div class="max-w-3xl mx-auto px-6 py-12">
      <div v-if="posts?.length" class="divide-y divide-gray-100">
        <article v-for="post in posts" :key="post.slug" class="py-8 group">
          <NuxtLink :to="`/blog/${post.slug}`" class="block">
            <div class="flex items-center gap-3 mb-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background: #FEF0E8; color: #C96A3F;">A/B Testing</span>
              <span class="text-sm text-gray-400">{{ formatDate(post.date) }}</span>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 leading-snug mb-2 transition-colors group-hover:opacity-70">
              {{ post.title }}
            </h2>
            <p class="text-gray-500 leading-relaxed">{{ post.description }}</p>
            <span class="inline-flex items-center gap-1 text-sm font-semibold mt-4 group-hover:gap-2 transition-all" style="color: #C96A3F;">
              Read more
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </NuxtLink>
        </article>
      </div>
      <p v-else class="text-gray-400 text-sm py-12 text-center">No posts yet — check back soon.</p>
    </div>

    <!-- Footer -->
    <footer class="py-10 px-6 border-t border-gray-100">
      <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-md flex items-center justify-center" style="background: #C96A3F;">
            <span class="text-white font-black text-xs">K</span>
          </div>
          <span class="font-bold text-sm" style="color: #0F2235;">Koryla</span>
        </div>
        <p class="text-sm text-gray-400">© 2026 Koryla. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>
