create or replace function public.process_due_notification_campaigns()
returns integer language plpgsql security definer set search_path=public as $$
declare c record;uid uuid;n uuid;total_created integer:=0;campaign_created integer;users uuid[];rule_key text;
begin
 for c in select * from public.notification_campaigns where status='scheduled' and scheduled_for<=now() order by scheduled_for for update skip locked loop
  campaign_created:=0;update public.notification_campaigns set status='processing',updated_at=now() where id=c.id;
  rule_key:=case when c.type in ('news','promotion') then c.type else 'admin_message' end;
  if c.audience_type='selected' then users:=c.selected_user_ids;
  elsif c.audience_type='admins' then select coalesce(array_agg(id),'{}') into users from auth.users where public.is_taskora_admin_user(id);
  elsif c.audience_type='segment' then select coalesce(array_agg(u.id),'{}') into users from auth.users u join public.profiles p on p.id=u.id where upper(coalesce(p.country,''))=upper(coalesce(c.audience_filter->>'country',''));
  else select coalesce(array_agg(id),'{}') into users from auth.users; end if;
  foreach uid in array users loop
   n:=public.create_taskora_notification(uid,rule_key,c.title,c.message,c.priority,c.route,jsonb_build_object('campaign_id',c.id),'campaign:'||c.id::text||':'||uid::text,'campaign',c.type);
   if n is not null then campaign_created:=campaign_created+1;total_created:=total_created+1;
    if 'push'=any(c.channels) then insert into public.notification_deliveries(notification_id,campaign_id,user_id,channel,status) values(n,c.id,uid,'push','pending') on conflict(notification_id,channel) do nothing; end if;
    if 'email'=any(c.channels) then insert into public.notification_deliveries(notification_id,campaign_id,user_id,channel,status) values(n,c.id,uid,'email','pending') on conflict(notification_id,channel) do nothing; end if;
   end if;
  end loop;
  insert into public.notification_send_log(campaign_id,action,result,recipient_count,sent_count,channels) values(c.id,'campaign_send','success',coalesce(array_length(users,1),0),campaign_created,c.channels);
  update public.notification_campaigns set status='sent',sent_at=now(),updated_at=now() where id=c.id;
 end loop;return total_created;
end; $$;
grant execute on function public.process_due_notification_campaigns() to authenticated;