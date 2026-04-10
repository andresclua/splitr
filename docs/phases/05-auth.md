# Phase 05 — Authentication

## Overview

Implements user authentication for the Koryla dashboard using Supabase Auth with Google OAuth as the primary sign-in method. The flow uses Supabase's `implicit` flow type, which returns tokens in the URL hash fragment after OAuth redirect. A dedicated `/confirm` page handles all token parsing and session establishment.

Relevant files:
- `app/nuxt.config.ts` — Supabase module configuration
- `app/pages/confirm.vue` — Token parsing and session establishment
- `app/pages/login.vue` — Login page (Google OAuth button)
- `app/pages/signup.vue` — Signup page
- `app/pages/onboarding.vue` — Post-auth workspace creation
- `app/middleware/` — Route guards
- `app/server/api/auth/domain-check.post.ts` — Domain-matching check for workspace auto-join

---

## Why

**Supabase Auth over Auth.js / Clerk / custom JWT:** Supabase Auth is already a dependency (same service as the database), so there is no additional service to manage. It supports Google OAuth out of the box, has a well-maintained Nuxt module, and provides server-side helpers (`serverSupabaseUser`) for Nitro routes.

**Implicit flow over PKCE:** The `@nuxtjs/supabase` module's PKCE flow requires a server-side callback handler that exchanges the authorization code. Nuxt 4's app/server split and the Netlify deployment introduced complications with the callback URL handling. The implicit flow delivers tokens directly in the URL hash after OAuth redirect, avoiding the server round-trip. The downside is that tokens are briefly visible in the URL hash (mitigated by the fact that hashes are never sent to the server).

**Manual hash token parsing on `/confirm`:** This is the most significant implementation detail of this phase. See "Known Issues" for context.

---

## What Was Built

### Supabase module config (`nuxt.config.ts`)

```ts
supabase: {
  redirect: false,   // disable automatic redirect — manual control in middleware
  redirectOptions: {
    login: '/login',
    callback: '/confirm',     // Supabase redirects here after OAuth
    exclude: ['/signup', '/login', '/verify-email'],
  },
  clientOptions: {
    auth: {
      flowType: 'implicit',   // tokens in URL hash, not query string code
    },
  },
},
```

**`redirect: false`:** The module's automatic redirect logic caused race conditions with the manual session handling. Disabling it gives full control over when and where redirects happen.

### `/confirm` page (`app/pages/confirm.vue`)

This page is the OAuth callback destination. It handles four possible incoming parameter formats:

**1. Error from Supabase:**
```
/confirm?error=access_denied&error_description=...
```
Displays the error message to the user.

**2. OTP token_hash (email verification):**
```
/confirm?token_hash=xxxx&type=signup
```
Calls `supabase.auth.verifyOtp({ token_hash, type })`.

**3. Authorization code (PKCE fallback):**
```
/confirm?code=xxxx
```
Calls `supabase.auth.exchangeCodeForSession(code)`.

**4. Implicit flow hash tokens (Google OAuth):**
```
/confirm#access_token=eyJ...&refresh_token=eyJ...&token_type=bearer&...
```
Parsed manually:
```ts
const hash = window.location.hash.substring(1)
const hashParams = new URLSearchParams(hash)
const accessToken = hashParams.get('access_token')
const refreshToken = hashParams.get('refresh_token')
await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
```

After any successful session establishment, the page redirects to `/dashboard`.

A `watch(user, ...)` with `{ immediate: true }` handles the case where the Supabase module has already parsed and set the session before `onMounted` runs (e.g. on page refresh with a valid stored session).

### `definePageMeta({ ssr: false })`

The confirm page is explicitly marked as client-side only (`ssr: false`). Hash fragments (`#...`) are never sent to the server — they exist only in the browser. SSR rendering of this page would see an empty hash and fail to extract tokens.

### Google OAuth setup (external — Supabase dashboard + Google Cloud Console)

1. In Google Cloud Console: create OAuth 2.0 credentials, set authorized redirect URIs to `https://<project>.supabase.co/auth/v1/callback`
2. In Supabase dashboard → Authentication → Providers → Google: paste Client ID and Client Secret
3. In Supabase dashboard → Authentication → URL Configuration:
   - Site URL: `https://koryla-dev.netlify.app`
   - Redirect URLs: `https://koryla-dev.netlify.app/confirm`, `http://localhost:3000/confirm`

### Login trigger

```ts
const supabase = useSupabaseClient()
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/confirm`,
  },
})
```

---

## Key Decisions

**`/confirm` as universal callback handler:** Rather than separate pages for email verification, OAuth callback, and PKCE code exchange, all token types are handled in one page with a priority waterfall (error → token_hash → code → hash). This simplifies the Supabase redirect URL configuration.

**`setSession()` instead of relying on auto-detection:** The `@nuxtjs/supabase` module's auto-session-from-hash logic did not reliably fire in all cases during development (see Known Issues). Calling `setSession()` explicitly with the parsed tokens is deterministic and testable.

**Extensive `console.log` in `/confirm`:** The page has detailed logging (`[confirm] mounted`, `[confirm] user watcher`, etc.) left intentionally during development to diagnose auth flow issues. These should be removed before production.

---

## How to Reproduce

1. Create Supabase project, run schema.sql.
2. In Supabase dashboard → Authentication → Providers → Google: enable and paste credentials.
3. In Supabase dashboard → URL Configuration:
   - Site URL: your deployed URL
   - Redirect URLs: add `<your-url>/confirm` and `http://localhost:3000/confirm`
4. Set environment variables:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...
   ```
5. In `nuxt.config.ts`: set `flowType: 'implicit'` and `callback: '/confirm'`.
6. Create `/confirm` page with the hash token parsing logic.

---

## Known Issues / Gotchas

**Why manual hash parsing was necessary:** The `@nuxtjs/supabase` module version used (`^1.4.6`) has a built-in `onMounted` hook in its plugin that attempts to detect and process hash tokens. However, in the Nuxt 4 / implicit flow combination, this detection did not reliably call `setSession()` before the `/confirm` page's own `onMounted` ran — resulting in the user landing on the confirm page without a session being set, and then being redirected to `/login`. The fix was to disable the module's redirect handling (`redirect: false`) and implement the full token parsing pipeline manually on the `/confirm` page.

**Hash fragments and SSR:** Hash fragments are a browser-only concept — the server never sees them. Any SSR rendering of `/confirm` will see an empty hash. The `definePageMeta({ ssr: false })` is mandatory for this page.

**Token leakage in browser history:** With the implicit flow, `access_token` and `refresh_token` appear in `window.location.hash`. The browser's Back button can navigate back to the URL with tokens visible. After calling `setSession()`, navigating with `replace: true` (`navigateTo('/dashboard', { replace: true })`) removes the confirm page from history, which also clears the tokens from the browser's address bar.

**Google OAuth COOP headers on localhost:** Chrome may show a COOP (Cross-Origin-Opener-Policy) warning when Google OAuth redirects back to localhost. This is a browser security feature and doesn't affect functionality — the OAuth flow completes normally.

**`serverSupabaseUser` requires valid JWT:** All authenticated Nitro routes call `serverSupabaseUser(event)`, which validates the Supabase JWT from the `Authorization` header. The `@nuxtjs/supabase` module automatically attaches the current session's access token to server route calls made from the client via `useFetch` or `$fetch`. If the token is expired or missing, `serverSupabaseUser` returns `null` and the route returns 401.
