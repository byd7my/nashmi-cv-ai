-- Activation codes sold via Salla — redeemed once per code.
create table if not exists public.activation_codes (
  code text primary key,
  plan_type text not null check (plan_type in ('premium', 'elite')),
  is_used boolean not null default false,
  used_by text,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists activation_codes_unused_idx
  on public.activation_codes (code)
  where is_used = false;

alter table public.activation_codes enable row level security;
