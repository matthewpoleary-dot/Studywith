begin;

create or replace function public.consume_ai_action(p_user_id uuid, p_feature text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_entitlement_id uuid;
  v_usage_event_id uuid;
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
    insert into public.usage_events (user_id, feature)
      values (p_user_id, p_feature)
      returning id into v_usage_event_id;
    return jsonb_build_object('allowed', true, 'remaining', null, 'usage_event_id', v_usage_event_id);
  end if;

  select id, ai_credits, ai_credits_used into v_entitlement_id, v_credits, v_used
  from public.entitlements where user_id = p_user_id and kind = 'toolkit' and status = 'active'
    and starts_at <= now() and (ends_at is null or ends_at > now()) and ai_credits_used < ai_credits
  order by created_at limit 1 for update;

  if v_entitlement_id is not null then
    update public.entitlements set ai_credits_used = ai_credits_used + 1 where id = v_entitlement_id;
    insert into public.usage_events (user_id, feature, entitlement_id)
      values (p_user_id, p_feature, v_entitlement_id)
      returning id into v_usage_event_id;
    return jsonb_build_object('allowed', true, 'remaining', v_credits - v_used - 1, 'usage_event_id', v_usage_event_id);
  end if;

  select count(*) into v_count from public.usage_events
    where user_id = p_user_id and entitlement_id is null and created_at >= date_trunc('month', now());
  if v_count < 3 then
    insert into public.usage_events (user_id, feature)
      values (p_user_id, p_feature)
      returning id into v_usage_event_id;
    return jsonb_build_object('allowed', true, 'remaining', 2 - v_count, 'usage_event_id', v_usage_event_id);
  end if;
  return jsonb_build_object('allowed', false, 'reason', 'upgrade_required', 'remaining', 0);
end;
$$;

create or replace function public.refund_ai_action(p_user_id uuid, p_usage_event_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_entitlement_id uuid;
begin
  delete from public.usage_events
  where id = p_usage_event_id and user_id = p_user_id
  returning entitlement_id into v_entitlement_id;

  if not found then return false; end if;

  if v_entitlement_id is not null then
    update public.entitlements
    set ai_credits_used = greatest(0, ai_credits_used - 1)
    where id = v_entitlement_id and user_id = p_user_id;
  end if;

  return true;
end;
$$;

revoke execute on function public.refund_ai_action(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refund_ai_action(uuid, uuid) to service_role;

commit;


