create or replace function public.audit_notification_admin_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if public.is_taskora_admin() then
   perform public.write_security_audit(
     lower(TG_OP)||'_notification',
     'notificacoes',
     TG_TABLE_NAME,
     coalesce((case when TG_OP='DELETE' then OLD.id else NEW.id end)::text,null),
     'success',
     '{}'::jsonb
   );
 end if;
 return coalesce(NEW,OLD);
end; $$;
drop trigger if exists trg_notification_rules_audit on public.notification_rules;
create trigger trg_notification_rules_audit after insert or update or delete on public.notification_rules for each row execute function public.audit_notification_admin_change();
drop trigger if exists trg_notification_templates_audit on public.notification_templates;
create trigger trg_notification_templates_audit after insert or update or delete on public.notification_templates for each row execute function public.audit_notification_admin_change();
drop trigger if exists trg_notification_campaigns_audit on public.notification_campaigns;
create trigger trg_notification_campaigns_audit after insert or update or delete on public.notification_campaigns for each row execute function public.audit_notification_admin_change();