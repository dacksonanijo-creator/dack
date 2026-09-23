ALTER TYPE public.withdrawal_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE public.withdrawal_status ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS provider_conversation_id text,
  ADD COLUMN IF NOT EXISTS provider_response_code text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_reference_key ON public.withdrawals(reference);
CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_user_idem_key ON public.withdrawals(user_id, idempotency_key);

-- Users must go through request_withdrawal() (balance lock); remove direct insert
DROP POLICY IF EXISTS "Users create own withdrawals" ON public.withdrawals;

CREATE TABLE public.payout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  provider text NOT NULL,
  environment text NOT NULL,
  action text NOT NULL,
  request jsonb,
  response jsonb,
  http_status integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_logs TO authenticated;
GRANT ALL ON public.payout_logs TO service_role;
ALTER TABLE public.payout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view payout logs" ON public.payout_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_platform_admin());

-- 1) Request: validate + lock balance atomically (runs as the user)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _method text, _amount numeric, _account_holder text, _account_number text,
  _idempotency_key text, _min_amount numeric, _max_amount numeric
) RETURNS public.withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _w public.wallets;
  _existing public.withdrawals;
  _row public.withdrawals;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key) < 8 THEN RAISE EXCEPTION 'invalid_idempotency_key'; END IF;

  SELECT * INTO _existing FROM public.withdrawals WHERE user_id = _uid AND idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN _existing; END IF;

  IF _amount IS NULL OR _amount < _min_amount OR _amount > _max_amount THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  SELECT * INTO _w FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'wallet_not_found'; END IF;

  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE user_id = _uid AND status::text IN ('pending','processing')) THEN
    RAISE EXCEPTION 'withdrawal_in_progress';
  END IF;
  IF _w.available_balance < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  UPDATE public.wallets SET available_balance = available_balance - _amount,
    pending_balance = pending_balance + _amount WHERE id = _w.id;

  INSERT INTO public.withdrawals (user_id, method, provider, account_holder, account_number, amount, currency,
    status, reference, idempotency_key)
  VALUES (_uid, _method, _method, _account_holder, _account_number, _amount, _w.currency,
    'pending', 'TSK' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,17)), _idempotency_key)
  RETURNING * INTO _row;
  RETURN _row;
END; $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(text,numeric,text,text,text,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(text,numeric,text,text,text,numeric,numeric) TO authenticated;

-- 2) Mark as sent to provider (server only)
CREATE OR REPLACE FUNCTION public.mark_withdrawal_processing(_id uuid, _environment text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.withdrawals SET status = 'processing', environment = _environment, attempts = attempts + 1
  WHERE id = _id AND status::text = 'pending';
  RETURN FOUND;
END; $$;

-- 3) Finalize: success -> paid, failure -> refund (server only, idempotent)
CREATE OR REPLACE FUNCTION public.finalize_withdrawal(
  _id uuid, _success boolean, _transaction_id text, _conversation_id text, _response_code text, _reason text
) RETURNS public.withdrawals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.withdrawals;
BEGIN
  SELECT * INTO _row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'withdrawal_not_found'; END IF;
  IF _row.status::text NOT IN ('pending','processing') THEN RETURN _row; END IF;

  IF _success THEN
    UPDATE public.wallets SET pending_balance = pending_balance - _row.amount,
      total_withdrawn = total_withdrawn + _row.amount WHERE user_id = _row.user_id;
    INSERT INTO public.transactions (user_id, type, amount, currency, reference, description)
    VALUES (_row.user_id, 'withdrawal', _row.amount, _row.currency, _row.reference, 'Levantamento ' || _row.method);
    UPDATE public.withdrawals SET status = 'paid', transaction_id = _transaction_id,
      provider_conversation_id = _conversation_id, provider_response_code = _response_code,
      processed_at = now() WHERE id = _id RETURNING * INTO _row;
  ELSE
    UPDATE public.wallets SET pending_balance = pending_balance - _row.amount,
      available_balance = available_balance + _row.amount WHERE user_id = _row.user_id;
    UPDATE public.withdrawals SET status = 'failed', provider_conversation_id = _conversation_id,
      provider_response_code = _response_code, failure_reason = _reason, processed_at = now()
    WHERE id = _id RETURNING * INTO _row;
  END IF;
  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.mark_withdrawal_processing(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_withdrawal(uuid,boolean,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_processing(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_withdrawal(uuid,boolean,text,text,text,text) TO service_role;