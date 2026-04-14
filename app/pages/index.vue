<script setup lang="ts">
definePageMeta({ layout: false })

useSeoMeta({
  title: 'Koryla — A/B Testing Without the Flicker',
  description: 'Run A/B experiments at the edge or inside your components. No flicker, no performance hit, works with any stack.',
  ogTitle: 'Koryla — A/B Testing Without the Flicker',
  ogDescription: 'Run A/B experiments at the edge or inside your components. No flicker, no performance hit, works with any stack.',
  ogUrl: 'https://koryla.com/',
  ogType: 'website',
  twitterTitle: 'Koryla — A/B Testing Without the Flicker',
  twitterDescription: 'Run A/B experiments at the edge or inside your components. No flicker, no performance hit.',
})

const activeVariant = ref<'control' | 'b'>('control')
let interval: ReturnType<typeof setInterval>
onMounted(() => {
  interval = setInterval(() => {
    activeVariant.value = activeVariant.value === 'control' ? 'b' : 'control'
  }, 3200)
})
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="min-h-screen bg-white" style="font-family: 'Space Grotesk', system-ui, sans-serif;">

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
          <a href="#how" class="hover:text-gray-900 transition-colors">How it works</a>
          <NuxtLink to="/docs" class="hover:text-gray-900 transition-colors">Docs</NuxtLink>
          <NuxtLink to="/blog" class="hover:text-gray-900 transition-colors">Blog</NuxtLink>
          <a href="#pricing" class="hover:text-gray-900 transition-colors">Pricing</a>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink to="/login" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </NuxtLink>
          <NuxtLink to="/login" class="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90" style="background: #C96A3F;">
            Get started
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="pt-24 pb-20 px-6" style="background: linear-gradient(160deg, #F5EDE0 0%, #ffffff 55%);">
      <div class="max-w-4xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border" style="background: #FEF0E8; color: #C96A3F; border-color: #F0C9B0;">
          <span class="w-1.5 h-1.5 rounded-full" style="background: #C96A3F;"></span>
          EDGE + SDK A/B TESTING — ZERO FLICKER
        </div>

        <h1 class="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6" style="color: #0F2235;">
          A/B tests that run<br/>
          <span style="color: #C96A3F;">before the page loads.</span>
        </h1>

        <p class="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Koryla runs experiments at the edge or inside your React, Vue, and Astro components — your visitors always see the right variant instantly, with no flicker and no performance hit.
        </p>

        <div class="flex items-center justify-center gap-4 flex-wrap">
          <NuxtLink
            to="/login"
            class="px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style="background: #C96A3F;"
          >
            Start for free
          </NuxtLink>
          <NuxtLink
            to="/docs"
            class="px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors border border-gray-200 hover:border-gray-300 text-gray-700"
          >
            Read the docs →
          </NuxtLink>
        </div>
        <p class="mt-4 text-xs text-gray-400">Free plan available. No credit card required.</p>
      </div>
    </section>

    <!-- Demo -->
    <section class="py-24 px-6" style="background: #0F2235;">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Watch the traffic split happen</h2>
          <p class="text-gray-400 text-lg">Visitor A gets the control. Visitor B gets the variant. Zero code changes on your site.</p>
        </div>

        <!-- Browser mockup -->
        <div class="rounded-2xl overflow-hidden border border-white/10" style="background: #1A3550;">
          <div class="px-4 py-3 flex items-center gap-3 border-b border-white/10" style="background: #162D42;">
            <div class="flex gap-1.5">
              <div class="w-3 h-3 rounded-full bg-red-400/70"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-400/70"></div>
              <div class="w-3 h-3 rounded-full bg-green-400/70"></div>
            </div>
            <div class="flex-1 flex justify-center">
              <div class="px-4 py-1 rounded-md text-xs text-gray-400 flex items-center gap-2" style="background: #0F2235; min-width: 200px; text-align: center;">
                <svg class="w-3 h-3 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                </svg>
                yoursite.com/pricing
              </div>
            </div>
            <div
              class="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-500"
              :style="activeVariant === 'control' ? 'background: #F5EDE0; color: #0F2235;' : 'background: #FEF0E8; color: #C96A3F;'"
            >
              {{ activeVariant === 'control' ? 'Control' : 'Variant B' }}
            </div>
          </div>

          <div class="relative overflow-hidden" style="height: 340px;">
            <transition name="fade">
              <div v-if="activeVariant === 'control'" class="absolute inset-0 p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white">
                <div class="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-wide">ANALYTICS FOR DEVELOPERS</div>
                <h3 class="text-3xl md:text-4xl font-black tracking-tight text-gray-900 mb-4">Know what your<br/>users actually do</h3>
                <p class="text-gray-500 text-base max-w-md mb-7">Real-time insights without cookies, GDPR headaches, or bloated JS bundles.</p>
                <div class="flex gap-3">
                  <span class="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Start for free</span>
                  <span class="bg-gray-50 text-gray-700 border border-gray-200 px-6 py-2.5 rounded-xl text-sm font-semibold">See pricing</span>
                </div>
              </div>
            </transition>
            <transition name="fade">
              <div v-if="activeVariant === 'b'" class="absolute inset-0 p-8 md:p-12 flex items-center bg-white">
                <div class="max-w-xs">
                  <div class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5" style="background: #FEF0E8; color: #C96A3F;">
                    <span class="w-1.5 h-1.5 rounded-full" style="background: #C96A3F;"></span>
                    PRIVACY-FIRST · NO COOKIES
                  </div>
                  <h3 class="text-2xl md:text-3xl font-black tracking-tight text-gray-900 mb-3">Stop guessing.<br/><span style="color: #C96A3F;">Start knowing.</span></h3>
                  <p class="text-gray-500 text-sm mb-6 leading-relaxed">Track every click, scroll and session — without collecting personal data.</p>
                  <span class="inline-block text-white px-6 py-2.5 rounded-xl text-sm font-semibold" style="background: #C96A3F;">Get started free</span>
                </div>
                <div class="hidden md:flex flex-col gap-2.5 ml-8 flex-1">
                  <div v-for="item in [['⚡','Real-time','See events as they happen.'],['🔒','Privacy-first','GDPR compliant, no personal data.'],['📦','< 2KB','20× lighter than GA.'],['🔌','Any stack','Next.js, Astro, WordPress.']]" :key="item[0]"
                    class="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                    <span class="text-base">{{ item[0] }}</span>
                    <div>
                      <p class="text-xs font-bold text-gray-900">{{ item[1] }}</p>
                      <p class="text-xs text-gray-500">{{ item[2] }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div v-for="stat in [
            { value: '+23%', label: 'Conv. rate — Variant B', accent: true },
            { value: '4,891', label: 'Visitors tested', accent: false },
            { value: '95%', label: 'Statistical confidence', accent: false },
            { value: '~0ms', label: 'Latency added', accent: true },
          ]" :key="stat.label"
            class="rounded-xl p-4 border border-white/10 text-center" style="background: #1A3550;">
            <p class="text-2xl font-bold" :style="stat.accent ? 'color: #C96A3F;' : 'color: white;'">{{ stat.value }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="py-24 px-6" style="background: #F5EDE0;">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-4" style="color: #0F2235;">Two ways to run experiments</h2>
          <p class="text-gray-500 text-lg">Choose the approach that fits your stack — or use both.</p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 mb-12">
          <!-- Edge -->
          <div class="bg-white rounded-2xl p-8 border" style="border-color: #EAD9C4;">
            <div class="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-6" style="background: #EEF2FF; color: #4338CA;">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              EDGE
            </div>
            <h3 class="text-xl font-bold mb-3" style="color: #0F2235;">Worker / Middleware</h3>
            <p class="text-gray-500 text-sm leading-relaxed mb-6">A Cloudflare Worker or Next.js middleware intercepts requests before any HTML is served. Visitors receive their variant with zero JavaScript and zero flicker — the browser never sees the original URL.</p>
            <div class="space-y-2">
              <div v-for="step in ['Deploy the worker once', 'Define base URL + variant URLs', 'Traffic splits at the edge automatically']" :key="step"
                class="flex items-center gap-2.5 text-sm text-gray-600">
                <svg class="w-4 h-4 shrink-0" style="color: #C96A3F;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {{ step }}
              </div>
            </div>
          </div>

          <!-- SDK -->
          <div class="bg-white rounded-2xl p-8 border" style="border-color: #EAD9C4;">
            <div class="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-6" style="background: #FEF0E8; color: #C96A3F;">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              SDK
            </div>
            <h3 class="text-xl font-bold mb-3" style="color: #0F2235;">React · Vue · Astro · Next.js</h3>
            <p class="text-gray-500 text-sm leading-relaxed mb-6">Wrap any component with <code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">&lt;Experiment&gt;</code> and define variants inline. Koryla handles assignment, persistence, and reporting — no edge infrastructure needed.</p>
            <div class="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 leading-relaxed">
              <span class="text-purple-600">&lt;Experiment</span> <span class="text-blue-600">id</span>=<span class="text-green-600">"hero-cta"</span><span class="text-purple-600">&gt;</span><br/>
              &nbsp;&nbsp;<span class="text-purple-600">&lt;Variant</span> <span class="text-blue-600">name</span>=<span class="text-green-600">"control"</span><span class="text-purple-600">&gt;</span><span class="text-gray-400">…</span><span class="text-purple-600">&lt;/Variant&gt;</span><br/>
              &nbsp;&nbsp;<span class="text-purple-600">&lt;Variant</span> <span class="text-blue-600">name</span>=<span class="text-green-600">"b"</span><span class="text-purple-600">&gt;</span><span class="text-gray-400">…</span><span class="text-purple-600">&lt;/Variant&gt;</span><br/>
              <span class="text-purple-600">&lt;/Experiment&gt;</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="py-24 px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-4" style="color: #0F2235;">Everything you need to run experiments</h2>
          <p class="text-gray-500 text-lg">Built for speed, accuracy, and developer sanity.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-5">
          <div v-for="feat in [
            { icon: '⚡', title: 'Zero flicker', desc: 'Variant assignment happens at the edge — the browser always receives the correct page directly. No layout shift, no flash.' },
            { icon: '🧩', title: 'React, Vue & Astro SDK', desc: 'Drop the <Experiment> component anywhere. Works with SSR, SSG, and client-side rendering out of the box.' },
            { icon: '📊', title: 'Multi-destination analytics', desc: 'Send experiment data to GA4, PostHog, Mixpanel, Segment, Amplitude, or your own webhook — simultaneously.' },
            { icon: '🔌', title: 'Any stack', desc: 'Edge mode works with Next.js, Astro, WordPress, Webflow — anything behind a Cloudflare-proxied domain.' },
            { icon: '🍪', title: 'Sticky assignments', desc: 'Visitors always see the same variant. Cookie-based, 30-day persistence, consistent across sessions.' },
            { icon: '📈', title: 'Conversion tracking', desc: 'Define a conversion URL and Koryla tracks it automatically. See impressions, conversions, and conv. rate per variant.' },
          ]" :key="feat.title"
            class="rounded-2xl p-6 border border-gray-100 bg-gray-50"
          >
            <div class="text-2xl mb-4">{{ feat.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-2">{{ feat.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="py-24 px-6" style="background: #F5EDE0;">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-4" style="color: #0F2235;">Simple, transparent pricing</h2>
          <p class="text-gray-500 text-lg">Start free. Scale when you're ready.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-5">
          <div v-for="plan in [
            {
              name: 'Free',
              price: '$0',
              period: 'forever',
              features: ['1 workspace', '3 experiments', 'Edge + SDK testing', 'Community support'],
              cta: 'Get started',
              highlight: false,
            },
            {
              name: 'Starter',
              price: '$29',
              period: 'per month',
              features: ['3 workspaces', 'Unlimited experiments', 'All analytics integrations', 'Email support'],
              cta: 'Get started',
              highlight: true,
            },
            {
              name: 'Growth',
              price: '$79',
              period: 'per month',
              features: ['Unlimited workspaces', 'Unlimited experiments', 'Priority support', 'Custom webhooks'],
              cta: 'Get started',
              highlight: false,
            },
          ]" :key="plan.name"
            class="rounded-2xl p-8 border relative"
            :style="plan.highlight ? 'background: #0F2235; border-color: #0F2235;' : 'background: white; border-color: #EAD9C4;'"
          >
            <div v-if="plan.highlight" class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white" style="background: #C96A3F;">
              Most popular
            </div>
            <h3 class="font-bold text-lg mb-1" :style="plan.highlight ? 'color: white;' : 'color: #0F2235;'">{{ plan.name }}</h3>
            <div class="flex items-baseline gap-1 mb-1">
              <span class="text-4xl font-black" :style="plan.highlight ? 'color: white;' : 'color: #0F2235;'">{{ plan.price }}</span>
              <span class="text-sm" :style="plan.highlight ? 'color: #94a3b8;' : 'color: #6b7280;'">/&nbsp;{{ plan.period }}</span>
            </div>
            <ul class="space-y-2.5 mb-8 mt-6">
              <li v-for="f in plan.features" :key="f" class="flex items-center gap-2 text-sm" :style="plan.highlight ? 'color: #cbd5e1;' : 'color: #4b5563;'">
                <svg class="w-4 h-4 shrink-0" style="color: #C96A3F;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {{ f }}
              </li>
            </ul>
            <NuxtLink
              to="/login"
              class="block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
              :style="plan.highlight ? 'background: #C96A3F; color: white;' : 'background: #FEF0E8; color: #C96A3F;'"
            >
              {{ plan.cta }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="py-24 px-6 bg-white">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4" style="color: #0F2235;">Start running smarter experiments today.</h2>
        <p class="text-gray-500 text-lg mb-10">Free plan, no credit card required. Up and running in minutes.</p>
        <div class="flex items-center justify-center gap-4 flex-wrap">
          <NuxtLink
            to="/login"
            class="px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style="background: #C96A3F;"
          >
            Get started free
          </NuxtLink>
          <NuxtLink
            to="/docs"
            class="px-8 py-3.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Read the docs
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 px-6 border-t border-gray-100">
      <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: #C96A3F;">
            <span class="text-white font-black text-xs">K</span>
          </div>
          <span class="font-bold" style="color: #0F2235;">Koryla</span>
        </div>
        <div class="flex items-center gap-6 text-sm text-gray-400">
          <NuxtLink to="/docs"    class="hover:text-gray-600 transition-colors">Docs</NuxtLink>
          <NuxtLink to="/blog"    class="hover:text-gray-600 transition-colors">Blog</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-gray-600 transition-colors">Privacy</NuxtLink>
          <NuxtLink to="/terms"   class="hover:text-gray-600 transition-colors">Terms</NuxtLink>
          <NuxtLink to="/login"   class="hover:text-gray-600 transition-colors">Log in</NuxtLink>
        </div>
        <p class="text-sm text-gray-400">© 2026 Koryla. All rights reserved.</p>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
