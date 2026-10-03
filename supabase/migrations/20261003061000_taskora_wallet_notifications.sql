create or replace function public.notify_wallet_balance_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if NEW.available_balance>OLD.available_balance then
  perform public.create_taskora_notification(NEW.user_id,'balance_available','Saldo disponibilizado','Há saldo disponível na sua carteira.','normal','/app/wallet',jsonb_build_object('currency',NEW.currency,'available_balance',NEW.available_balance),NEW.id::text||':balance:'||to_char(NEW.updated_at,'YYYYMMDDHH24MISSMS'),'wallet');
 end if;
 return NEW;
end; $$;
drop trigger if exists trg_taskora_notification_wallet on public.wallets;
create trigger trg_taskora_notification_wallet after update of available_balance on public.wallets for each row execute function public.notify_wallet_balance_change();