<script setup lang="ts">
definePageMeta({ layout: false })

const email = ref('')
const submitted = ref(false)
const loading = ref(false)
const error = ref('')

const submit = async () => {
  if (!email.value) return
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/waitlist', { method: 'POST', body: { email: email.value } })
    submitted.value = true
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Something went wrong. Try again.'
  } finally {
    loading.value = false
  }
}

// Demo animation
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
          <a href="#features" class="hover:text-gray-900 transition-colors">Features</a>
          <NuxtLink to="/docs" class="hover:text-gray-900 transition-colors">Docs</NuxtLink>
          <NuxtLink to="/blog" class="hover:text-gray-900 transition-colors">Blog</NuxtLink>
          <a href="#pricing" class="hover:text-gray-900 transition-colors">Pricing</a>
        </div>
        <a href="#waitlist" class="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style="background: #C96A3F;">
          Register
        </a>
      </div>
    </nav>

    <!-- Hero -->
    <section class="pt-24 pb-20 px-6 texture-dots-sand" style="background: linear-gradient(160deg, #F5EDE0 0%, #ffffff 55%);">
      <div class="max-w-4xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border" style="background: #FEF0E8; color: #C96A3F; border-color: #F0C9B0;">
          <span class="w-1.5 h-1.5 rounded-full" style="background: #C96A3F;"></span>
          EDGE-BASED A/B TESTING — ZERO FLICKER
        </div>

        <h1 class="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6" style="color: #0F2235;">
          A/B tests that run<br/>
          <span style="color: #C96A3F;">before the page loads.</span>
        </h1>

        <p class="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Koryla runs experiments at the Cloudflare edge — your visitors always see the right variant instantly, with no JavaScript, no flicker, no performance hit.
        </p>

        <!-- Waitlist form -->
        <div id="waitlist" class="max-w-md mx-auto">
          <div v-if="submitted" class="flex items-center gap-3 px-6 py-4 rounded-2xl border" style="background: #FEF0E8; border-color: #F0C9B0;">
            <svg class="w-5 h-5 shrink-0" style="color: #C96A3F;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p class="text-sm font-medium" style="color: #C96A3F;">You're on the list! We'll notify you when Koryla opens.</p>
          </div>
          <form v-else class="flex gap-2" @submit.prevent="submit">
            <input
              v-model="email"
              type="email"
              placeholder="you@company.com"
              required
              class="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
            />
            <button
              type="submit"
              :disabled="loading"
              class="px-5 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap"
              style="background: #C96A3F;"
            >
              {{ loading ? '…' : 'Register' }}
            </button>
          </form>
          <p v-if="error" class="mt-2 text-xs text-red-500">{{ error }}</p>
          <p v-else class="mt-3 text-xs text-gray-400">Be among the first to know when we launch. No spam, ever.</p>
        </div>
      </div>
    </section>

    <!-- Demo section -->
    <section class="py-24 px-6 texture-dots-dark" style="background: #0F2235;">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Watch the traffic split happen</h2>
          <p class="text-gray-400 text-lg">Visitor A gets the control. Visitor B gets the variant. Zero code changes on your site.</p>
        </div>

        <!-- Browser mockup -->
        <div class="rounded-2xl overflow-hidden border border-white/10" style="background: #1A3550;">
          <!-- Browser chrome -->
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
            <!-- Variant badge -->
            <div
              class="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-500"
              :style="activeVariant === 'control'
                ? 'background: #F5EDE0; color: #0F2235;'
                : 'background: #FEF0E8; color: #C96A3F;'"
            >
              {{ activeVariant === 'control' ? 'Control' : 'Variant B' }}
            </div>
          </div>

          <!-- Page content -->
          <div class="relative overflow-hidden" style="height: 340px;">
            <!-- Control variant -->
            <transition name="fade">
              <div v-if="activeVariant === 'control'" class="absolute inset-0 p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white">
                <div class="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-wide">
                  ANALYTICS FOR DEVELOPERS
                </div>
                <h3 class="text-3xl md:text-4xl font-black tracking-tight text-gray-900 mb-4">
                  Know what your<br/>users actually do
                </h3>
                <p class="text-gray-500 text-base max-w-md mb-7">
                  Beacon gives you real-time insights without cookies, GDPR headaches, or bloated JS bundles.
                </p>
                <div class="flex gap-3">
                  <span class="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Start for free</span>
                  <span class="bg-gray-50 text-gray-700 border border-gray-200 px-6 py-2.5 rounded-xl text-sm font-semibold">See pricing</span>
                </div>
              </div>
            </transition>

            <!-- Variant B -->
            <transition name="fade">
              <div v-if="activeVariant === 'b'" class="absolute inset-0 p-8 md:p-12 flex items-center bg-white">
                <div class="max-w-xs">
                  <div class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5" style="background: #FEF0E8; color: #C96A3F;">
                    <span class="w-1.5 h-1.5 rounded-full" style="background: #C96A3F;"></span>
                    NOW IN BETA · 1,200 TEAMS JOINED
                  </div>
                  <h3 class="text-2xl md:text-3xl font-black tracking-tight text-gray-900 mb-3">
                    Stop guessing.<br/>
                    <span style="color: #C96A3F;">Start knowing.</span>
                  </h3>
                  <p class="text-gray-500 text-sm mb-5 leading-relaxed">
                    Beacon tracks every click, scroll and session — privacy-first, no cookies required.
                  </p>
                  <div class="flex gap-2">
                    <div class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">you@company.com</div>
                    <span class="text-white px-4 py-2 rounded-lg text-sm font-semibold" style="background: #C96A3F;">Get early access</span>
                  </div>
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

        <!-- Analytics bar below -->
        <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="rounded-xl p-4 border border-white/10 text-center" style="background: #1A3550;">
            <p class="text-2xl font-bold" style="color: #C96A3F;">+23%</p>
            <p class="text-xs text-gray-400 mt-1">Conv. rate — Variant B</p>
          </div>
          <div class="rounded-xl p-4 border border-white/10 text-center" style="background: #1A3550;">
            <p class="text-2xl font-bold text-white">4,891</p>
            <p class="text-xs text-gray-400 mt-1">Visitors tested</p>
          </div>
          <div class="rounded-xl p-4 border border-white/10 text-center" style="background: #1A3550;">
            <p class="text-2xl font-bold text-white">95%</p>
            <p class="text-xs text-gray-400 mt-1">Statistical confidence</p>
          </div>
          <div class="rounded-xl p-4 border border-white/10 text-center" style="background: #1A3550;">
            <p class="text-2xl font-bold" style="color: #C96A3F;">~0ms</p>
            <p class="text-xs text-gray-400 mt-1">Latency added</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-24 px-6 texture-dots-light" style="background: #F5EDE0;">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-4" style="color: #0F2235;">How it works</h2>
          <p class="text-gray-500 text-lg">No JavaScript on your site. No changes to your codebase. Just a Cloudflare Worker in front of your domain.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="(step, i) in [
            { n: '01', title: 'Deploy the Worker', desc: 'A small Cloudflare Worker sits in front of your domain. One-time setup, works with any site.' },
            { n: '02', title: 'Create an experiment', desc: 'Define your base URL, add variant URLs, set traffic weights. No code changes on your site.' },
            { n: '03', title: 'Let the edge decide', desc: 'Every visitor is assigned a variant in milliseconds — before any HTML reaches their browser.' },
          ]" :key="i"
            class="bg-white rounded-2xl p-8 border" style="border-color: #EAD9C4;"
          >
            <div class="text-4xl font-black mb-4" style="color: #EAD9C4;">{{ step.n }}</div>
            <h3 class="text-lg font-bold mb-2" style="color: #0F2235;">{{ step.title }}</h3>
            <p class="text-gray-500 text-sm leading-relaxed">{{ step.desc }}</p>
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
            { icon: '⚡', title: 'Zero flicker', desc: 'Variant assignment happens at the edge — the browser always receives the correct page directly.' },
            { icon: '📊', title: 'Multi-destination analytics', desc: 'Send experiment data to GA4, PostHog, Mixpanel, Segment, or your own webhook simultaneously.' },
            { icon: '🔌', title: 'Any stack', desc: 'Works with Next.js, Astro, WordPress, Webflow — anything behind a Cloudflare-proxied domain.' },
            { icon: '🍪', title: 'Sticky assignments', desc: 'Visitors always see the same variant. Cookie-based, 30-day persistence, no login required.' },
            { icon: '🔑', title: 'Team & API keys', desc: 'Invite teammates, manage roles, and create multiple API keys per workspace.' },
            { icon: '📈', title: 'Statistical significance', desc: 'Know when to stop. Koryla tracks conversions and tells you when your result is reliable.' },
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
    <section id="pricing" class="py-24 px-6 texture-dots-sand" style="background: #F5EDE0;">
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
              features: ['1 workspace', '3 experiments', '10k visitors/mo', 'Community support'],
              cta: 'Join waitlist',
              highlight: false,
            },
            {
              name: 'Starter',
              price: '$29',
              period: 'per month',
              features: ['3 workspaces', 'Unlimited experiments', '100k visitors/mo', 'Email support', 'Analytics integrations'],
              cta: 'Join waitlist',
              highlight: true,
            },
            {
              name: 'Growth',
              price: '$99',
              period: 'per month',
              features: ['Unlimited workspaces', 'Unlimited experiments', '1M visitors/mo', 'Priority support', 'Multivariate tests', 'Custom webhooks'],
              cta: 'Join waitlist',
              highlight: false,
            },
          ]" :key="plan.name"
            class="rounded-2xl p-8 border relative"
            :style="plan.highlight
              ? 'background: #0F2235; border-color: #0F2235;'
              : 'background: white; border-color: #EAD9C4;'"
          >
            <div v-if="plan.highlight" class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white" style="background: #C96A3F;">
              Most popular
            </div>
            <h3 class="font-bold text-lg mb-1" :style="plan.highlight ? 'color: white;' : 'color: #0F2235;'">{{ plan.name }}</h3>
            <div class="flex items-baseline gap-1 mb-1">
              <span class="text-4xl font-black" :style="plan.highlight ? 'color: white;' : 'color: #0F2235;'">{{ plan.price }}</span>
              <span class="text-sm" :style="plan.highlight ? 'color: #94a3b8;' : 'color: #6b7280;'">/ {{ plan.period }}</span>
            </div>
            <ul class="space-y-2.5 mb-8 mt-6">
              <li v-for="f in plan.features" :key="f" class="flex items-center gap-2 text-sm" :style="plan.highlight ? 'color: #cbd5e1;' : 'color: #4b5563;'">
                <svg class="w-4 h-4 shrink-0" style="color: #C96A3F;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {{ f }}
              </li>
            </ul>
            <a
              href="#waitlist"
              class="block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors"
              :style="plan.highlight
                ? 'background: #C96A3F; color: white;'
                : 'background: #FEF0E8; color: #C96A3F;'"
            >
              {{ plan.cta }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="py-24 px-6 bg-white">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4" style="color: #0F2235;">Be among the first to run edge experiments.</h2>
        <p class="text-gray-500 text-lg mb-10">We're building in public. Register now and we'll notify you the day we open.</p>

        <div v-if="submitted" class="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border max-w-sm mx-auto" style="background: #FEF0E8; border-color: #F0C9B0;">
          <svg class="w-5 h-5 shrink-0" style="color: #C96A3F;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p class="text-sm font-medium" style="color: #C96A3F;">You're on the list!</p>
        </div>
        <form v-else class="flex gap-2 max-w-sm mx-auto" @submit.prevent="submit">
          <input
            v-model="email"
            type="email"
            placeholder="you@company.com"
            required
            class="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-gray-400 transition-colors"
          />
          <button
            type="submit"
            :disabled="loading"
            class="px-5 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style="background: #C96A3F;"
          >
            {{ loading ? '…' : 'Register' }}
          </button>
        </form>
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
          <NuxtLink to="/docs" class="hover:text-gray-600 transition-colors">Docs</NuxtLink>
          <NuxtLink to="/blog" class="hover:text-gray-600 transition-colors">Blog</NuxtLink>
          <NuxtLink to="/login" class="hover:text-gray-600 transition-colors">Log in</NuxtLink>
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
