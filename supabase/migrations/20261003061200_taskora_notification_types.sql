drop function if exists public.create_taskora_notification(uuid,text,text,text,text,text,jsonb,text,text);
create or replace function public.create_taskora_notification(
 p_user_id uuid,p_rule_key text,p_title text,p_message text,p_priority text default 'normal',
 p_route text default null,p_metadata jsonb default '{}'::jsonb,p_source_event_id text default null,
 p_source_event_type text default null,p_display_type text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_rule public.notification_rules%rowtype;v_pref public.notification_preferences%rowtype;
begin
 select * into v_rule from public.notification_rules where rule_key=p_rule_key;
 if not found or not v_rule.enabled then return null; end if;
 select * into v_pref from public.notification_preferences where user_id=p_user_id and category=v_rule.category;
 if not v_rule.critical and v_pref.user_id is not null and not v_pref.in_app then return null; end if;
 insert into public.notifications(user_id,title,message,type,priority,route,metadata,source_event_id,source_event_type)
 values(p_user_id,p_title,p_message,coalesce(p_display_type,p_rule_key),p_priority,p_route,coalesce(p_metadata,'{}'::jsonb),p_source_event_id,p_source_event_type)
 on conflict(user_id,source_event_id) do nothing returning id into v_id;
 if v_id is not null then
  insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'taskora','delivered') on conflict do nothing;
  if v_rule.push_enabled and (v_rule.critical or coalesce(v_pref.push,true)) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'push','pending') on conflict do nothing; end if;
  if v_rule.email_enabled and (v_rule.critical or coalesce(v_pref.email,true)) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'email','pending') on conflict do nothing; end if;
 end if; return v_id;
end; $$;
grant execute on function public.create_taskora_notification(uuid,text,text,text,text,text,jsonb,text,text,text) to authenticated;

create or replace function public.admin_send_notification(
 p_title text,p_message text,p_type text,p_priority text,p_channels text[],p_audience_type text,
 p_selected_user_ids uuid[] default '{}',p_route text default null,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid;n uuid;users uuid[];created_count integer:=0;ch text;seg text;
begin
 if auth.uid() is null or not public.is_taskora_admin() then raise exception 'not authorized'; end if;
 if length(trim(coalesce(p_title,'')))=0 or length(p_title)>180 or length(trim(coalesce(p_message,'')))=0 or length(p_message)>5000 then raise exception 'invalid message'; end if;
 if p_priority not in ('normal','important','urgent') or p_audience_type not in ('all','selected','segment','admins') then raise exception 'invalid notification parameters'; end if;
 if p_audience_type='selected' then users:=coalesce(p_selected_user_ids,'{}');
 elsif p_audience_type='admins' then select coalesce(array_agg(id),'{}') into users from auth.users where public.is_taskora_admin_user(id);
 elsif p_audience_type='segment' then seg:=nullif(trim(p_metadata->>'country'),'');if seg is null then raise exception 'segment country required';end if;select coalesce(array_agg(u.id),'{}') into users from auth.users u join public.profiles p on p.id=u.id where upper(coalesce(p.country,''))=upper(seg);
 else select coalesce(array_agg(id),'{}') into users from auth.users; end if;
 foreach uid in array users loop
  n:=public.create_taskora_notification(uid,'admin_message',p_title,p_message,p_priority,p_route,p_metadata,null,'admin_message',p_type);
  if n is not null then
   created_count:=created_count+1;
   if 'push'=any(p_channels) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(n,uid,'push','pending') on conflict do nothing; end if;
   if 'email'=any(p_channels) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(n,uid,'email','pending') on conflict do nothing; end if;
  end if;
 end loop;
 insert into public.notification_send_log(admin_user_id,action,result,recipient_count,sent_count,channels) values(auth.uid(),'manual_send','success',coalesce(array_length(users,1),0),created_count,p_channels);
 perform public.write_security_audit('notification_send','notificacoes','manual',null,'success',jsonb_build_object('recipient_count',coalesce(array_length(users,1),0),'channels',p_channels,'type',p_type));
 return jsonb_build_object('recipient_count',coalesce(array_length(users,1),0),'created_count',created_count);
end; $$;
grant execute on function public.admin_send_notification(text,text,text,text,text[],text,uuid[],text,jsonb) to authenticated;