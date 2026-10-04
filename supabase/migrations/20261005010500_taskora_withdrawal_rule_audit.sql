-- TASKORA WITHDRAWALS: audited rule configuration
create or replace function public.upsert_withdrawal_rule(
 p_id uuid,p_country text,p_method text,p_currency text,p_enabled boolean,
 p_min numeric,p_max numeric,p_daily numeric,p_weekly numeric,p_monthly numeric,p_max_requests integer,p_fee numeric
) returns public.withdrawal_rules language plpgsql security definer set search_path=''
as $$
declare v public.withdrawal_rules%rowtype;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 if p_min<=0 or p_max<p_min or p_max_requests<=0 or p_fee<0 then raise exception 'invalid_rule'; end if;
 insert into public.withdrawal_rules(id,country,method,currency,enabled,min_amount,max_amount,daily_limit,weekly_limit,monthly_limit,max_requests_per_day,fee)
 values(coalesce(p_id,gen_random_uuid()),upper(p_country),lower(p_method),upper(p_currency),p_enabled,p_min,p_max,p_daily,p_weekly,p_monthly,p_max_requests,p_fee)
 on conflict(country,method,currency) do update set enabled=excluded.enabled,min_amount=excluded.min_amount,max_amount=excluded.max_amount,
 daily_limit=excluded.daily_limit,weekly_limit=excluded.weekly_limit,monthly_limit=excluded.monthly_limit,max_requests_per_day=excluded.max_requests_per_day,fee=excluded.fee,updated_at=now()
 returning * into v;
 perform public.write_security_audit('withdrawal_rule_changed','finance','withdrawal_rules',v.id::text,'success',
   jsonb_build_object('country',v.country,'method',v.method,'currency',v.currency,'enabled',v.enabled,'min_amount',v.min_amount,'max_amount',v.max_amount,'daily_limit',v.daily_limit,'weekly_limit',v.weekly_limit,'monthly_limit',v.monthly_limit,'max_requests_per_day',v.max_requests_per_day,'fee',v.fee));
 return v;
end;
$$;
revoke all on function public.upsert_withdrawal_rule(uuid,text,text,text,boolean,numeric,numeric,numeric,numeric,numeric,integer,numeric) from public,anon;
grant execute on function public.upsert_withdrawal_rule(uuid,text,text,text,boolean,numeric,numeric,numeric,numeric,numeric,integer,numeric) to authenticated;
