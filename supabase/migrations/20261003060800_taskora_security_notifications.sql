insert into public.notification_rules(rule_key,name,description,category,enabled,internal_enabled,push_enabled,email_enabled,critical)
values('two_factor_changed','2FA alterado','Alerta quando a autenticação de dois factores é activada ou desactivada.','security',true,true,true,true,true)
on conflict(rule_key) do nothing;

create or replace function public.log_security_access_event(p_event_type text,p_success boolean,p_device text default null,p_browser text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_failed_count integer;v_user uuid:=auth.uid();
begin
 if p_event_type not in ('login_success','login_failed','account_recovery','authentication_change','password_change','two_factor_enabled','two_factor_disabled') then raise exception 'invalid security event'; end if;
 if p_event_type<>'login_failed' and v_user is null then raise exception 'not authenticated'; end if;
 insert into public.security_access_events(user_id,event_type,success,device,browser) values(v_user,p_event_type,p_success,p_device,p_browser) returning id into v_id;
 if v_user is not null then
  if p_event_type='login_success' then perform public.create_taskora_notification(v_user,'new_login','Novo acesso','Foi registado um novo acesso à sua conta.','important','/app/security',jsonb_build_object('device',p_device,'browser',p_browser),v_id::text||':new_login','security');
  elsif p_event_type='password_change' then perform public.create_taskora_notification(v_user,'password_changed','Palavra-passe alterada','A palavra-passe da sua conta foi alterada.','urgent','/app/security','{}'::jsonb,v_id::text||':password_changed','security');
  elsif p_event_type='two_factor_enabled' or p_event_type='two_factor_disabled' then perform public.create_taskora_notification(v_user,'two_factor_changed','Autenticação de dois factores alterada','A configuração de autenticação de dois factores da sua conta foi alterada.','urgent','/app/security',jsonb_build_object('event',p_event_type),v_id::text||':two_factor','security');
  end if;
 end if;
 if p_event_type='login_failed' then
  select count(*) into v_failed_count from public.security_access_events where event_type='login_failed' and browser is not distinct from p_browser and created_at>=now()-interval '15 minutes';
  if v_failed_count>=5 and not exists(select 1 from public.security_alerts where alert_type='repeated_login_failures' and status in ('open','acknowledged') and created_at>=now()-interval '15 minutes') then
   insert into public.security_alerts(alert_type,severity,title,description,metadata) values('repeated_login_failures','high','Várias tentativas de acesso falhadas','Foram registadas várias tentativas de login falhadas no período recente.',jsonb_build_object('browser',p_browser,'window_minutes',15,'count',v_failed_count));
   if v_user is not null then perform public.create_taskora_notification(v_user,'suspicious_activity','Actividade de segurança suspeita','Foram detectadas várias tentativas de acesso falhadas.','urgent','/app/security','{}'::jsonb,v_id::text||':suspicious','security'); end if;
  end if;
 end if;
 return v_id;
end; $$;
grant execute on function public.log_security_access_event(text,boolean,text,text) to anon,authenticated;