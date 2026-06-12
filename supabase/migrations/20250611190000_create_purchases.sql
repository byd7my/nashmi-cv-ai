-- Minimal payment records (no CV content). Safe to run on existing projects.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_token text not null unique,
  plan_tier text not null check (plan_tier in ('premium', 'elite')),
  cv_session_id text not null,
  email text,
  payment_ref text,
  payment_method text,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists purchases_token_session_idx
  on public.purchases (purchase_token, cv_session_id);

create index if not exists purchases_session_active_idx
  on public.purchases (cv_session_id)
  where consumed_at is null;

alter table public.purchases enable row level security;
