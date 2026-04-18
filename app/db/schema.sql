-- Koryla database schema
-- Run this in your Supabase SQL editor

-- Workspaces
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  domain text,                          -- 'acme.com' for domain matching
  auto_join_domain boolean default false,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_period text default 'monthly',
  trial_ends_at timestamptz,
  custom_domain text,                   -- white-label (agency+)
  custom_logo_url text,
  is_demo boolean default false,        -- demo workspace shown to all users as read-only
  created_at timestamptz default now()
);
create index on workspaces (domain);

-- Workspace members
create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',  -- owner | member | readonly
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Domain join requests
create table domain_join_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  status text default 'pending',        -- pending | approved | rejected
  created_at timestamptz default now()
);

-- API Keys (hashed)
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  key_hash text unique not null,
  key_prefix text not null,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

-- Analytics destinations (per workspace)
create table analytics_destinations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  provider text not null,               -- ga4 | posthog | plausible | mixpanel | amplitude | segment | rudderstack | webhook
  enabled boolean default true,
  config jsonb not null,                -- provider-specific keys/tokens
  created_at timestamptz default now(),
  unique(workspace_id, provider)
);

-- Monthly usage
create table usage_monthly (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  month text not null,                  -- '2025-04'
  visits_count integer default 0,
  unique(workspace_id, month)
);

-- Experiments
create table experiments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'draft', -- draft | active | paused | completed
  type text not null default 'edge',   -- edge | component
  base_url text not null,
  conversion_url text,
  created_at timestamptz default now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- Variants
create table variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid references experiments(id) on delete cascade,
  name text not null,
  description text,
  traffic_weight integer not null default 50,
  target_url text not null,
  is_control boolean default false,
  created_at timestamptz default now()
);

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  experiment_id uuid references experiments(id),
  variant_id uuid references variants(id),
  session_id text not null,
  event_type text not null,             -- impression | conversion | custom
  metadata jsonb,
  created_at timestamptz default now()
);
create index on events (experiment_id, variant_id, event_type);
create index on events (workspace_id, created_at);

-- Waitlist (landing page signups)
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table waitlist enable row level security;

-- Workspace invites
create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  email text not null,
  token text unique not null,
  role text not null default 'member',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz default now()
);

-- Atomic impression counter increment (run in Supabase SQL editor)
create or replace function increment_monthly_impressions(p_workspace_id uuid, p_month text)
returns void language plpgsql as $$
begin
  insert into usage_monthly (workspace_id, month, visits_count)
  values (p_workspace_id, p_month, 1)
  on conflict (workspace_id, month)
  do update set visits_count = usage_monthly.visits_count + 1;
end;
$$;
