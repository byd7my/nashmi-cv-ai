-- Tracks AI Improve usage per session or IP for rate limiting.
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  identifier text not null unique,
  identifier_type text not null check (identifier_type in ('session', 'ip')),
  session_id text,
  ip text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_last_used_at_idx on public.ai_usage (last_used_at);

alter table public.ai_usage enable row level security;

comment on table public.ai_usage is 'Rate-limit counters for /api/openai AI Improve requests';
comment on column public.ai_usage.identifier is 'Lookup key: session:<uuid> or ip:<address>';
comment on column public.ai_usage.session_id is 'Client session id when provided';
comment on column public.ai_usage.ip is 'Client IP fallback when no session id';
