-- Platform-wide OpenRouter rankings cache (populated by sync-rankings edge function)

create table if not exists public.platform_rankings (
  id bigint generated always as identity primary key,
  ranking_date date not null,
  model_permaslug text not null,
  total_tokens bigint not null default 0,
  prompt_tokens bigint,
  completion_tokens bigint,
  is_other boolean not null default false,
  synced_at timestamptz not null default now(),
  unique (ranking_date, model_permaslug)
);

create index if not exists platform_rankings_date_idx
  on public.platform_rankings (ranking_date desc);

create table if not exists public.platform_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.platform_rankings enable row level security;
alter table public.platform_meta enable row level security;

create policy "Authenticated users read platform rankings"
  on public.platform_rankings
  for select
  to authenticated
  using (true);

create policy "Authenticated users read platform meta"
  on public.platform_meta
  for select
  to authenticated
  using (true);
