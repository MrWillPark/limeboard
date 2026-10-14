-- Burn spike push: device tokens, opt-in Pro monitor keys, rate sample history

create table if not exists public.push_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expo_push_token text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.burn_alert_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  monitor_key_ciphertext text,
  last_usage_daily double precision,
  last_sampled_at timestamptz,
  last_fired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.burn_rate_samples (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  per_second double precision not null,
  unique (user_id, at)
);

create index if not exists burn_rate_samples_user_at_idx
  on public.burn_rate_samples (user_id, at desc);

alter table public.push_tokens enable row level security;
alter table public.burn_alert_subscriptions enable row level security;
alter table public.burn_rate_samples enable row level security;

create policy "Users manage own push tokens"
  on public.push_tokens
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Clients may read subscription status; ciphertext is opaque. Writes go through Edge Function (service role).
create policy "Users read own burn alert subscription"
  on public.burn_alert_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users read own burn rate samples"
  on public.burn_rate_samples
  for select
  to authenticated
  using (auth.uid() = user_id);
