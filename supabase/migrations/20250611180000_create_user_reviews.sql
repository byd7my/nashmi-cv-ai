-- Real user reviews submitted from the export confirmation modal.
create table if not exists public.user_reviews (
  id uuid primary key default gen_random_uuid(),
  name text,
  rating integer not null check (rating >= 1 and rating <= 5),
  text text not null check (char_length(trim(text)) >= 10),
  created_at timestamptz not null default now()
);

create index if not exists user_reviews_created_at_idx
  on public.user_reviews (created_at desc);

alter table public.user_reviews enable row level security;

comment on table public.user_reviews is 'Export-modal ratings shown in landing-page testimonials (max 6 newest)';
