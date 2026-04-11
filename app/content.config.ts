import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        author: z.string(),
        slug: z.string(),
        image: z.string().optional(),
      }),
    }),
    docs: defineCollection({
      type: 'page',
      source: 'docs/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        order: z.number().optional(),
        section: z.string().optional(),
        slug: z.string(),
      }),
    }),
    legal: defineCollection({
      type: 'page',
      source: 'legal/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string(),
        updatedAt: z.string(),
      }),
    }),
  },
})
