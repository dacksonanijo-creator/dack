-- Taskora account types and client profile foundation.
-- Additive migration: preserves existing profiles, roles, companies, wallets and tasks.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'worker',
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS business_contact TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'not_started';

-- Existing users remain workers by default. Never derive admin privilege from metadata.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('worker', 'client'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status IN ('not_started', 'pending', 'verified', 'rejected'));

-- A signup-triggered function sets the account type from validated signup metadata.
-- The user may choose worker/client, but can never choose admin through this field.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_type TEXT;
BEGIN
  requested_type := NEW.raw_user_meta_data->>'account_type';
  IF requested_type NOT IN ('worker', 'client') OR requested_type IS NULL THEN
    requested_type := 'worker';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, country, account_type, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'country', 'MZ'),
    requested_type,
    NULLIF(NEW.raw_user_meta_data->>'business_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN requested_type = 'client' THEN 'company'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Account type is immutable to ordinary authenticated users; profile fields remain owner-managed.
CREATE OR REPLACE FUNCTION public.prevent_self_account_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id
     AND NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    RAISE EXCEPTION 'O tipo de conta não pode ser alterado diretamente.';
  END IF;
  IF NEW.account_type NOT IN ('worker', 'client') THEN
    RAISE EXCEPTION 'Tipo de conta inválido.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_account_type_change ON public.profiles;
CREATE TRIGGER trg_prevent_self_account_type_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_account_type_change();

-- Company profile records remain private to their owner.
DROP POLICY IF EXISTS "Companies viewable by all auth" ON public.companies;
CREATE POLICY "Company owner views own company"
ON public.companies FOR SELECT TO authenticated
USING (auth.uid() = owner_id);
