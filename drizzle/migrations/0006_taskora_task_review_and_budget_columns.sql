-- TASKORA: moderação de tarefas empresariais e colunas de orçamento-base (USD).
-- Migração aditiva; a tarefa permanece rascunho/pausada até existir um fluxo de publicação autorizado.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS budget_reserved numeric(20,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_approved numeric(20,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_paid numeric(20,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_status text,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMENT ON COLUMN public.tasks.currency IS 'Moeda-base do orçamento; padrão USD, equivalente local é apenas informativo.';
COMMENT ON COLUMN public.tasks.review_status IS 'Moderação da campanha: null/none (não submetida), pending, approved, rejected, corrections_required.';

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_review_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_review_status_check
  CHECK (review_status IS NULL OR review_status IN ('pending','approved','rejected','corrections_required'));

UPDATE public.tasks
SET currency = 'USD'
WHERE currency IS NULL OR currency = '';

-- O cliente não pode alterar o estado de moderação diretamente pelo browser.
CREATE OR REPLACE FUNCTION public.guard_company_task_review_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_taskora_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.review_status IS DISTINCT FROM OLD.review_status
     OR NEW.review_reason IS DISTINCT FROM OLD.review_reason
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'O estado de moderação da tarefa só pode ser alterado pelo processo autorizado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_company_task_review_writes ON public.tasks;
CREATE TRIGGER trg_guard_company_task_review_writes
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.guard_company_task_review_writes();

-- Cliente submete o rascunho para análise administrativa.
CREATE OR REPLACE FUNCTION public.submit_company_task_for_review(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_task public.tasks%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'É necessário iniciar sessão.'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_user_id AND p.account_type = 'client'
  ) THEN RAISE EXCEPTION 'Só uma conta empresarial pode submeter tarefas.'; END IF;
  IF coalesce(
    (SELECT p.verification_status FROM public.profiles p WHERE p.id = v_user_id), 'incomplete'
  ) = 'suspended' THEN
    RAISE EXCEPTION 'A conta está suspensa e não pode submeter tarefas.';
  END IF;

  SELECT t.* INTO v_task
  FROM public.tasks t
  JOIN public.companies c ON c.id = t.company_id
  WHERE t.id = p_task_id AND c.owner_id = v_user_id
  FOR UPDATE OF t;
  IF NOT FOUND THEN RAISE EXCEPTION 'A tarefa não existe ou não pertence a esta conta.'; END IF;
  IF v_task.is_draft IS NOT TRUE THEN RAISE EXCEPTION 'A tarefa já não é um rascunho.'; END IF;
  IF v_task.review_status = 'pending' THEN RAISE EXCEPTION 'Esta tarefa já está em análise.'; END IF;
  IF v_task.review_status = 'approved' THEN RAISE EXCEPTION 'Esta tarefa já foi aprovada pela administração.'; END IF;

  UPDATE public.tasks
  SET review_status = 'pending', review_reason = NULL,
      reviewed_by = NULL, reviewed_at = NULL,
      updated_at = now()
  WHERE id = v_task.id;

  INSERT INTO public.task_audit_log(task_id, actor_id, action, metadata)
  VALUES (
    v_task.id, v_user_id, 'COMPANY_TASK_SUBMITTED_FOR_REVIEW',
    jsonb_build_object('title', v_task.title, 'category', v_task.category, 'slots', v_task.slots)
  );

  RETURN jsonb_build_object('success', true, 'review_status', 'pending');
END;
$$;

-- Admin lista tarefas empresariais à espera de análise (e recentes analisadas).
CREATE OR REPLACE FUNCTION public.admin_list_company_task_reviews()
RETURNS TABLE (
  id uuid, title text, description text, category text, slots integer,
  target_country text, target_language text, destination_url text,
  completion_criteria text, deadline timestamptz,
  review_status text, review_reason text, reviewed_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  company_id uuid, company_name text, owner_id uuid,
  owner_email text, verification_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_taskora_admin() THEN RAISE EXCEPTION 'Acesso administrativo não autorizado.'; END IF;
  RETURN QUERY
  SELECT t.id, t.title, t.description, t.category, t.slots,
         t.target_country, t.target_language, t.destination_url,
         t.completion_criteria, t.deadline,
         t.review_status, t.review_reason, t.reviewed_at,
         t.created_at, t.updated_at,
         t.company_id, c.name, c.owner_id,
         p.email, p.verification_status
  FROM public.tasks t
  JOIN public.companies c ON c.id = t.company_id
  LEFT JOIN public.profiles p ON p.id = c.owner_id
  WHERE t.is_draft = true
    AND (t.review_status IS NOT NULL
         OR t.updated_at > now() - interval '30 days')
  ORDER BY
    CASE WHEN t.review_status = 'pending' THEN 0 ELSE 1 END,
    t.updated_at DESC
  LIMIT 200;
END;
$$;

-- Admin decide a moderação da tarefa.
CREATE OR REPLACE FUNCTION public.admin_review_company_task(
  p_task_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_new_status text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
BEGIN
  IF NOT public.is_taskora_admin() THEN RAISE EXCEPTION 'Acesso administrativo não autorizado.'; END IF;
  IF p_action NOT IN ('approve', 'reject', 'corrections') THEN
    RAISE EXCEPTION 'Ação administrativa inválida.';
  END IF;
  IF p_action IN ('reject', 'corrections') AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Indique uma justificação para esta decisão.';
  END IF;

  SELECT * INTO v_task FROM public.tasks
  WHERE id = p_task_id AND is_draft = true
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A tarefa não existe ou não é um rascunho.'; END IF;
  IF v_task.review_status IS NULL OR v_task.review_status NOT IN ('pending','corrections_required','rejected') THEN
    RAISE EXCEPTION 'Esta tarefa não está à espera de análise.';
  END IF;

  v_new_status := CASE p_action
    WHEN 'approve' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    ELSE 'corrections_required'
  END;

  UPDATE public.tasks
  SET review_status = v_new_status,
      review_reason = CASE WHEN p_action = 'approve' THEN NULL ELSE v_reason END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = v_task.id;

  INSERT INTO public.task_audit_log(task_id, actor_id, action, metadata)
  VALUES (
    v_task.id, auth.uid(),
    CASE p_action
      WHEN 'approve' THEN 'COMPANY_TASK_REVIEW_APPROVED'
      WHEN 'reject' THEN 'COMPANY_TASK_REVIEW_REJECTED'
      ELSE 'COMPANY_TASK_REVIEW_CORRECTIONS'
    END,
    jsonb_build_object('reason', v_reason, 'previous_status', v_task.review_status, 'new_status', v_new_status)
  );

  INSERT INTO public.security_audit_log
    (admin_user_id, action, area, resource_type, resource_id, result, metadata)
  VALUES (
    auth.uid(), 'company_task_' || p_action, 'company_tasks',
    'task', v_task.id::text, 'success',
    jsonb_build_object('reason', v_reason, 'previous_status', v_task.review_status, 'new_status', v_new_status)
  );

  RETURN jsonb_build_object('success', true, 'review_status', v_new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_company_task_for_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_company_task_for_review(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_company_task_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_company_task_reviews() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_review_company_task(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_company_task(uuid, text, text) TO authenticated;