<script setup lang="ts">
definePageMeta({ layout: false })

useSeoMeta({
  title: 'Koryla Skill — A/B testing for your AI',
  description: 'Download the Koryla skill and let your AI add server-side A/B testing to your project in minutes.',
  ogTitle: 'Koryla Skill — A/B testing for your AI',
  ogDescription: 'Download the Koryla skill and let your AI add server-side A/B testing to your project in minutes.',
  ogUrl: 'https://koryla.com/skill',
  ogType: 'website',
})

const steps = [
  { n: '01', title: 'Download the skill', body: 'Click the button below to download <code>koryla.md</code> — a single file that teaches your AI everything about Koryla.' },
  { n: '02', title: 'Drop it in Claude Code', body: 'Save it to <code>~/.claude/skills/koryla.md</code>. Claude Code picks it up automatically on the next session.' },
  { n: '03', title: 'Tell your AI what to test', body: 'Say "Add an A/B test to my hero headline" and the skill guides the AI through setup, code, and tracking — nothing else.' },
]

const what = [
  ['Asks the right questions first', 'Framework, API key, experiment UUID, what to test.'],
  ['Writes only the experiment code', 'No framework setup, no boilerplate, no config files.'],
  ['Knows all four frameworks', 'React/Next.js, Vue/Nuxt, Astro, and WordPress.'],
  ['Handles conversion tracking', 'Automatic via URL or manual via fetch — it knows both.'],
]
</script>

<template>
  <div class="min-h-screen bg-white" style="font-family: 'Space Grotesk', system-ui, sans-serif;">

    <!-- Nav -->
    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: #C96A3F;">
            <span class="text-white font-black text-sm">K</span>
          </div>
          <span class="font-bold text-lg" style="color: #0F2235;">Koryla</span>
        </NuxtLink>
        <div class="flex items-center gap-4">
          <NuxtLink to="/docs" class="text-sm text-gray-500 hover:text-gray-900 transition-colors">Docs</NuxtLink>
          <NuxtLink to="/login" class="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90" style="background: #C96A3F;">
            Get started
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="pt-24 pb-20 px-6 text-center" style="background: linear-gradient(160deg, #F5EDE0 0%, #ffffff 60%);">
      <div class="max-w-2xl mx-auto">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border" style="background: #FEF0E8; color: #C96A3F; border-color: #F0C9B0;">
          <span class="w-1.5 h-1.5 rounded-full" style="background: #C96A3F;"></span>
          CLAUDE CODE · SKILL
        </div>

        <h1 class="text-5xl md:text-6xl font-black tracking-tight leading-none mb-6" style="color: #0F2235;">
          A/B testing,<br/>
          <span style="color: #C96A3F;">done by your AI.</span>
        </h1>

        <p class="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          One file. Drop it in Claude Code and your AI knows exactly how to add Koryla experiments to any project — no flicker, no client JS, no guesswork.
        </p>

        <a
          href="/api/public/skill/download"
          class="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold text-white transition-colors hover:opacity-90"
          style="background: #0F2235;"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download koryla.md
        </a>
        <p class="mt-3 text-xs text-gray-400">Free. Works with Claude Code.</p>
      </div>
    </section>

    <!-- How to install -->
    <section class="py-24 px-6">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl font-bold mb-12 text-center" style="color: #0F2235;">Three steps to wire it up</h2>
        <div class="flex flex-col gap-8">
          <div v-for="step in steps" :key="step.n" class="flex gap-6 items-start">
            <div class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black" style="background: #FEF0E8; color: #C96A3F;">
              {{ step.n }}
            </div>
            <div>
              <p class="font-bold text-base mb-1" style="color: #0F2235;">{{ step.title }}</p>
              <p class="text-sm text-gray-500 leading-relaxed" v-html="step.body"></p>
            </div>
          </div>
        </div>

        <!-- Code block -->
        <div class="mt-12 rounded-2xl overflow-hidden border border-gray-100">
          <div class="px-4 py-3 flex items-center gap-2 border-b border-gray-100" style="background: #f8fafc;">
            <div class="w-2.5 h-2.5 rounded-full bg-red-400/70"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-yellow-400/70"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-green-400/70"></div>
            <span class="ml-2 text-xs text-gray-400">terminal</span>
          </div>
          <div class="px-6 py-5 text-sm font-mono leading-relaxed" style="background: #0F2235; color: #d1d5db;">
            <span style="color: #6b7280;"># Download and install</span><br/>
            <span style="color: #C96A3F;">mkdir</span> -p ~/.claude/skills<br/>
            <span style="color: #C96A3F;">mv</span> ~/Downloads/koryla.md ~/.claude/skills/<br/>
            <br/>
            <span style="color: #6b7280;"># Then in Claude Code, just say:</span><br/>
            <span style="color: #fff;">"Add an A/B test to my hero headline"</span>
          </div>
        </div>
      </div>
    </section>

    <!-- What the skill does -->
    <section class="py-24 px-6" style="background: #F5EDE0;">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl font-bold mb-3 text-center" style="color: #0F2235;">What the skill knows</h2>
        <p class="text-center text-gray-500 text-sm mb-12">It's scoped on purpose — it does one thing well and nothing else.</p>
        <div class="grid sm:grid-cols-2 gap-4">
          <div
            v-for="[title, desc] in what" :key="title"
            class="bg-white rounded-2xl p-6 border" style="border-color: #EAD9C4;"
          >
            <div class="w-5 h-5 mb-3" style="color: #C96A3F;">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="font-semibold text-sm mb-1" style="color: #0F2235;">{{ title }}</p>
            <p class="text-sm text-gray-500">{{ desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA bottom -->
    <section class="py-24 px-6 text-center">
      <div class="max-w-lg mx-auto">
        <h2 class="text-3xl font-black mb-4" style="color: #0F2235;">Ready to test?</h2>
        <p class="text-gray-500 mb-8">Download the skill, tell your AI what to test, and ship your first experiment today.</p>
        <div class="flex items-center justify-center gap-4 flex-wrap">
          <a
            href="/api/public/skill/download"
            class="px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style="background: #C96A3F;"
          >
            Download koryla.md
          </a>
          <NuxtLink to="/docs" class="px-7 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:border-gray-300 transition-colors">
            Read the docs →
          </NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>
