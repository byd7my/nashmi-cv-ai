-- Per CV session + per AI Improve button (default: 3 uses / 24h each).
-- identifier format: session:{cv_session_id}:feature:{button_key}
-- button keys: summary | skills | exp-0 | exp-1 | ...

alter table public.ai_usage
  add column if not exists feature text;

update public.ai_usage
set feature = coalesce(nullif(feature, ''), 'legacy')
where feature is null;

alter table public.ai_usage
  alter column feature set not null;

-- Drop old IP-based counters (limits are session-only now).
delete from public.ai_usage
where identifier_type = 'ip'
   or identifier like 'ip:%'
   or identifier like 'session:%'
      and identifier not like '%:feature:%';

comment on column public.ai_usage.feature is 'AI Improve button: summary, skills, exp-0, exp-1, ...';
comment on column public.ai_usage.identifier is 'Lookup key: session:{cv_session_id}:feature:{button_key}';
comment on table public.ai_usage is 'Rate-limit counters: 3 presses per button per CV session (24h window)';
