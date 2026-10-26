-- TASKORA Etapa 5: drafts de tarefas empresariais, sem publicação nem reserva financeira.
-- Reutiliza public.tasks; is_draft distingue um rascunho do estado operativo paused.
-- A tarefa fica com status=paused, reward=0 e budget_total=NULL até existir um fluxo de publicação autorizado.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS worker_instructions text,
  ADD COLUMN IF NOT EXISTS target_country text,
  ADD COLUMN IF NOT EXISTS target_language text,
  ADD COLUMN IF NOT EXISTS destination_url text,
  ADD COLUMN IF NOT EXISTS completion_criteria text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_company_draft_safe'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_company_draft_safe
      CHECK (
        NOT is_draft
        OR (status = 'paused'::public.task_status AND reward = 0
            AND budget_total IS NULL AND slots_filled = 0)
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tasks_company_drafts
  ON public.tasks(company_id, updated_at DESC)
  WHERE is_draft = true;

-- A interface não pode criar ou alterar tarefas empresariais diretamente.
-- Escritas de rascunho só são aceites durante as RPCs autorizadas abaixo.
CREATE OR REPLACE FUNCTION public.guard_company_task_draft_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_is_owner boolean := false;
BEGIN
  IF public.is_taskora_admin() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
  ELSE
    v_company_id := OLD.company_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = v_company_id AND c.owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Tarefas sem empresa (admin/provedores) não são controladas por este fluxo.
  IF NOT v_is_owner THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF coalesce(current_setting('taskora.allow_company_draft_write', true), '') <> 'on' THEN
    RAISE EXCEPTION 'As tarefas empresariais devem ser guardadas pelo fluxo autorizado de rascunhos.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.is_draft IS NOT TRUE THEN
      RAISE EXCEPTION 'Só é possível eliminar um rascunho empresarial.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.task_submissions s WHERE s.task_id = OLD.id) THEN
      RAISE EXCEPTION 'Não é possível eliminar uma tarefa que já tem participações.';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.company_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'Não é permitido transferir uma tarefa para outra empresa.';
  END IF;
  IF NEW.is_draft IS NOT TRUE OR NEW.status <> 'paused'::public.task_status
     OR NEW.reward <> 0 OR NEW.budget_total IS NOT NULL THEN
    RAISE EXCEPTION 'Nesta etapa só é permitido guardar rascunhos sem publicação ou orçamento.';
  END IF;
  IF NEW.slots < 1 OR NEW.slots_filled <> 0 THEN
    RAISE EXCEPTION 'A quantidade pretendida deve ser positiva e o rascunho não pode ter participações.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.task_submissions s WHERE s.task_id = NEW.id) THEN
    RAISE EXCEPTION 'Os termos de uma tarefa com participações não podem ser alterados por este fluxo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_company_task_draft_writes ON public.tasks;
CREATE TRIGGER trg_guard_company_task_draft_writes
BEFORE INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.guard_company_task_draft_writes();

REVOKE ALL ON FUNCTION public.guard_company_task_draft_writes() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_company_task_draft(
  p_task_id uuid,
  p_draft jsonb
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_company public.companies%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_title text;
  v_description text;
  v_objective text;
  v_instructions text;
  v_category text;
  v_target_country text;
  v_target_language text;
  v_destination_url text;
  v_criteria text;
  v_slots integer;
  v_deadline timestamptz;
  v_category_allowed boolean;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'É necessário iniciar sessão.'; END IF;
  SELECT * INTO v_profile FROM public.profiles
  WHERE id = v_user_id AND account_type = 'client';
  IF NOT FOUND THEN RAISE EXCEPTION 'Só uma conta empresarial pode guardar rascunhos.'; END IF;
  IF coalesce(v_profile.verification_status, 'incomplete') = 'suspended' THEN
    RAISE EXCEPTION 'A conta está suspensa e não pode criar rascunhos.';
  END IF;
  IF p_draft IS NULL OR jsonb_typeof(p_draft) <> 'object' THEN
    RAISE EXCEPTION 'Os dados da tarefa são inválidos.';
  END IF;

  v_title := nullif(btrim(p_draft->>'title'), '');
  v_description := nullif(btrim(p_draft->>'description'), '');
  v_objective := nullif(btrim(p_draft->>'objective'), '');
  v_instructions := nullif(btrim(p_draft->>'worker_instructions'), '');
  v_category := nullif(btrim(p_draft->>'category'), '');
  v_target_country := nullif(btrim(p_draft->>'target_country'), '');
  v_target_language := nullif(btrim(p_draft->>'target_language'), '');
  v_destination_url := nullif(btrim(p_draft->>'destination_url'), '');
  v_criteria := nullif(btrim(p_draft->>'completion_criteria'), '');

  IF v_title IS NULL OR length(v_title) < 3 OR length(v_title) > 120 THEN
    RAISE EXCEPTION 'O título é obrigatório e deve ter entre 3 e 120 caracteres.';
  END IF;
  IF v_description IS NULL OR length(v_description) < 10 OR length(v_description) > 5000 THEN
    RAISE EXCEPTION 'A descrição é obrigatória e deve ter entre 10 e 5000 caracteres.';
  END IF;
  IF v_objective IS NULL OR length(v_objective) < 5 OR length(v_objective) > 1000 THEN
    RAISE EXCEPTION 'O objetivo é obrigatório e deve ter entre 5 e 1000 caracteres.';
  END IF;
  IF v_instructions IS NULL OR length(v_instructions) < 10 OR length(v_instructions) > 5000 THEN
    RAISE EXCEPTION 'As instruções são obrigatórias e devem ter entre 10 e 5000 caracteres.';
  END IF;
  IF v_criteria IS NULL OR length(v_criteria) < 5 OR length(v_criteria) > 2000 THEN
    RAISE EXCEPTION 'Os critérios de conclusão são obrigatórios e devem ter entre 5 e 2000 caracteres.';
  END IF;
  IF v_category IS NULL OR v_category NOT IN (
    'questionnaires_surveys','website_app_testing','product_service_review',
    'verified_page_visits','content_promotion','media_promotion','other_digital'
  ) THEN
    RAISE EXCEPTION 'Categoria de tarefa inválida ou não permitida.';
  END IF;
  IF length(coalesce(v_target_country,'')) > 100 OR length(coalesce(v_target_language,'')) > 100 THEN
    RAISE EXCEPTION 'O país e o idioma não podem exceder 100 caracteres.';
  END IF;
  IF v_destination_url IS NOT NULL THEN
    IF length(v_destination_url) > 2048 OR v_destination_url !~* '^https?://[^[:space:]]+$' THEN
      RAISE EXCEPTION 'O link de destino deve ser um URL http ou https válido.';
    END IF;
  END IF;
  IF v_category IN ('website_app_testing','product_service_review','verified_page_visits','content_promotion','media_promotion')
     AND v_destination_url IS NULL THEN
    RAISE EXCEPTION 'Esta categoria exige um link de destino.';
  END IF;

  BEGIN
    v_slots := (p_draft->>'slots')::integer;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Indica uma quantidade válida de conclusões pretendidas.';
  END;
  IF v_slots < 1 OR v_slots > 100000 THEN
    RAISE EXCEPTION 'A quantidade deve estar entre 1 e 100000.';
  END IF;

  BEGIN
    v_deadline := (p_draft->>'deadline')::timestamptz;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Indica um prazo válido para a campanha.';
  END;
  IF v_deadline IS NULL OR v_deadline <= now() OR v_deadline > now() + interval '2 years' THEN
    RAISE EXCEPTION 'O prazo deve estar no futuro e não pode ultrapassar dois anos.';
  END IF;

  IF p_task_id IS NOT NULL THEN
    SELECT t.* INTO v_task
    FROM public.tasks t
    JOIN public.companies c ON c.id = t.company_id
    WHERE t.id = p_task_id AND c.owner_id = v_user_id AND t.is_draft = true
    FOR UPDATE OF t;
    IF NOT FOUND THEN RAISE EXCEPTION 'O rascunho não existe ou não pertence a esta conta.'; END IF;
    SELECT * INTO v_company FROM public.companies WHERE id = v_task.company_id;
    IF EXISTS (SELECT 1 FROM public.task_submissions s WHERE s.task_id = v_task.id) THEN
      RAISE EXCEPTION 'Este rascunho já tem participações e não pode ser alterado.';
    END IF;
  ELSE
    SELECT * INTO v_company FROM public.companies
    WHERE owner_id = v_user_id ORDER BY created_at ASC LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO public.companies(owner_id, name, description, website, country)
      VALUES (
        v_user_id,
        left(coalesce(nullif(btrim(v_profile.business_name), ''), nullif(btrim(v_profile.full_name), ''), 'Cliente TASKORA'), 160),
        v_profile.business_description,
        v_profile.business_website,
        coalesce(nullif(btrim(v_profile.country), ''), 'MZ')
      ) RETURNING * INTO v_company;
    END IF;
  END IF;

  PERFORM set_config('taskora.allow_company_draft_write', 'on', true);
  IF p_task_id IS NULL THEN
    INSERT INTO public.tasks(
      company_id,title,description,category,reward,slots,slots_filled,deadline,status,
      origin,budget_total,is_draft,objective,worker_instructions,target_country,target_language,
      destination_url,completion_criteria
    )
    VALUES (
      v_company.id,v_title,v_description,v_category,0,v_slots,0,v_deadline,'paused'::public.task_status,
      'company',NULL,true,v_objective,v_instructions,v_target_country,v_target_language,
      v_destination_url,v_criteria
    ) RETURNING * INTO v_task;
  ELSE
    UPDATE public.tasks SET
      title=v_title, description=v_description, category=v_category, slots=v_slots,
      deadline=v_deadline, is_draft=true, status='paused'::public.task_status,
      objective=v_objective, worker_instructions=v_instructions,
      target_country=v_target_country, target_language=v_target_language,
      destination_url=v_destination_url, completion_criteria=v_criteria,
      reward=0, budget_total=NULL
    WHERE id=p_task_id RETURNING * INTO v_task;
  END IF;

  INSERT INTO public.task_audit_log(task_id,actor_id,action,metadata)
  VALUES (
    v_task.id,v_user_id,CASE WHEN p_task_id IS NULL THEN 'COMPANY_DRAFT_CREATED' ELSE 'COMPANY_DRAFT_UPDATED' END,
    jsonb_build_object('category',v_category,'slots',v_slots,'deadline',v_deadline,'is_draft',true)
  );

  RETURN v_task;
END;
$$;

REVOKE ALL ON FUNCTION public.save_company_task_draft(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_company_task_draft(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_company_task_draft(p_task_id uuid)
RETURNS public.tasks
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_task public.tasks%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_type='client'
  ) THEN RAISE EXCEPTION 'Conta empresarial não autorizada.'; END IF;
  SELECT t.* INTO v_task FROM public.tasks t
  JOIN public.companies c ON c.id=t.company_id
  WHERE t.id=p_task_id AND c.owner_id=auth.uid() AND t.is_draft=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'O rascunho não existe ou não pertence a esta conta.'; END IF;
  RETURN v_task;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_task_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_task_draft(uuid) TO authenticated;