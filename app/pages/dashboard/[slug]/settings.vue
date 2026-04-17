<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth', key: route => route.path })

const { currentWorkspace, fetchWorkspaces } = useWorkspace()
const toast = useToast()
const confirm = useConfirm()
await fetchWorkspaces()

const route = useRoute()
const slug = route.params.slug as string

if (!currentWorkspace.value) throw createError({ statusCode: 404, statusMessage: "Workspace not found or you don't have access to it." })

// ── General ──────────────────────────────────────────────
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)
const wsName = ref(currentWorkspace.value?.name ?? '')
const wsDomain = ref(currentWorkspace.value?.domain ?? '')
const wsAutoJoin = ref(currentWorkspace.value?.auto_join_domain ?? false)

const saveGeneral = async () => {
  saving.value = true; saveError.value = ''; saveSuccess.value = false
  try {
    await $fetch(`/api/workspaces/${slug}`, {
      method: 'PUT',
      body: { name: wsName.value, domain: wsDomain.value || null, auto_join_domain: wsAutoJoin.value },
    })
    await fetchWorkspaces()
    saveSuccess.value = true
    toast.success('Settings saved')
    setTimeout(() => saveSuccess.value = false, 2500)
  } catch (e: any) {
    saveError.value = e?.data?.message ?? 'Failed to save'
    toast.error(saveError.value)
  } finally {
    saving.value = false
  }
}

// ── API Keys ──────────────────────────────────────────────
interface ApiKey { id: string; key_prefix: string; created_at: string; last_used_at: string | null }

const { data: keys, refresh: refreshKeys } = await useFetch<ApiKey[]>(`/api/workspaces/${slug}/keys`)
const SESSION_KEY = `koryla-new-key-${slug}`
const newKey = ref<string | null>(null)
const generatingKey = ref(false)
const copied = ref(false)

// Restore key from sessionStorage if user navigated away
onMounted(() => {
  const stored = sessionStorage.getItem(SESSION_KEY)
  if (stored) newKey.value = stored
})

const generateKey = async () => {
  generatingKey.value = true
  try {
    const data = await $fetch<ApiKey & { key: string }>(`/api/workspaces/${slug}/keys`, { method: 'POST' })
    newKey.value = data.key
    sessionStorage.setItem(SESSION_KEY, data.key)
    await refreshKeys()
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to generate key')
  } finally {
    generatingKey.value = false
  }
}

