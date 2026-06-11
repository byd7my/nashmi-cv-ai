-- =============================================================================
-- Nashmi CV AI — Supabase: ai_usage (عدادات الاستخدام فقط)
-- =============================================================================
-- انسخ هذا الملف كامل في Supabase → SQL Editor → Run
-- آمن 100% — لا يحذف ولا يعدّل بيانات موجودة (بدون DELETE / DROP / TRUNCATE)
--
-- ⚠️ مهم: حدود الباقات (3 / 5 / 20 / 40 …) لا تُخزَّن في Supabase.
--    Supabase يعدّ المحاولات فقط. الحدود تُطبَّق في Vercel (Environment Variables).
--    راجع قسم "حدود الباقات" في أسفل هذا الملف.
-- =============================================================================

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  identifier text not null unique,
  identifier_type text not null check (identifier_type in ('session', 'ip')),
  session_id text,
  feature text not null default 'legacy',
  ip text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ai_usage
  add column if not exists feature text;

create index if not exists ai_usage_last_used_at_idx
  on public.ai_usage (last_used_at);

create index if not exists ai_usage_session_feature_idx
  on public.ai_usage (session_id, feature);

alter table public.ai_usage enable row level security;

comment on table public.ai_usage is
  'Counters only. Plan limits: Starter=0, Premium improve 3/button assistant 20 translate 0 parse 2, Elite improve 5/button assistant 40 translate 45 parse 3. Limits enforced on Vercel server.';

comment on column public.ai_usage.identifier is
  'Improve: session:{session_id}:type:improve:feature:{summary|skills|exp-0|...}. Other: session:{session_id}:type:{translate|copilot|parse}';

comment on column public.ai_usage.identifier_type is
  'New rows use session. ip is legacy and unused.';

comment on column public.ai_usage.session_id is
  'CV session id from browser localStorage.';

comment on column public.ai_usage.feature is
  'Button key (summary, skills, exp-0) or usage type (translate, copilot, parse).';

comment on column public.ai_usage.attempt_count is
  'Count in current 24h window for this identifier.';

comment on column public.ai_usage.last_used_at is
  'Last use time; counter window resets 24h after this.';

comment on column public.ai_usage.ip is
  'Unused (null). Kept for compatibility.';

-- =============================================================================
-- حدود الباقات (ضعها في Vercel → Project → Settings → Environment Variables)
-- =============================================================================
--
-- ┌─────────────┬──────────────────┬─────────┬─────────┬──────────┬────────────┐
-- │ الباقة      │ تحسين AI / زر    │ المساعد │ ترجمة   │ استيراد  │ نافذة العد │
-- ├─────────────┼──────────────────┼─────────┼─────────┼──────────┼────────────┤
-- │ Starter     │ 0 (معطّل)        │ 0       │ 0       │ 0        │ —          │
-- │ Premium     │ 3 لكل زر         │ 20      │ 0       │ 2        │ 24 ساعة    │
-- │ Elite       │ 5 لكل زر         │ 40      │ 45      │ 3        │ 24 ساعة    │
-- │ Enterprise  │ 5 لكل زر         │ 40      │ 45      │ 3        │ 24 ساعة    │
-- └─────────────┴──────────────────┴─────────┴─────────┴──────────┴────────────┘
--
-- أزرار التحسين (كل زر له عدّاد مستقل):
--   summary  = زر تحسين الملخص
--   skills   = زر تحسين المهارات
--   exp-0    = زر تحسين الخبرة الأولى
--   exp-1    = زر تحسين الخبرة الثانية … وهكذا
--
-- Premium — متغيرات Vercel:
--   AI_PREMIUM_IMPROVE_MAX=3
--   AI_PREMIUM_ASSISTANT_MAX=20
--   AI_PREMIUM_TRANSLATE_MAX=0
--   AI_PREMIUM_PARSE_MAX=2
--
-- Elite — متغيرات Vercel:
--   AI_ELITE_IMPROVE_MAX=5
--   AI_ELITE_ASSISTANT_MAX=40
--   AI_ELITE_TRANSLATE_MAX=45
--   AI_ELITE_PARSE_MAX=3
--
-- بعد التصدير: الخطة ترجع Starter وجلسة جديدة = عدّادات جديدة.
-- =============================================================================
