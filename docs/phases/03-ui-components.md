# Phase 03 — UI Components

## Overview

Implements two shared UI primitives used throughout the Koryla dashboard: `AppToast` (non-blocking status notifications) and `AppConfirm` (replacement for the browser's native `confirm()` dialog). Both are composable-driven, rendered via Vue's `Teleport`, and animated with `Transition`/`TransitionGroup`.

These components are registered globally through Nuxt's auto-import system and placed in `app/components/`. Their state composables live in `app/composables/`.

---

## Why

**Replacing native browser `alert()`/`confirm()`:** Browser-native dialogs block the JS thread, are unstyleable, and look inconsistent across OS/browsers. In a product dashboard where destructive actions (delete experiment, remove team member) and status feedback (experiment activated, API key copied) are frequent, custom components are non-negotiable for UX quality.

**Composable state over Pinia/Vuex:** Both components manage global singleton state via Nuxt's `useState()`. This keeps the implementation self-contained — no store setup, no module registration. `useState` in Nuxt is SSR-safe (shared state across server/client hydration), though both components are only used client-side in the `/dashboard/**` SPA section.

**Teleport to `<body>`:** Both components are mounted at the bottom of `<body>` regardless of where they are used in the component tree. This prevents z-index stacking context issues — a toast or confirm dialog should always render above all other content.

---

## What Was Built

### `app/composables/useToast.ts`

```ts
export const useToast = () => {
  const toasts = useState<Toast[]>('toasts', () => [])

  const show = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2, 10)
    toasts.value.push({ id, type, message })
    setTimeout(() => dismiss(id), 4000)   // auto-dismiss after 4s
  }

  return {
    toasts,
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
    info:    (msg) => show(msg, 'info'),
    warning: (msg) => show(msg, 'warning'),
    dismiss,
  }
}
```

**Toast shape:**
```ts
interface Toast {
  id: string        // random 8-char alphanumeric
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}
```

**Usage anywhere in the app:**
```ts
const toast = useToast()
toast.success('Experiment activated')
toast.error('Failed to save changes')
```

### `app/components/AppToast.vue`

- Rendered via `<Teleport to="body">` — always mounted at document root
- `<TransitionGroup>` animates each toast in/out independently:
  - Enter: `opacity-0 translate-y-2 scale-95` → `opacity-100 translate-y-0 scale-100` (300ms ease-out)
  - Leave: reverse (200ms ease-in)
- Stacks toasts vertically from bottom-right (`fixed bottom-4 right-4 flex flex-col gap-2`)
- Each toast has: colored icon (SVG path per type), message text, manual dismiss button
- Color mapping:
  - `success` → green-50 bg, green-200 border, green-800 text
  - `error` → red-50 bg, red-200 border, red-800 text
  - `warning` → amber-50 bg, amber-200 border, amber-800 text
  - `info` → blue-50 bg, blue-200 border, blue-800 text
- The toast container has `pointer-events-none` but individual toasts have `pointer-events-auto` — this lets clicks pass through the container to the page while still allowing interaction with visible toasts

### `app/composables/useConfirm.ts`

```ts
interface ConfirmState {
  open: boolean
  options: ConfirmOptions
  resolve: ((val: boolean) => void) | null
}

const ask = (options: ConfirmOptions): Promise<boolean> =>
  new Promise(resolve => {
    state.value = { open: true, options, resolve }
  })
```

The `ask()` function returns a Promise that resolves to `true` (confirmed) or `false` (cancelled). This mirrors the native `confirm()` API but is async:

```ts
const confirm = useConfirm()
const ok = await confirm.ask({
  title: 'Delete experiment?',
  message: 'This action cannot be undone.',
  variant: 'danger',
  confirmText: 'Delete',
})
if (ok) { /* proceed */ }
```

**ConfirmOptions:**
```ts
interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string   // default: 'Confirm'
  cancelText?: string    // default: 'Cancel'
  variant?: 'danger' | 'default'
}
```

### `app/components/AppConfirm.vue`

- `<Teleport to="body">` + `<Transition>` for backdrop fade
- Inner dialog also has its own `<Transition>` for scale animation (`scale-95` → `scale-100`)
- Backdrop: `bg-black/40 backdrop-blur-sm`, click outside → `cancel()`
- Confirm button: `bg-red-600` when `variant === 'danger'`, `bg-blue-600` otherwise
- Both `AppToast` and `AppConfirm` are placed once in `app/app.vue` (or the root layout) — they don't need to be added per-page

---

## Key Decisions

**`useState` key as singleton identifier:** `useState('toasts', ...)` and `useState('confirm', ...)` use fixed string keys. This means any component calling `useToast()` accesses the same reactive array. Multiple calls to `useToast()` don't create separate instances.

**Auto-dismiss at 4000ms:** The 4-second timer is set on `show()` and references the toast by `id`. If the user manually dismisses a toast before 4s, the `dismiss()` call in the setTimeout is a no-op (it filters on id, and the toast is already gone).

**Promise-based confirm:** Storing the `resolve` function in component state allows the modal to close and resolve the promise when the user interacts. This is a common pattern for async dialog APIs. The `resolve` ref is `null` when no dialog is open — callers must always `await ask()`.

**No animation library:** All animations use Tailwind utility classes with Vue's `Transition`/`TransitionGroup`. This keeps the bundle small and avoids a dependency on `@vueuse/motion` or similar.

---

## How to Reproduce

1. Create `app/composables/useToast.ts` with `useState<Toast[]>('toasts', ...)`.
2. Create `app/components/AppToast.vue` with `<Teleport to="body">` and `<TransitionGroup>`.
3. Create `app/composables/useConfirm.ts` with Promise-based `ask()`.
4. Create `app/components/AppConfirm.vue` with `<Teleport to="body">`.
5. Add both components to the root layout:
   ```vue
   <!-- app/app.vue or layouts/default.vue -->
   <template>
     <NuxtPage />
     <AppToast />
     <AppConfirm />
   </template>
   ```
6. Use in any page:
   ```ts
   const toast = useToast()
   const confirm = useConfirm()
   ```

---

## Known Issues / Gotchas

**SSR and `Teleport`:** `<Teleport to="body">` requires a DOM target. In SSR contexts this can cause hydration mismatches. Both components are only used inside `/dashboard/**` which is `{ ssr: false }`, so this is not an issue in practice.

**Multiple `setTimeout` per toast:** Each call to `show()` creates a new `setTimeout`. If the same message is shown multiple times rapidly, each toast gets its own timer. There is no deduplication logic — identical messages shown in quick succession will stack.

**`resolve` leaks if component unmounts:** If the root layout is somehow unmounted while a confirm dialog is open, the Promise will never resolve. In practice this doesn't occur because `AppConfirm` is in the root layout, which is never unmounted during normal navigation.
