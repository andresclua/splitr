# New Experiment Page — Progressive Builder Design

**Date:** 2026-04-17

## Summary

Replace the current "New experiment" slide-over modal with a dedicated page at `/dashboard/[slug]/experiments/new`. The page uses a progressive builder pattern: nodes appear and expand one at a time as the user completes each step, forming a visible pipeline from top to bottom. A live mini-preview on the right always reflects current progress. On successful creation, the user is redirected to the experiment detail page.

---

## Architecture

Single new Vue SFC at `app/pages/dashboard/[slug]/experiments/new.vue`. No new components needed — all nodes are inline template blocks using Tailwind. The existing experiment creation logic (`POST /api/workspaces/[slug]/experiments`) is reused unchanged. The "New experiment" button in the experiments list page is updated to navigate to this route instead of opening a modal.

---

## Layout

```
┌─────────────── page header ────────────────────┐
│ ← Back to experiments  |  New experiment        │
├───────────────────────┬────────────────────────┤
│   BUILDER (55%)       │   MINI PREVIEW (45%)   │
│                       │                         │
│  ┌─────────────────┐  │  🌐 acme.com            │
│  │ ✓ 🌐 Traffic    │  │       ↓                 │
│  └────────┬────────┘  │  🔀 Homepage test       │
│           ↓           │       ↓                 │
│  ┌─────────────────┐  │  ⚪ CTL  🟠 B           │
│  │ 🔀 Experiment   │  │       ↓                 │
│  │ [name field]    │  │  🎯 Goal?               │
│  │ [type select]   │  │                         │
│  │ [Confirm →]     │  │                         │
│  └────────┬────────┘  │                         │
│           ↓           │                         │
│  ┌─────────────────┐  │                         │
│  │ (pending...)    │  │                         │
│  └─────────────────┘  │                         │
└───────────────────────┴────────────────────────┘
```

The header is `shrink-0`. The split area fills `flex-1 min-h-0 overflow-hidden`. Each column is `overflow-y-auto`.

---

## The Four Nodes

### 1. Traffic (always expanded first)

**Fields:**
- Base URL (text input, required) — e.g. `https://acme.com/pricing`

**Confirm action:** validates URL is non-empty, collapses to summary showing the URL, unlocks node 2.

**Collapsed summary:** `🌐 acme.com/pricing`

---

### 2. Experiment

**Fields:**
- Experiment name (text input, required)
- Type (select: `Edge (Worker / Middleware)` | `Client-side`) — maps to `edge` | `client` values

**Confirm action:** validates name is non-empty, collapses to summary, unlocks node 3.

**Collapsed summary:** `🔀 [name] · [type]`

---

### 3. Variants

**Structure:**
- Control row — always present, read-only label "⚪ CONTROL", URL field pre-filled and disabled (inherits base URL from node 1), weight input defaulting to `50`
- One initial variant row (Variant B) — URL input + weight input
- "+ Add variant" button — appends a new variant row (C, D, …) with auto-calculated equal weights
- Weights auto-balance: when any weight changes, the remaining variants split the leftover equally; total must equal 100 before confirming

**Confirm action:** validates all variant URLs are non-empty and weights sum to 100, collapses to summary, unlocks node 4 and shows "Create experiment" button.

**Collapsed summary:** `⚪ 50% · 🟠 B 50%` (adapts to N variants)

**No hard limit on number of variants.** The user can add as many as needed.

---

### 4. Conversion Goal (optional)

**Fields:**
- Conversion URL (text input) — the URL the SDK fires a conversion event for

**No "Confirm" — instead, two buttons:**
- "Skip" — leaves conversion goal empty
- "Create experiment" — includes the conversion URL

When node 3 is confirmed, this node expands automatically. The "Create experiment" button also appears below node 3's collapsed state so users who skipped node 4 earlier can still submit.

**Collapsed summary (if filled):** `🎯 [url]`

---

## Node Interaction Rules

- **Active node:** expanded, shows form fields + "Confirm →" button (or Skip/Create for node 4)
- **Completed node:** collapsed, shows icon + summary text + green ✓ badge; **clickable** — clicking re-expands and collapses all nodes after it (they reset to pending state so the user can re-confirm from that point)
- **Pending node:** shown as a dashed placeholder pill with muted text, not clickable

Re-editing an earlier node: if the user clicks node 2 (Experiment) after nodes 3 and 4 were confirmed, nodes 3 and 4 revert to pending. The user must re-confirm them. Their previously entered values are preserved in reactive state — they are not cleared.

---

## Mini Preview (right column)

Always visible. Shows the current flow state as stacked pill badges:

```
🌐 acme.com/pricing          ← green when confirmed
      ↓
🔀 Homepage test              ← orange when confirmed, ghost when pending
      ↓
⚪ CTL   🟠 B                 ← side-by-side variant pills
      ↓
🎯 Goal?                      ← dashed when pending/skipped
```

Updates reactively as the user types or confirms steps. The traffic URL shows only the hostname once confirmed.

---

## API & Data

**Endpoint used:** `POST /api/workspaces/[slug]/experiments` (existing, unchanged)

**Payload:**
```typescript
{
  name: string
  base_url: string
  type: 'edge' | 'component'
  conversion_url?: string
  variants: Array<{
    name: string        // "Control", "Variant B", "Variant C", ...
    url?: string        // omitted for control
    weight: number      // integer percentage, e.g. 50
  }>
}
```

**On success:** `navigateTo(`/dashboard/${slug}/experiments/${createdId}`)` — direct redirect to the detail page.

**On error:** toast notification with the error message (reuse existing `useToast()`).

---

## Navigation

- Page header has a `← All experiments` back link (same pattern as `[id].vue`)
- The "New experiment" button/link in `app/pages/dashboard/[slug]/experiments/index.vue` is changed from opening a modal to `navigateTo('/dashboard/[slug]/experiments/new')` (using `NuxtLink` or `useRouter().push`)
- The existing modal slide-over for new experiments is removed from the experiments list page

---

## What Is NOT Changed

- The `POST` API endpoint and its validation logic
- The experiment detail page (`[id].vue`)
- The experiments list page layout (only the button target changes)
- `useWorkspace`, `useToast`, `definePageMeta` patterns
- Auth/middleware setup

---

## Visual Style

Follows existing project conventions:

| Element | Style |
|---|---|
| Active node border | `border-[#C96A3F]` + `shadow-sm` |
| Confirmed node border | `border-green-500 bg-green-50` |
| Pending node | `border-dashed border-gray-300 bg-gray-50 text-gray-400` |
| ✓ badge | `bg-green-500` circle top-right |
| Confirm button | `bg-[#C96A3F] text-white` |
| Add variant button | `border-dashed border-[#C96A3F] text-[#C96A3F]` |
| Preview pills (confirmed) | green / orange background |
| Preview pills (pending) | `border-dashed border-gray-300 text-gray-400` |
| Connector arrow | 2px gray vertical line + triangle arrowhead (CSS-only) |
