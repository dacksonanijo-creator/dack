import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, ClipboardCheck, FileText,
  LoaderCircle, Save, ShieldAlert, X, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";

const db = supabase as any;

export const Route = createFileRoute("/client/tasks/new")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    draft: typeof search.draft === "string" ? search.draft : undefined,
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    if (isAdminEmail(data.user.email)) throw redirect({ to: "/admin" });
    const { data: profile, error: profileError } = await db.from("profiles")
      .select("account_type").eq("id", data.user.id).maybeSingle();
    if (profileError || profile?.account_type !== "client") throw redirect({ to: "/app" });
    return { userId: data.user.id };
  },
  component: CompanyTaskWizard,
});

const categories = [
  { value: "questionnaires_surveys", label: "Questionários e pesquisas", detail: "Recolher respostas a perguntas ou estudos." },
  { value: "website_app_testing", label: "Testes de sites e aplicações", detail: "Testar funcionalidades e reportar resultados reais." },
  { value: "product_service_review", label: "Avaliação de produtos e serviços", detail: "Recolher avaliações honestas de uma experiência real." },
  { value: "verified_page_visits", label: "Visitas a páginas com objetivo verificável", detail: "Visitas com uma ação legítima e verificável, não apenas métricas artificiais." },
  { value: "content_promotion", label: "Promoção de conteúdo", detail: "Divulgação transparente sem manipular métricas ou violar regras externas." },
  { value: "media_promotion", label: "Divulgação de vídeos e músicas", detail: "Divulgação legítima; não inclui reproduções ou interações artificiais." },
  { value: "other_digital", label: "Outras tarefas digitais permitidas", detail: "Outra atividade digital legítima, sujeita a análise futura." },
] as const;

type DraftForm = {
  category: string;
  title: string;
  description: string;
  objective: string;
  worker_instructions: string;
  target_country: string;
  target_language: string;
  destination_url: string;
  slots: string;
  deadline: string;
  completion_criteria: string;
};
const emptyForm: DraftForm = {
  category: "",
  title: "",
  description: "",
  objective: "",
  worker_instructions: "",
  target_country: "",
  target_language: "Português",
  destination_url: "",
  slots: "10",
  deadline: "",
  completion_criteria: "",
};
const inputClass = "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";
const labelClass = "block text-sm font-medium text-foreground";
const steps = [
  { title: "Tipo de serviço", icon: ListChecks },
  { title: "Informações", icon: FileText },
  { title: "Quantidade e prazo", icon: ClipboardCheck },
  { title: "Rever e guardar", icon: CheckCircle2 },
];

