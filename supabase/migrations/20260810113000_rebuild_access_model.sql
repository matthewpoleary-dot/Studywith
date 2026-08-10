begin;

-- Non-destructive StudyWith v2 migration. Legacy columns remain temporarily so
-- rollback is possible, but application authorization moves to entitlements.
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists updated_at timestamptz not null default now();

alter table public.sessions alter column assignment_text set default '';
update public.sessions set title = coalesce(title, nullif(left(assignment_text, 80), ''), 'Study session') where title is null;
alter table public.sessions alter column title set default 'New study session';
alter table public.sessions alter column title set not null;
alter table public.sessions add column if not exists subject text not null default 'General';
alter table public.sessions add column if not exists updated_at timestamptz not null default now();

alter table public.study_materials add column if not exists title text;
alter table public.study_materials add column if not exists subject text not null default 'General';
alter table public.study_materials add column if not exists source_type text not null default 'text';
alter table public.study_materials add column if not exists extracted_text text not null default '';
alter table public.study_materials add column if not exists updated_at timestamptz not null default now();
update public.study_materials set title = coalesce(title, file_name), subject = coalesce(nullif(subject, 'General'), topic, 'General');
alter table public.study_materials alter column title set default 'Study notes';
alter table public.study_materials alter column title set not null;
alter table public.study_materials alter column file_name set default 'Study notes';

