create or replace function public.process_due_notification_campaigns()
returns integer language plpgsql security definer set search_path=public as $$
declare c record;uid uuid;n uuid;created_count integer:=0;ch text;users uuid[];
begin
 for c in select * from public.notification_campaigns where status='scheduled' and scheduled_for<=now() order by scheduled_for for update skip locked loop
  update public.notification_campaigns set status='processing',updated_at=now() where id=c.id;
  if c.audience_type='selected' then users:=c.selected_user_ids;
  elsif c.audience_type='admins' then select coalesce(array_agg(id),'{}') into users from auth.users where public.is_taskora_admin_user(id);
  elsif c.audience_type='segment' then select coalesce(array_agg(u.id),'{}') into users from auth.users u join public.profiles p on p.id=u.id where upper(coalesce(p.country,''))=upper(coalesce(c.audience_filter->>'country',''));
  else select coalesce(array_agg(id),'{}') into users from auth.users; end if;
  foreach uid in array users loop
    n:=public.create_taskora_notification(uid,'admin_message',c.title,c.message,c.priority,c.route,jsonb_build_object('campaign_id',c.id),'campaign:'||c.id::text||':'||uid::text,'campaign');
    if n is not null then
      created_count:=created_count+1;
      if 'push'=any(c.channels) then insert into public.notification_deliveries(notification_id,campaign_id,user_id,channel,status) values(n,c.id,uid,'push','pending') on conflict(notification_id,channel) do nothing; end if;
      if 'email'=any(c.channels) then insert into public.notification_deliveries(notification_id,campaign_id,user_id,channel,status) values(n,c.id,uid,'email','pending') on conflict(notification_id,channel) do nothing; end if;
    end if;
  end loop;
  insert into public.notification_send_log(campaign_id,action,result,recipient_count,sent_count,channels) values(c.id,'campaign_send','success',coalesce(array_length(users,1),0),created_count,c.channels);
  update public.notification_campaigns set status='sent',sent_at=now(),updated_at=now() where id=c.id;
 end loop; return created_count;
end; $$;
grant execute on function public.process_due_notification_campaigns() to authenticated;