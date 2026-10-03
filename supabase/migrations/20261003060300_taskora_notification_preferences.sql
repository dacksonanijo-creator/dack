create or replace function public.create_taskora_notification(
 p_user_id uuid,p_rule_key text,p_title text,p_message text,p_priority text default 'normal',
 p_route text default null,p_metadata jsonb default '{}'::jsonb,p_source_event_id text default null,p_source_event_type text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_rule public.notification_rules%rowtype;v_pref public.notification_preferences%rowtype;
begin
 select * into v_rule from public.notification_rules where rule_key=p_rule_key;
 if not found or not v_rule.enabled then return null; end if;
 select * into v_pref from public.notification_preferences where user_id=p_user_id and category=v_rule.category;
 if not v_rule.critical and v_pref.user_id is not null and not v_pref.in_app then return null; end if;
 insert into public.notifications(user_id,title,message,type,priority,route,metadata,source_event_id,source_event_type)
 values(p_user_id,p_title,p_message,p_rule_key,p_priority,p_route,coalesce(p_metadata,'{}'::jsonb),p_source_event_id,p_source_event_type)
 on conflict(user_id,source_event_id) do nothing returning id into v_id;
 if v_id is not null then
  insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'taskora','delivered') on conflict do nothing;
  if v_rule.push_enabled and (v_rule.critical or coalesce(v_pref.push,true)) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'push','pending') on conflict do nothing; end if;
  if v_rule.email_enabled and (v_rule.critical or coalesce(v_pref.email,true)) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'email','pending') on conflict do nothing; end if;
 end if; return v_id;
end; $$;
grant execute on function public.create_taskora_notification(uuid,text,text,text,text,text,jsonb,text,text) to authenticated;