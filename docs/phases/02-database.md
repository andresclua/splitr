# Phase 02 — Database

## Overview

Defines the Supabase Postgres schema for the entire Splitr platform. All persistent data (workspaces, users, experiments, variants, events, API keys, analytics destinations) is stored in Supabase. Row Level Security (RLS) is not yet explicitly written in the schema file but is assumed at the application layer through service-role key usage in Nitro server routes.

Schema file: `app/db/schema.sql`

---

## Why

**Supabase over plain Postgres:** Supabase provides Postgres + Auth + RLS + a JS SDK in one managed service. The `@nuxtjs/supabase` module integrates tightly with it, providing `serverSupabaseUser(event)` for Nitro routes and `useSupabaseClient()` / `useSupabaseUser()` for Vue components. Setting up this from scratch (Postgres + JWT auth + row security) would add significant ops overhead.

**Service key in Nitro routes:** All server-side API routes use `createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)` rather than the user-scoped client. This gives full database access bypassing RLS, and allows the server to enforce authorization logic in application code (membership checks, role checks) rather than relying on Postgres policies alone. The service key is never exposed to the client.

**UUIDs as primary keys:** All tables use `uuid primary key default gen_random_uuid()`. This is idiomatic Supabase and avoids sequential ID enumeration attacks on public-facing API endpoints.

---

## What Was Built

File: `app/db/schema.sql` — applied manually via the Supabase SQL editor.

### Tables

**`workspaces`**
Core tenant entity. A workspace corresponds to an organization or project.
- `slug` — unique URL-safe identifier used in all dashboard routes (`/dashboard/[slug]/*`)
- `domain` — optional company domain (e.g. `acme.com`) for auto-join by email
- `auto_join_domain` — if true, new users with a matching email domain are offered to join
- `plan` — `free | pro | agency+` (Stripe-managed)
- `stripe_customer_id`, `stripe_subscription_id` — Stripe billing integration hooks
- `trial_ends_at` — free trial window
- `custom_domain`, `custom_logo_url` — white-label fields for agency+ plan

**`workspace_members`**
Join table: many users per workspace, unique per `(workspace_id, user_id)`.
- `role` — `owner | member | readonly`
- References `auth.users` (Supabase auth schema) and `workspaces`

**`domain_join_requests`**
When a user signs up with a domain that matches an existing workspace but `auto_join_domain` is false, a join request is created.
- `status` — `pending | approved | rejected`

**`api_keys`**
M2M authentication for the Cloudflare Worker and plugin adapters.
- `key_hash` — SHA-256 hash of the raw key (`sk_live_...`). The raw key is shown once at creation and never stored.
- `key_prefix` — first 16 characters of the raw key, shown in the dashboard for identification
- `last_used_at` — updated fire-and-forget on each `/api/worker/config` request

**`analytics_destinations`**
Per-workspace analytics integrations. One row per provider.
- `provider` — `ga4 | posthog | plausible | mixpanel | amplitude | segment | rudderstack | webhook`
- `config` — `jsonb` with provider-specific credentials (e.g. `{ measurement_id, api_secret }` for GA4)
- Unique constraint on `(workspace_id, provider)` — one destination per provider per workspace

**`usage_monthly`**
Tracks visit counts per workspace per calendar month for plan enforcement.
- `month` — string format `YYYY-MM` (e.g. `2025-04`)
- `visits_count` — incremented on each experiment assignment

**`experiments`**
The core entity. One experiment = one URL being tested.
- `status` — `draft | active | paused | completed`
- `base_url` — full URL of the page being tested (e.g. `https://acme.com/pricing`). Pathname is used for matching in the worker/adapters.
- `conversion_url` — optional URL to track as a conversion event
- `started_at`, `ended_at` — set automatically when status transitions

**`variants`**
Each experiment has 2+ variants.
- `traffic_weight` — integer. Weights don't need to sum to 100, but the dashboard enforces a sum of 100 for clarity. Weighted random selection in the worker/core handles any positive integers.
- `target_url` — full URL to rewrite to (e.g. `https://acme.com/pricing-v2`)
- `is_control` — marks the original/baseline variant

**`events`**
Impression and conversion events. Currently inserted by the worker/adapters via the Splitr API.
- `event_type` — `impression | conversion | custom`
- `session_id` — the variant cookie value, used to correlate impressions with conversions
- `metadata` — `jsonb` for custom event properties

**`workspace_invites`**
Email-based team invitations.
- `token` — unique random hex string, included in the invite email link
- `expires_at` — invite links expire (set to 7 days at creation)
- `accepted_at` — nullable, set when the invite is accepted

### Indexes

```sql
create index on workspaces (domain);
create index on events (experiment_id, variant_id, event_type);
create index on events (workspace_id, created_at);
```

The `workspaces(domain)` index is critical for the domain-matching lookup during onboarding. The `events` indexes support the analytics queries that will aggregate results per experiment.

---

## Key Decisions

**No RLS policies in `schema.sql` (yet):** All server routes use the service key, which bypasses RLS entirely. This is acceptable for the current phase where all authorization is enforced in application code. Adding RLS would be a security hardening step before production launch.

**`key_hash` stores SHA-256, not bcrypt:** API keys are long random secrets (`sk_live_` + 48 hex chars = 56 characters of entropy). SHA-256 is sufficient for this — bcrypt is designed for low-entropy passwords. SHA-256 is also much faster, which matters because the worker config endpoint is called on every cache miss.

**`traffic_weight` as integer:** Stored as integer, validated to sum to 100 in the API layer. The worker's weighted random algorithm works with any positive integers, so this is a UI convention, not a database constraint.

**`variants` not versioned:** Variants are mutable. If a variant's `target_url` changes while an experiment is running, users with existing cookies will be served the new URL. This is a known limitation — variant changes during active experiments should be avoided.

---

## How to Reproduce

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to SQL Editor → New query.
3. Paste the contents of `app/db/schema.sql` and run.
4. Copy the Project URL and `anon` key to `.env`:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...  # Settings > API > service_role key
   ```
5. The `@nuxtjs/supabase` module picks up `SUPABASE_URL` and `SUPABASE_ANON_KEY` automatically from the environment.

---

## Known Issues / Gotchas

**`auth.users` foreign key:** `workspace_members.user_id` and other tables reference `auth.users(id)`, which is in Supabase's internal `auth` schema. This means you cannot inspect these foreign keys from the Supabase table editor UI directly — they work fine at the Postgres level but the UI may show them as "broken" references.

**`domain_join_requests` not fully wired:** The table exists in the schema, but the full approval/rejection flow in the dashboard is not yet implemented beyond the onboarding check that detects a matching domain and creates the request.

**`usage_monthly` not auto-incremented yet:** The table exists for future plan enforcement but the worker/adapter analytics path does not currently increment `visits_count`. This is a future billing integration task.

**Running migrations:** There is no migration tool set up (no Drizzle, no Supabase CLI migrations). Schema changes are applied manually via the SQL editor. For future work, `supabase db push` via the Supabase CLI should be introduced.