function CompanyTaskWizard() {
  const { userId } = Route.useRouteContext();
  const { draft } = useSearch({ from: "/client/tasks/new" });
  const navigate = useNavigate({ from: "/client/tasks/new" });
  const [form, setForm] = useState<DraftForm>(emptyForm);
  const [step, setStep] = useState(0);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draft));
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(draft ?? null);
  const [loadError, setLoadError] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!draft) {
      setLoadingDraft(false);
      setSavedId(null);
      setForm(emptyForm);
      return () => { alive = false; };
    }
    setLoadingDraft(true);
    setLoadError("");
    (async () => {
      const { data, error } = await db.rpc("get_company_task_draft", { p_task_id: draft });
      if (!alive) return;
      if (error || !data) {
        setLoadError("Não foi possível abrir este rascunho. Confirma que pertence à tua conta e tenta novamente.");
        setLoadingDraft(false);
        return;
      }
      setForm({
        category: data.category ?? "",
        title: data.title ?? "",
        description: data.description ?? "",
        objective: data.objective ?? "",
        worker_instructions: data.worker_instructions ?? "",
        target_country: data.target_country ?? "",
        target_language: data.target_language ?? "",
        destination_url: data.destination_url ?? "",
        slots: String(data.slots ?? 1),
        deadline: data.deadline ? toLocalDateTime(data.deadline) : "",
        completion_criteria: data.completion_criteria ?? "",
      });
      setSavedId(data.id);
      setLoadingDraft(false);
    })();
    return () => { alive = false; };
  }, [draft, userId]);

  const update = (key: keyof DraftForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError("");
  };
  const category = categories.find((item) => item.value === form.category);
  const requiresUrl = ["website_app_testing", "product_service_review", "verified_page_visits", "content_promotion", "media_promotion"].includes(form.category);

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      if (!category) return "Escolhe um tipo de serviço permitido.";
    }
    if (stepIndex === 1) {
      if (form.title.trim().length < 3 || form.title.trim().length > 120) return "O título deve ter entre 3 e 120 caracteres.";
      if (form.description.trim().length < 10 || form.description.trim().length > 5000) return "A descrição deve ter entre 10 e 5000 caracteres.";
      if (form.objective.trim().length < 5 || form.objective.trim().length > 1000) return "O objetivo deve ter entre 5 e 1000 caracteres.";
      if (form.worker_instructions.trim().length < 10 || form.worker_instructions.trim().length > 5000) return "As instruções devem ter entre 10 e 5000 caracteres.";
      if (form.target_country.trim().length > 100 || form.target_language.trim().length > 100) return "O país e o idioma não podem exceder 100 caracteres.";
      if (form.destination_url.trim()) {
        try {
          const url = new URL(form.destination_url.trim());
          if (!["http:", "https:"].includes(url.protocol)) return "O link deve começar por http:// ou https://.";
        } catch { return "Introduz um link válido, incluindo https://."; }
      } else if (requiresUrl) return "Esta categoria exige um link de destino.";
    }
    if (stepIndex === 2) {
      const quantity = Number(form.slots);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return "A quantidade deve ser um número inteiro entre 1 e 100000.";
      if (!form.deadline) return "Indica o prazo pretendido para a campanha.";
      const deadline = new Date(form.deadline);
      if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) return "O prazo deve estar no futuro.";
      if (deadline.getTime() > Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) return "O prazo não pode ultrapassar dois anos.";
      if (form.completion_criteria.trim().length < 5 || form.completion_criteria.trim().length > 2000) return "Os critérios de conclusão devem ter entre 5 e 2000 caracteres.";
    }
    return "";
  };

  const next = () => {
    const issue = validateStep(step);
    if (issue) { setValidationError(issue); return; }
    setValidationError("");
    setStep((current) => Math.min(steps.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const previous = () => {
    setValidationError("");
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancel = () => {
    const message = savedId
      ? "Sair do editor? O rascunho guardado será mantido."
      : "Cancelar esta criação? Os dados ainda não guardados serão perdidos.";
    if (window.confirm(message)) void navigate({ to: "/client/tasks" });
  };

  const saveDraft = async (event?: FormEvent) => {
    event?.preventDefault();
    for (let index = 0; index < 3; index += 1) {
      const issue = validateStep(index);
      if (issue) {
        setStep(index);
        setValidationError(issue);
        return;
      }
    }
    setSaving(true);
    setValidationError("");
    const payload = {
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      objective: form.objective.trim(),
      worker_instructions: form.worker_instructions.trim(),
      target_country: form.target_country.trim() || null,
      target_language: form.target_language.trim() || null,
      destination_url: form.destination_url.trim() || null,
      slots: Number(form.slots),
      deadline: new Date(form.deadline).toISOString(),
      completion_criteria: form.completion_criteria.trim(),
    };
    const { data, error } = await db.rpc("save_company_task_draft", {
      p_task_id: savedId,
      p_draft: payload,
    });
    setSaving(false);
    if (error || !data?.id) {
      const message = error?.message || "Não foi possível guardar o rascunho.";
      setValidationError(message);
      toast.error("Não foi possível guardar o rascunho.");
      return;
    }
    setSavedId(data.id);
    toast.success("Rascunho guardado. A tarefa não foi publicada.");
    await navigate({ to: "/client/tasks/new", search: { draft: data.id }, replace: true });
  };

  const minDate = toLocalDateTime(new Date(Date.now() + 60_000).toISOString());

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-9">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/client/tasks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar a Minhas tarefas</Link>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA · PAINEL EMPRESARIAL</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{savedId ? "Editar rascunho" : "Criar tarefa"}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Prepara a tarefa em etapas. Nesta fase, só é possível guardar rascunhos; nenhuma campanha será publicada.</p></div>
          <button type="button" onClick={cancel} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"><X className="h-4 w-4" /> Cancelar criação</button>
        </header>

        {loadingDraft ? <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground"><LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />A carregar rascunho…</div>
        : loadError ? <section role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"><ShieldAlert className="mb-2 h-5 w-5" />{loadError}<div className="mt-4"><Link to="/client/tasks" className="font-semibold underline">Voltar às tarefas</Link></div></section>
        : <>
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Etapa {step + 1} de {steps.length}</p><p className="text-xs text-muted-foreground">{Math.round(((step + 1) / steps.length) * 100)}% concluído</p></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: ((step + 1) / steps.length) * 100 + "%" }} /></div>
            <div className="mt-4 grid grid-cols-4 gap-2">{steps.map((item, index) => { const Icon = item.icon; return <button key={item.title} type="button" onClick={() => { if (index <= step) { setStep(index); setValidationError(""); } }} disabled={index > step} className={"flex min-w-0 flex-col items-center gap-1 rounded-xl p-2 text-center text-xs " + (index === step ? "bg-primary/10 font-semibold text-primary" : index < step ? "text-foreground" : "text-muted-foreground opacity-60")}><Icon className="h-4 w-4" /><span>{item.title}</span></button>; })}</div>
          </section>

          <form onSubmit={saveDraft} className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              {step === 0 && <>
                <h2 className="text-lg font-semibold">Escolhe o tipo de serviço</h2><p className="mt-1 text-sm text-muted-foreground">Seleciona uma categoria adequada à atividade pretendida.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">{categories.map((item) => <button key={item.value} type="button" onClick={() => update("category", item.value)} className={"rounded-xl border p-4 text-left transition-colors " + (form.category === item.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:bg-muted/50")}><span className="flex items-start justify-between gap-2"><span className="font-semibold">{item.label}</span>{form.category === item.value && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}</span><span className="mt-2 block text-sm text-muted-foreground">{item.detail}</span></button>)}</div>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Não são permitidas compras de seguidores, likes artificiais, reproduções falsas, avaliações enganosas nem outras ações que violem as regras das plataformas.</div>
              </>}
              {step === 1 && <>
                <h2 className="text-lg font-semibold">Informações da tarefa</h2><p className="mt-1 text-sm text-muted-foreground">Descreve com clareza o que deve ser feito. Não incluas dados sensíveis desnecessários.</p>
                <div className="mt-5 grid gap-4">
                  <label className={labelClass}>Título da tarefa *<input className={inputClass} value={form.title} onChange={(e) => update("title", e.target.value)} maxLength={120} placeholder="Ex.: Responder a um questionário de satisfação" /></label>
                  <label className={labelClass}>Descrição *<textarea className={inputClass} value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} maxLength={5000} placeholder="Explica o contexto e a atividade pretendida." /></label>
                  <label className={labelClass}>Objetivo *<textarea className={inputClass} value={form.objective} onChange={(e) => update("objective", e.target.value)} rows={2} maxLength={1000} placeholder="Qual é o resultado que pretendes alcançar?" /></label>
                  <label className={labelClass}>Instruções para o trabalhador *<textarea className={inputClass} value={form.worker_instructions} onChange={(e) => update("worker_instructions", e.target.value)} rows={4} maxLength={5000} placeholder="Indica os passos, requisitos e cuidados necessários." /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>País ou público-alvo (opcional)<input className={inputClass} value={form.target_country} onChange={(e) => update("target_country", e.target.value)} maxLength={100} placeholder="Ex.: Moçambique" /></label>
                    <label className={labelClass}>Idioma pretendido (opcional)<input className={inputClass} value={form.target_language} onChange={(e) => update("target_language", e.target.value)} maxLength={100} placeholder="Ex.: Português" /></label>
                  </div>
                  <label className={labelClass}>Link de destino {requiresUrl ? "*" : "(opcional)"}<input className={inputClass} type="url" value={form.destination_url} onChange={(e) => update("destination_url", e.target.value)} maxLength={2048} placeholder="https://…" /></label>
                </div>
              </>}
              {step === 2 && <>
                <h2 className="text-lg font-semibold">Quantidade, prazo e critérios</h2><p className="mt-1 text-sm text-muted-foreground">Define o volume pretendido e como será reconhecida uma conclusão válida.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Quantidade de conclusões pretendidas *<input className={inputClass} type="number" min="1" max="100000" step="1" value={form.slots} onChange={(e) => update("slots", e.target.value)} /></label>
                  <label className={labelClass}>Prazo pretendido da campanha *<input className={inputClass} type="datetime-local" min={minDate} value={form.deadline} onChange={(e) => update("deadline", e.target.value)} /></label>
                  <label className={labelClass + " sm:col-span-2"}>Critérios de conclusão válida *<textarea className={inputClass} value={form.completion_criteria} onChange={(e) => update("completion_criteria", e.target.value)} rows={4} maxLength={2000} placeholder="Que condições objetivas devem ser cumpridas para considerar a tarefa concluída?" /></label>
                </div>
              </>}
              {step === 3 && <>
                <h2 className="text-lg font-semibold">Rever informações</h2><p className="mt-1 text-sm text-muted-foreground">Confirma os dados antes de guardar o rascunho.</p>
                <div className="mt-5 space-y-4">
                  <Summary label="Tipo de serviço" value={category?.label ?? "—"} />
                  <Summary label="Título" value={form.title} />
                  <Summary label="Descrição" value={form.description} />
                  <Summary label="Objetivo" value={form.objective} />
                  <Summary label="Instruções" value={form.worker_instructions} />
                  <Summary label="País / público-alvo" value={form.target_country || "Não especificado"} />
                  <Summary label="Idioma" value={form.target_language || "Não especificado"} />
                  <Summary label="Link de destino" value={form.destination_url || "Não aplicável"} />
                  <Summary label="Conclusões pretendidas" value={form.slots} />
                  <Summary label="Prazo" value={form.deadline ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(form.deadline)) : "—"} />
                  <Summary label="Critérios de conclusão" value={form.completion_criteria} />
                  <div className="rounded-xl border border-border bg-muted/30 p-4"><div className="flex items-start gap-3"><CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" /><div><p className="font-semibold">Preço e orçamento ainda indisponíveis</p><p className="mt-1 text-sm text-muted-foreground">Não existem regras de preço empresarial configuradas para calcular um orçamento definitivo. Nenhum preço, comissão ou taxa será estimado nesta etapa. A tarefa não poderá ser publicada nem iniciada.</p></div></div></div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><p className="font-semibold">Guardar não publica</p><p className="mt-1 text-sm text-muted-foreground">O rascunho ficará associado à tua conta. A publicação dependerá de controlos de aprovação, financiamento, validação e segurança que ainda não fazem parte desta etapa.</p></div>
                </div>
              </>}
              {validationError && <div role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{validationError}</div>}
            </section>

            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <button type="button" onClick={cancel} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"><X className="h-4 w-4" /> Cancelar criação</button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {step > 0 && <button type="button" onClick={previous} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Anterior</button>}
                {step < steps.length - 1 ? <button type="button" onClick={next} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">Seguinte <ArrowRight className="h-4 w-4" /></button>
                : <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "A guardar…" : "Guardar rascunho"}</button>}
              </div>
            </div>
          </form>
        </>}
        <p className="text-xs leading-5 text-muted-foreground">Os rascunhos não aparecem no catálogo público e não criam reservas financeiras, pagamentos ou recompensas. Não foi ligada nenhuma API externa nesta etapa.</p>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{value || "—"}</p></div>;
}
function toLocalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
