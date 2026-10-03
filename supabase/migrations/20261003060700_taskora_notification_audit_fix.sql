create or replace function public.audit_notification_admin_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_id text;
begin
 if TG_OP='DELETE' then v_id:=OLD.id::text; else v_id:=NEW.id::text; end if;
 if public.is_taskora_admin() then
  perform public.write_security_audit(lower(TG_OP)||'_notification','notificacoes',TG_TABLE_NAME,v_id,'success','{}'::jsonb);
 end if;
 if TG_OP='DELETE' then return OLD; else return NEW; end if;
end; $$;