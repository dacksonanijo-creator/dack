-- TASKORA Etapa 2: perfil empresarial, verificação e auditoria administrativa.
-- Migração aditiva; não remove nem substitui os módulos existentes.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS business_website text,
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS business_status_before_suspension text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_verification_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status IN (
    'not_started', 'incomplete', 'pending', 'verified',
    'rejected', 'corrections_required', 'suspended'
  ));

UPDATE public.profiles
SET verification_status = 'incomplete'
WHERE verification_status = 'not_started'
  AND account_type = 'client';

CREATE TABLE IF NOT EXISTS public.business_profile_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'corrections_required', 'suspended', 'reactivated')),
  reason text,
  previous_status text,
  new_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_profile_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_profile_decisions FROM anon, authenticated;
GRANT SELECT ON public.business_profile_decisions TO authenticated;
DROP POLICY IF EXISTS "Admins read business profile decisions" ON public.business_profile_decisions;
CREATE POLICY "Admins read business profile decisions"
ON public.business_profile_decisions FOR SELECT TO authenticated
USING (public.is_taskora_admin());

-- Os clientes nunca podem mudar diretamente o estado de verificação.
CREATE OR REPLACE FUNCTION public.guard_business_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_taskora_admin()
     AND coalesce(current_setting('taskora.allow_business_status_change', true), '') <> 'on'
     AND NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'O estado de verificação só pode ser alterado pelo processo autorizado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_business_verification_status ON public.profiles;
CREATE TRIGGER trg_guard_business_verification_status
BEFORE UPDATE OF verification_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_business_verification_status();

CREATE OR REPLACE FUNCTION public.submit_business_profile_for_review()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_previous text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É necessário iniciar sessão.'; END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid() AND account_type = 'client'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil empresarial não encontrado.'; END IF;
  IF coalesce(trim(v_profile.business_name), '') = ''
     OR coalesce(trim(v_profile.business_type), '') = ''
     OR coalesce(trim(v_profile.country), '') = ''
     OR coalesce(trim(v_profile.business_category), '') = ''
     OR coalesce(trim(v_profile.email), '') = ''
     OR coalesce(trim(v_profile.phone), '') = '' THEN
    RAISE EXCEPTION 'Preencha nome público, tipo, país, categoria, email e telefone antes de submeter.';
  END IF;
  IF v_profile.verification_status = 'suspended' THEN
    RAISE EXCEPTION 'A conta está suspensa. Contacte o apoio.';
  END IF;
  IF v_profile.verification_status = 'verified' THEN
    RAISE EXCEPTION 'Este perfil já está verificado.';
  END IF;

  v_previous := v_profile.verification_status;
  PERFORM set_config('taskora.allow_business_status_change', 'on', true);
  UPDATE public.profiles
  SET verification_status = 'pending', updated_at = now()
  WHERE id = auth.uid();

  INSERT INTO public.business_profile_decisions
    (client_user_id, action, previous_status, new_status)
  VALUES (auth.uid(), 'submitted', v_previous, 'pending');

  RETURN jsonb_build_object('success', true, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_business_clients()
RETURNS TABLE (
  id uuid, full_name text, email text, phone text, country text,
  business_name text, business_type text, business_category text,
  business_contact text, business_website text, business_description text,
  verification_status text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_taskora_admin() THEN RAISE EXCEPTION 'Acesso administrativo não autorizado.'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.phone, p.country, p.business_name,
         p.business_type, p.business_category, p.business_contact,
         p.business_website, p.business_description, p.verification_status,
         p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.account_type = 'client'
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_business_client(
  p_client_user_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_new_status text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
BEGIN
  IF NOT public.is_taskora_admin() THEN RAISE EXCEPTION 'Acesso administrativo não autorizado.'; END IF;
  IF p_action NOT IN ('approve', 'reject', 'corrections', 'suspend', 'reactivate') THEN
    RAISE EXCEPTION 'Ação administrativa inválida.';
  END IF;
  IF p_action IN ('reject', 'corrections', 'suspend') AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Indique uma justificação para esta decisão.';
  END IF;

  SELECT * INTO v_profile FROM public.profiles
  WHERE id = p_client_user_id AND account_type = 'client'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente empresarial não encontrado.'; END IF;

  v_new_status := CASE p_action
    WHEN 'approve' THEN 'verified'
    WHEN 'reject' THEN 'rejected'
    WHEN 'corrections' THEN 'corrections_required'
    WHEN 'suspend' THEN 'suspended'
    WHEN 'reactivate' THEN coalesce(v_profile.business_status_before_suspension, 'pending')
  END;

  IF p_action = 'approve' AND v_profile.verification_status <> 'pending' THEN
    RAISE EXCEPTION 'Só é possível aprovar uma solicitação pendente.';
  END IF;
  IF p_action = 'reactivate' AND v_profile.verification_status <> 'suspended' THEN
    RAISE EXCEPTION 'A conta não está suspensa.';
  END IF;

  UPDATE public.profiles
  SET verification_status = v_new_status,
      business_status_before_suspension = CASE
        WHEN p_action = 'suspend' THEN v_profile.verification_status
        WHEN p_action = 'reactivate' THEN NULL
        ELSE business_status_before_suspension
      END,
      updated_at = now()
  WHERE id = p_client_user_id;

  INSERT INTO public.business_profile_decisions
    (client_user_id, admin_user_id, action, reason, previous_status, new_status)
  VALUES (
    p_client_user_id, auth.uid(),
    CASE p_action
      WHEN 'approve' THEN 'approved'
      WHEN 'reject' THEN 'rejected'
      WHEN 'corrections' THEN 'corrections_required'
      WHEN 'suspend' THEN 'suspended'
      ELSE 'reactivated'
    END,
    v_reason, v_profile.verification_status, v_new_status
  );

  INSERT INTO public.security_audit_log
    (admin_user_id, action, area, resource_type, resource_id, result, metadata)
  VALUES (
    auth.uid(), 'business_client_' || p_action, 'business_clients',
    'profile', p_client_user_id::text, 'success',
    jsonb_build_object('reason', v_reason, 'previous_status', v_profile.verification_status, 'new_status', v_new_status)
  );

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_business_profile_for_review() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_business_profile_for_review() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_business_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_business_clients() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_decide_business_client(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_business_client(uuid, text, text) TO authenticated;
