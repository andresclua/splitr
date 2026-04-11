<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const { data: post } = await useAsyncData(`blog-${route.params.slug}`, () =>
  queryCollection('blog').where('slug', '=', route.params.slug as string).first()
)

if (!post.value) throw createError({ statusCode: 404, message: 'Post not found' })

const postUrl = `https://koryla.com/blog/${route.params.slug}`

useSeoMeta({
  title: `${post.value.title} — Koryla`,
  description: post.value.description,
  ogTitle: post.value.title,
  ogDescription: post.value.description,
  ogUrl: postUrl,
  ogType: 'article',
  articlePublishedTime: post.value.date,
  articleAuthor: post.value.author,
  articleSection: 'A/B Testing',
  twitterTitle: post.value.title,
  twitterDescription: post.value.description,
})

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.value.title,
      description: post.value.description,
      datePublished: post.value.date,
      author: { '@type': 'Person', name: post.value.author },
      publisher: { '@type': 'Organization', name: 'Koryla', url: 'https://koryla.com' },
      url: postUrl,
    }),
  }],
})

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const readingTime = computed(() => {
  const words = post.value?.body ? JSON.stringify(post.value.body).split(/\s+/).length : 0
  return Math.max(1, Math.round(words / 200))
})
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

    <article class="max-w-3xl mx-auto px-6 py-14">
      <!-- Back -->
      <NuxtLink to="/blog" class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-10">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        All posts
      </NuxtLink>

      <!-- Meta -->
      <header class="mb-10">
        <div class="flex items-center gap-3 mb-5">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background: #FEF0E8; color: #C96A3F;">A/B Testing</span>
          <span class="text-sm text-gray-400">{{ formatDate(post!.date) }}</span>
          <span class="text-gray-300">·</span>
          <span class="text-sm text-gray-400">{{ post!.author }}</span>
          <span class="text-gray-300">·</span>
          <span class="text-sm text-gray-400">{{ readingTime }} min read</span>
        </div>
        <h1 class="text-4xl font-bold leading-tight tracking-tight mb-4" style="color: #0F2235;">{{ post!.title }}</h1>
        <p class="text-xl text-gray-500 leading-relaxed">{{ post!.description }}</p>
      </header>

      <!-- Content -->
      <div class="prose prose-gray prose-lg max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-900 prose-pre:rounded-xl
        [&_pre_code]:before:content-none [&_pre_code]:after:content-none [&_pre_code]:bg-transparent
        prose-table:text-sm prose-th:font-semibold
        prose-img:rounded-xl"
        style="--tw-prose-links: #C96A3F;"
      >
        <ContentRenderer :value="post!" />
      </div>
    </article>

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
