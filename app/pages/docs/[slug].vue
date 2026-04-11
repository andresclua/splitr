<script setup lang="ts">
definePageMeta({ layout: 'docs' })

const route = useRoute()
const { data: page } = await useAsyncData(`docs-${route.params.slug}`, () =>
  queryCollection('docs').where('slug', '=', route.params.slug as string).first()
)

if (!page.value) throw createError({ statusCode: 404, message: 'Page not found' })

useSeoMeta({ title: `${page.value.title} — Koryla Docs`, description: page.value.description })

// Extract headings and push to shared TOC state
const toc = useToc()

function extractHeadings(node: any): { id: string; text: string; depth: number }[] {
  const result: { id: string; text: string; depth: number }[] = []
  if (!node) return result
  if (node.type === 'element' && /^h[23]$/.test(node.tag ?? '')) {
    const text = node.children?.map((c: any) => c.value ?? '').join('') ?? ''
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    result.push({ id, text, depth: parseInt(node.tag.slice(1)) })
  }
  for (const child of node.children ?? []) result.push(...extractHeadings(child))
  return result
}

toc.value = extractHeadings((page.value as any)?.body ?? {})

watch(page, (p) => {
  toc.value = extractHeadings((p as any)?.body ?? {})
})
</script>

<template>
  <div>
    <!-- Breadcrumb -->
    <div class="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
      <NuxtLink to="/docs" class="hover:text-gray-600 transition-colors">Docs</NuxtLink>
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      <span class="text-gray-500">{{ page!.section ?? 'General' }}</span>
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      <span class="text-gray-700 font-medium">{{ page!.title }}</span>
    </div>

    <!-- Content -->
    <div class="prose prose-gray max-w-none
      prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-24
      prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-2
      prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-100
      prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
      prose-a:no-underline hover:prose-a:underline
      prose-code:bg-[#F0C9B0]/40 prose-code:text-[#A8522D] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
      [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:before:content-none [&_pre_code]:after:content-none
      prose-pre:bg-gray-50 prose-pre:rounded-xl prose-pre:border prose-pre:border-gray-200 [&_pre]:!p-5
      prose-table:text-sm prose-th:font-semibold prose-th:bg-gray-50 prose-td:align-top
      prose-blockquote:not-italic prose-blockquote:rounded-r-lg
      prose-li:my-0.5
      [&_a]:text-[#C96A3F] [&_blockquote]:border-[#C96A3F] [&_blockquote]:bg-[#FEF0E8]/60">
      <ContentRenderer :value="page!" />
    </div>
  </div>
</template>
