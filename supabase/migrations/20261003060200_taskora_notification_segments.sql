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
 elsif p_audience_type='segment' then
   seg:=nullif(trim(p_metadata->>'country'),'');
   if seg is null then raise exception 'segment country required'; end if;
   select coalesce(array_agg(u.id),'{}') into users from auth.users u join public.profiles p on p.id=u.id where upper(coalesce(p.country,''))=upper(seg);
 else select coalesce(array_agg(id),'{}') into users from auth.users; end if;
 foreach uid in array users loop
  n:=public.create_taskora_notification(uid,'admin_message',p_title,p_message,p_priority,p_route,p_metadata,null,'admin_message');
  if n is not null then
   created_count:=created_count+1;
   if 'push'=any(p_channels) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(n,uid,'push','pending') on conflict do nothing; end if;
   if 'email'=any(p_channels) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(n,uid,'email','pending') on conflict do nothing; end if;
  end if;
 end loop;
 insert into public.notification_send_log(admin_user_id,action,result,recipient_count,sent_count,channels) values(auth.uid(),'manual_send','success',coalesce(array_length(users,1),0),created_count,p_channels);
 perform public.write_security_audit('notification_send','notificacoes','manual',null,'success',jsonb_build_object('recipient_count',coalesce(array_length(users,1),0),'channels',p_channels));
 return jsonb_build_object('recipient_count',coalesce(array_length(users,1),0),'created_count',created_count);
end; $$;
grant execute on function public.admin_send_notification(text,text,text,text,text[],text,uuid[],text,jsonb) to authenticated;