const copyKey = () => {
  if (!newKey.value) return
  navigator.clipboard.writeText(newKey.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

const dismissKey = () => {
  newKey.value = null
  sessionStorage.removeItem(SESSION_KEY)
}

const deleteKey = async (id: string) => {
  const ok = await confirm.ask({
    title: 'Delete API key?',
    message: 'This cannot be undone. Any workers using this key will stop authenticating.',
    confirmText: 'Delete',
    variant: 'danger',
  })
  if (!ok) return
  await $fetch(`/api/workspaces/${slug}/keys/${id}`, { method: 'DELETE' })
  if (newKey.value) newKey.value = null
  await refreshKeys()
  toast.success('API key deleted')
}

// ── Members ───────────────────────────────────────────────
interface Member { id: string; role: string; email: string; user_id: string; created_at: string }

const { data: members, refresh: refreshMembers } = await useFetch<Member[]>(`/api/workspaces/${slug}/members`)
const inviteEmail = ref('')
const inviteRole = ref('member')
const inviting = ref(false)
const inviteLink = ref<string | null>(null)
const inviteError = ref('')

const sendInvite = async () => {
  if (!inviteEmail.value.trim()) return
  inviting.value = true; inviteError.value = ''; inviteLink.value = null
  try {
    const data = await $fetch<{ invite_url: string }>(`/api/workspaces/${slug}/invites`, {
      method: 'POST',
      body: { email: inviteEmail.value.trim(), role: inviteRole.value },
    })
    inviteLink.value = data.invite_url
    inviteEmail.value = ''
  } catch (e: any) {
    inviteError.value = e?.data?.message ?? 'Failed to create invite'
  } finally {
    inviting.value = false
  }
}

const copyInvite = () => {
  if (!inviteLink.value) return
  navigator.clipboard.writeText(inviteLink.value)
}

const removeMember = async (id: string) => {
  const ok = await confirm.ask({
    title: 'Remove member?',
    message: 'They will lose access to this workspace immediately.',
    confirmText: 'Remove',
    variant: 'danger',
  })
  if (!ok) return
  await $fetch(`/api/workspaces/${slug}/members/${id}`, { method: 'DELETE' })
  await refreshMembers()
  toast.success('Member removed')
}

const isOwner = computed(() => currentWorkspace.value?.role === 'owner')

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// ── Delete workspace ──────────────────────────────────────
const deleteConfirmName = ref('')
const deleteLoading = ref(false)
const canConfirmDelete = computed(() =>
  deleteConfirmName.value === currentWorkspace.value?.name && isOwner.value
)

const deleteWorkspace = async () => {
  if (!canConfirmDelete.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/workspaces/${slug}`, { method: 'DELETE' })
    await navigateTo('/dashboard', { replace: true })
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to delete workspace')
  } finally {
    deleteLoading.value = false
  }
}

// ── Analytics destinations ────────────────────────────────
interface Destination { id: string; provider: string; enabled: boolean; config: Record<string, string> }

const { data: destinations, refresh: refreshDestinations } = await useFetch<Destination[]>(`/api/workspaces/${slug}/destinations`)

const PROVIDERS = [
  { id: 'ga4', label: 'Google Analytics 4', fields: [
    { key: 'measurement_id', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', hint: 'GA4 → Admin → Data Streams → select your stream → Measurement ID' },
    { key: 'api_secret',     label: 'API Secret',     placeholder: 'xxxxxxxxxxxxxxxx', hint: 'GA4 → Admin → Data Streams → select your stream → Measurement Protocol → Create' },
  ]},
  { id: 'posthog', label: 'PostHog', fields: [
    { key: 'api_key', label: 'Project API Key', placeholder: 'phc_...', hint: 'PostHog → Project Settings → Project API Key' },
    { key: 'host',    label: 'Host',            placeholder: 'https://app.posthog.com', hint: 'Use https://eu.posthog.com if your project is in the EU region' },
  ]},
  { id: 'mixpanel', label: 'Mixpanel', fields: [
    { key: 'token',      label: 'Project Token', placeholder: 'xxxxxxxxxxxxxxxx', hint: 'Mixpanel → Settings → Project Settings → Project Token' },
    { key: 'api_secret', label: 'API Secret',    placeholder: 'xxxxxxxxxxxxxxxx', hint: 'Mixpanel → Settings → Project Settings → API Secret' },
  ]},
  { id: 'segment', label: 'Segment', fields: [
    { key: 'write_key', label: 'Write Key', placeholder: 'xxxxxxxxxxxxxxxx', hint: 'Segment → Sources → select your source → API Keys → Write Key' },
  ]},
  { id: 'webhook', label: 'Webhook', fields: [
    { key: 'url', label: 'URL', placeholder: 'https://your-endpoint.com/hook', hint: 'Koryla will POST JSON with experiment_id, variant_id and session_id' },
  ]},
]

const showDestinationForm = ref(false)
const savingDestination = ref(false)
const deletingDestId = ref<string | null>(null)
const newProvider = ref('ga4')
const newConfig = ref<Record<string, string>>({})

const activeProviderFields = computed(() => PROVIDERS.find(p => p.id === newProvider.value)?.fields ?? [])
watch(newProvider, () => { newConfig.value = {} })
const providerLabel = (id: string) => PROVIDERS.find(p => p.id === id)?.label ?? id

const saveDestination = async () => {
  savingDestination.value = true
  try {
    await $fetch(`/api/workspaces/${slug}/destinations`, {
      method: 'POST',
      body: { provider: newProvider.value, config: newConfig.value },
    })
    await refreshDestinations()
    showDestinationForm.value = false
    newConfig.value = {}
    toast.success('Destination saved')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to save destination')
  } finally {
    savingDestination.value = false
  }
}

const deleteDestination = async (id: string) => {
  deletingDestId.value = id
  try {
    await $fetch(`/api/workspaces/${slug}/destinations/${id}`, { method: 'DELETE' })
    await refreshDestinations()
    toast.success('Destination removed')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Failed to delete')
  } finally {
    deletingDestId.value = null
  }
}

// ── Demo workspace ────────────────────────────────────────
const showDemo = ref(true)
onMounted(() => {
  const stored = localStorage.getItem('koryla-show-demo')
  if (stored !== null) showDemo.value = stored !== 'false'
})
const toggleDemo = (val: boolean) => {
  showDemo.value = val
  localStorage.setItem('koryla-show-demo', String(val))
  // Refresh page so sidebar updates
  window.location.reload()
}
</script>

<template>
  <div class="p-8 max-w-2xl space-y-10">

    <div>
      <h1 class="text-2xl font-semibold text-gray-900">Settings</h1>
      <p class="text-sm text-gray-500 mt-0.5">Manage your workspace configuration.</p>
    </div>

    <!-- General -->
    <section class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-900">General</h2>
      </div>
      <form class="px-6 py-5 space-y-4" @submit.prevent="saveGeneral">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Workspace name</label>
          <input v-model="wsName" type="text" required :disabled="!isOwner"
            class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] disabled:bg-gray-50 disabled:text-gray-400" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Corporate domain
            <span class="text-gray-400 font-normal ml-1">(e.g. acme.com)</span>
          </label>
          <input v-model="wsDomain" type="text" placeholder="acme.com" :disabled="!isOwner"
            class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] disabled:bg-gray-50 disabled:text-gray-400" />
        </div>
        <div class="flex items-center justify-between py-1">
          <div>
            <p class="text-sm font-medium text-gray-700">Auto-join by domain</p>
            <p class="text-xs text-gray-500 mt-0.5">New signups with your domain automatically join this workspace</p>
          </div>
          <button type="button" :disabled="!isOwner"
            :class="wsAutoJoin ? 'bg-[#C96A3F]' : 'bg-gray-200'"
            class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40"
            @click="wsAutoJoin = !wsAutoJoin">
            <span :class="wsAutoJoin ? 'translate-x-4' : 'translate-x-0.5'"
              class="inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform" />
          </button>
        </div>
        <div v-if="isOwner" class="flex items-center gap-3 pt-1">
          <button type="submit" :disabled="saving"
            class="bg-[#C96A3F] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A8522D] disabled:opacity-40 transition-colors">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
          <span v-if="saveSuccess" class="text-sm text-green-600">Saved!</span>
          <span v-if="saveError" class="text-sm text-red-600">{{ saveError }}</span>
        </div>
      </form>
    </section>

    <!-- API Keys -->
    <section class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 class="text-sm font-semibold text-gray-900">API Keys</h2>
          <p class="text-xs text-gray-500 mt-0.5">Authenticate the Cloudflare Worker with your workspace. You'll wire this up in Fase 04.</p>
        </div>
        <button v-if="isOwner" :disabled="generatingKey"
          class="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          @click="generateKey">
          {{ generatingKey ? 'Generating…' : '+ New key' }}
        </button>
      </div>

      <!-- New key banner -->
      <div v-if="newKey" class="mx-6 mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-xs font-semibold text-amber-800">Save this key — you won't be able to see it again after dismissing.</p>
            <p class="text-xs text-amber-700 mt-0.5">Add it to your Cloudflare Worker secrets as <code class="font-mono bg-amber-100 px-1 rounded">KORYLA_API_KEY</code> (Fase 04).</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <code class="flex-1 text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 font-mono text-gray-800 break-all select-all">{{ newKey }}</code>
          <button class="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 px-3 py-2 border border-amber-200 rounded-lg bg-white transition-colors"
            @click="copyKey">
            {{ copied ? '✓ Copied' : 'Copy' }}
          </button>
        </div>
        <button class="text-xs text-amber-600 hover:text-amber-800 underline" @click="dismissKey">
          I've saved it, dismiss
        </button>
      </div>

      <div class="divide-y divide-gray-100">
        <div v-if="!keys?.length" class="px-6 py-8 text-center text-sm text-gray-400">No API keys yet.</div>
        <div v-for="key in keys" :key="key.id" class="px-6 py-3.5 flex items-center gap-3">
          <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <code class="text-sm font-mono text-gray-700">{{ key.key_prefix }}••••••••</code>
            <p class="text-xs text-gray-400 mt-0.5">
              Created {{ formatDate(key.created_at) }}
              <span v-if="key.last_used_at"> · Last used {{ formatDate(key.last_used_at) }}</span>
              <span v-else> · Never used</span>
            </p>
          </div>
          <button v-if="isOwner" class="text-xs text-red-400 hover:text-red-600 transition-colors" @click="deleteKey(key.id)">
            Delete
          </button>
        </div>
      </div>
    </section>

    <!-- Members -->
    <section class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-900">Members</h2>
      </div>
      <div class="divide-y divide-gray-100">
        <div v-for="member in members" :key="member.id" class="px-6 py-3.5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style="background: linear-gradient(135deg, #C96A3F, #0F2235);">
            <span class="text-white text-xs font-semibold">{{ member.email?.[0]?.toUpperCase() }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800 truncate">{{ member.email }}</p>
            <p class="text-xs text-gray-400 capitalize">{{ member.role }}</p>
          </div>
          <button v-if="isOwner && member.role !== 'owner'"
            class="text-xs text-red-400 hover:text-red-600 transition-colors"
            @click="removeMember(member.id)">
            Remove
          </button>
          <span v-else-if="member.role === 'owner'"
            class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Owner</span>
        </div>
      </div>

      <!-- Invite -->
      <div v-if="isOwner" class="px-6 py-5 border-t border-gray-100 bg-gray-50">
        <p class="text-sm font-medium text-gray-700 mb-3">Invite a member</p>
        <div class="flex gap-2">
          <input v-model="inviteEmail" type="email" placeholder="colleague@company.com"
            class="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F]" />
          <select v-model="inviteRole"
            class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] bg-white">
            <option value="member">Member</option>
            <option value="readonly">Read-only</option>
          </select>
          <button :disabled="inviting || !inviteEmail"
            class="bg-[#C96A3F] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#A8522D] disabled:opacity-40 transition-colors shrink-0"
            @click="sendInvite">
            {{ inviting ? '…' : 'Invite' }}
          </button>
        </div>
        <p v-if="inviteError" class="text-xs text-red-600 mt-2">{{ inviteError }}</p>

        <div v-if="inviteLink" class="mt-3 p-3 bg-white border border-[#F0C9B0] rounded-xl">
          <p class="text-xs text-gray-500 mb-1.5">Share this invite link (expires in 7 days):</p>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-xs text-gray-700 truncate">{{ inviteLink }}</code>
            <button class="text-xs text-[#C96A3F] font-medium shrink-0" @click="copyInvite">Copy</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Analytics destinations -->
    <section class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-gray-900">Analytics destinations</h2>
            <p class="text-xs text-gray-500 mt-1 leading-relaxed max-w-md">Connect GA4, PostHog or any analytics tool to see your experiment results alongside the rest of your data — conversions, funnels, retention. Koryla sends events server-side, so your API secrets never reach the browser.</p>
          </div>
          <button
            class="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors shrink-0"
            @click="showDestinationForm = !showDestinationForm"
          >+ Add</button>
        </div>
      </div>

      <!-- Add form -->
      <div v-if="showDestinationForm" class="px-6 py-5 border-b border-gray-100 bg-gray-50 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
          <select v-model="newProvider" class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C96A3F] bg-white">
            <option v-for="p in PROVIDERS" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </div>
        <div v-for="field in activeProviderFields" :key="field.key">
          <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ field.label }}</label>
          <input
            v-model="newConfig[field.key]"
            :placeholder="field.placeholder"
            class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C96A3F] font-mono placeholder:font-sans placeholder:text-gray-400"
          />
          <p v-if="field.hint" class="text-xs text-gray-400 mt-1.5">{{ field.hint }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            :disabled="savingDestination"
            class="bg-[#C96A3F] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A8522D] disabled:opacity-40 transition-colors"
            @click="saveDestination"
          >{{ savingDestination ? 'Saving…' : 'Save destination' }}</button>
          <button class="text-sm text-gray-500 hover:text-gray-700" @click="showDestinationForm = false">Cancel</button>
        </div>
      </div>

      <!-- List -->
      <div v-if="destinations?.length" class="divide-y divide-gray-100">
        <div v-for="dest in destinations" :key="dest.id" class="px-6 py-3.5 flex items-center gap-3">
          <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
            <div class="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800">{{ providerLabel(dest.provider) }}</p>
            <p class="text-xs text-gray-400 font-mono truncate">{{ Object.entries(dest.config).map(([k, v]) => `${k}: ${String(v).slice(0, 14)}…`).join(' · ') }}</p>
          </div>
          <button
            :disabled="deletingDestId === dest.id"
            class="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
            @click="deleteDestination(dest.id)"
          >{{ deletingDestId === dest.id ? '…' : 'Remove' }}</button>
        </div>
      </div>
      <div v-else-if="!showDestinationForm" class="px-6 py-5 text-sm text-gray-400">
        No analytics destinations yet.
      </div>
    </section>

    <!-- Danger zone -->
    <section v-if="isOwner" class="bg-white border border-red-100 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-red-100">
        <h2 class="text-sm font-semibold text-red-600">Danger zone</h2>
      </div>
      <div class="px-6 py-5 space-y-4">
        <div>
          <p class="text-sm font-medium text-gray-700">Delete workspace</p>
          <p class="text-xs text-gray-400 mt-0.5">Permanently deletes this workspace, all experiments, variants, events and API keys. This cannot be undone.</p>
        </div>

        <div v-if="currentWorkspace?.stripe_subscription_id" class="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p class="text-xs text-amber-700">You have an active subscription on this workspace. Deleting it will cancel your plan immediately — you might want to <a :href="`/dashboard/${slug}/billing`" class="underline font-medium">downgrade first</a> instead.</p>
        </div>

        <div>
          <label class="block text-xs text-gray-500 mb-1.5">Type <span class="font-mono font-semibold text-gray-700">{{ currentWorkspace?.name }}</span> to confirm</label>
          <input
            v-model="deleteConfirmName"
            type="text"
            :placeholder="currentWorkspace?.name"
            class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <button
          :disabled="!canConfirmDelete || deleteLoading"
          class="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          @click="deleteWorkspace"
        >{{ deleteLoading ? 'Deleting…' : 'Delete workspace' }}</button>
      </div>
    </section>

    <!-- Demo workspace -->
    <section class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-900">Demo workspace</h2>
        <p class="text-xs text-gray-400 mt-0.5">A read-only workspace with real experiments running on <span class="font-mono">astro-demo.koryla.com</span></p>
      </div>
      <div class="px-6 py-5 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700">Show in sidebar</p>
          <p class="text-xs text-gray-400 mt-0.5">When you're familiar with Koryla, you can hide it to keep the sidebar clean.</p>
        </div>
        <button
          :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none', showDemo ? 'bg-[#C96A3F]' : 'bg-gray-200']"
          @click="toggleDemo(!showDemo)"
        >
          <span :class="['inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', showDemo ? 'translate-x-6' : 'translate-x-1']" />
        </button>
      </div>
    </section>

  </div>
</template>