alter table public.study_plans add column if not exists schedule jsonb not null default '[]'::jsonb;
alter table public.study_plans add column if not exists updated_at timestamptz not null default now();

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('toolkit', 'pro', 'trial', 'school', 'admin')),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled', 'expired', 'refunded')),
  source text not null check (source in ('stripe', 'campaign', 'school', 'manual')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text unique,
  ai_credits integer not null default 0 check (ai_credits >= 0),
  ai_credits_used integer not null default 0 check (ai_credits_used >= 0 and ai_credits_used <= ai_credits),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.talk_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  school_name text not null,
  active boolean not null default true,
  toolkit_price_cents integer not null default 1200 check (toolkit_price_cents between 500 and 1900),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_redemptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.talk_campaigns(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  product text not null check (product in ('toolkit', 'pro_monthly', 'pro_annual')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'paid' check (status in ('paid', 'refunded', 'disputed')),
  campaign_id uuid references public.talk_campaigns(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  feature text not null check (char_length(feature) between 2 and 60),
  entitlement_id uuid references public.entitlements(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.school_cohorts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  access_starts_at timestamptz not null,
  access_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (access_ends_at > access_starts_at)
);

create table if not exists public.cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.school_cohorts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists entitlements_user_active_idx on public.entitlements (user_id, status, ends_at);
create index if not exists usage_events_user_created_idx on public.usage_events (user_id, created_at desc);
create index if not exists sessions_user_updated_idx on public.sessions (user_id, updated_at desc);
create index if not exists materials_user_created_idx on public.study_materials (user_id, created_at desc);

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users for each row execute function private.set_updated_at();
drop trigger if exists entitlements_updated_at on public.entitlements;
create trigger entitlements_updated_at before update on public.entitlements for each row execute function private.set_updated_at();
drop trigger if exists sessions_updated_at on public.sessions;
create trigger sessions_updated_at before update on public.sessions for each row execute function private.set_updated_at();
drop trigger if exists materials_updated_at on public.study_materials;
create trigger materials_updated_at before update on public.study_materials for each row execute function private.set_updated_at();
drop trigger if exists plans_updated_at on public.study_plans;
create trigger plans_updated_at before update on public.study_plans for each row execute function private.set_updated_at();

create or replace function public.consume_ai_action(p_user_id uuid, p_feature text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_entitlement_id uuid;
  v_credits integer;
  v_used integer;
  v_count integer;
begin
  if p_user_id is null or char_length(p_feature) not between 2 and 60 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_request');
  end if;

  if exists (
    select 1 from public.entitlements where user_id = p_user_id
      and kind in ('pro', 'trial', 'school', 'admin') and status = 'active'
      and starts_at <= now() and (ends_at is null or ends_at > now())
  ) then
    select count(*) into v_count from public.usage_events
      where user_id = p_user_id and created_at >= now() - interval '24 hours';
    if v_count >= 200 then return jsonb_build_object('allowed', false, 'reason', 'fair_use_limit'); end if;
    insert into public.usage_events (user_id, feature) values (p_user_id, p_feature);
    return jsonb_build_object('allowed', true, 'remaining', null);
  end if;

  select id, ai_credits, ai_credits_used into v_entitlement_id, v_credits, v_used
  from public.entitlements where user_id = p_user_id and kind = 'toolkit' and status = 'active'
    and starts_at <= now() and (ends_at is null or ends_at > now()) and ai_credits_used < ai_credits
  order by created_at limit 1 for update;

  if v_entitlement_id is not null then
    update public.entitlements set ai_credits_used = ai_credits_used + 1 where id = v_entitlement_id;
    insert into public.usage_events (user_id, feature, entitlement_id) values (p_user_id, p_feature, v_entitlement_id);
    return jsonb_build_object('allowed', true, 'remaining', v_credits - v_used - 1);
  end if;

  select count(*) into v_count from public.usage_events
    where user_id = p_user_id and entitlement_id is null and created_at >= date_trunc('month', now());
  if v_count < 3 then
    insert into public.usage_events (user_id, feature) values (p_user_id, p_feature);
    return jsonb_build_object('allowed', true, 'remaining', 2 - v_count);
  end if;
  return jsonb_build_object('allowed', false, 'reason', 'upgrade_required', 'remaining', 0);
end;
$$;

-- Remove the legacy public policies, including the previously open classroom tables.
drop policy if exists "Users own flashcards" on public.flashcards;
drop policy if exists "Users own quiz_questions" on public.quiz_questions;
drop policy if exists assignments_all on public.room_assignments;
drop policy if exists members_all on public.room_members;
drop policy if exists rooms_all on public.rooms;
drop policy if exists "Anyone reads completed receipts" on public.sessions;
drop policy if exists "Users read own sessions" on public.sessions;
drop policy if exists "Users own study_materials" on public.study_materials;
drop policy if exists "users can manage own study plans" on public.study_plans;
drop policy if exists "Users read own row" on public.users;
drop policy if exists room_files_all on storage.objects;

alter table public.lc_documents enable row level security;
alter table public.users enable row level security;
alter table public.entitlements enable row level security;
alter table public.purchases enable row level security;
alter table public.usage_events enable row level security;
alter table public.sessions enable row level security;
alter table public.study_materials enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.study_plans enable row level security;
alter table public.talk_campaigns enable row level security;
alter table public.campaign_redemptions enable row level security;
alter table public.schools enable row level security;
alter table public.school_cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.stripe_events enable row level security;

create policy users_select_own on public.users for select to authenticated using ((select auth.uid()) = id);
create policy users_update_own on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy entitlements_select_own on public.entitlements for select to authenticated using ((select auth.uid()) = user_id);
create policy purchases_select_own on public.purchases for select to authenticated using ((select auth.uid()) = user_id);
create policy usage_select_own on public.usage_events for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_own on public.sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy materials_own on public.study_materials for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy flashcards_own_v2 on public.flashcards for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy quizzes_own_v2 on public.quiz_questions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy plans_own_v2 on public.study_plans for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy redemptions_select_own on public.campaign_redemptions for select to authenticated using ((select auth.uid()) = user_id);
create policy cohort_members_select_own on public.cohort_members for select to authenticated using ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.users to authenticated;
grant select on public.entitlements, public.purchases, public.usage_events, public.campaign_redemptions, public.cohort_members to authenticated;
grant select, insert, update, delete on public.sessions, public.study_materials, public.flashcards, public.quiz_questions, public.study_plans to authenticated;
grant all on all tables in schema public to service_role;
revoke all on public.lc_documents, public.rooms, public.room_members, public.room_assignments from anon, authenticated;

revoke execute on function public.consume_ai_action(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_ai_action(uuid, text) to service_role;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

insert into public.talk_campaigns (code, school_name, toolkit_price_cents)
values ('PILOT-LC', 'Leaving Certificate pilot', 1200)
on conflict (code) do nothing;

commit;
