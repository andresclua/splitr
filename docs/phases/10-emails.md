# Phase 10 — Onboarding Emails (Resend)

## Goal
Send transactional emails for key lifecycle events using [Resend](https://resend.com).

## Stack
- **Provider**: Resend REST API (called directly via `fetch`, no SDK dependency)
- **From address**: `onboarding@resend.dev` (shared Resend domain, no custom domain needed)
- **Env var**: `RESEND_API_KEY` — must be set in Netlify environment variables

## Files

| File | Purpose |
|------|---------|
| `app/server/utils/resend.ts` | Thin send() wrapper + email templates |
| `app/server/api/workspaces/index.post.ts` | Sends welcome email after workspace creation |
| `app/server/api/workspaces/[slug]/invites/index.post.ts` | Sends invite email after invite is created |

## Emails

### Welcome email
- **Trigger**: New workspace created (first workspace per user during onboarding)
- **To**: The user's email (`email` param from request body)
- **Subject**: `Welcome to Koryla`
- **Content**: Workspace name, CTA to open dashboard, quick start checklist

### Invite email
- **Trigger**: Workspace owner sends a team invite
- **To**: The invited email address
- **Subject**: `{inviterName} invited you to {workspaceName} on Koryla`
- **Content**: Inviter name, workspace name, accept invitation button linking to `/invite/{token}`, 7-day expiry note

## Design decisions
- Emails are fire-and-forget (`sendX().catch(console.error)`) — a failed email never breaks the API response
- If `RESEND_API_KEY` is missing, a warning is logged and the email is silently skipped (useful in local dev)
- HTML is inline-styled for maximum email client compatibility
- Inviter name uses `user.user_metadata.full_name` (set by Google OAuth) with fallback to email

## Custom domain (future)
When `koryla.io` DNS is configured, add a Resend domain and change `FROM` in `resend.ts` to:
```
Koryla <hello@koryla.io>
```
