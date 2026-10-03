create or replace function public.notify_profile_contact_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if NEW.phone is distinct from OLD.phone or NEW.email is distinct from OLD.email then
  perform public.create_taskora_notification(NEW.id,'contact_changed','Contacto da conta alterado','O email ou telefone associado à sua conta foi alterado.','urgent','/app/profile',jsonb_build_object('phone_changed',NEW.phone is distinct from OLD.phone,'email_changed',NEW.email is distinct from OLD.email),NEW.id::text||':contact:'||to_char(NEW.updated_at,'YYYYMMDDHH24MISSMS'),'profile');
 end if;
 return NEW;
end; $$;
drop trigger if exists trg_taskora_notification_profile_contact on public.profiles;
create trigger trg_taskora_notification_profile_contact after update of phone,email on public.profiles for each row execute function public.notify_profile_contact_change();