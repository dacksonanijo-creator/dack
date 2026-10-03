import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/tasks/new")({
  head: () => ({ meta: [{ title: "Criar tarefa — Admin Taskora" }, { name: "robots", content: "noindex" }] }),
  component: CreateAdminTask,
});

function CreateAdminTask() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", category: "general", reward: "", currency: "MZN",
    slots: "1", budget: "", deadline: "", method: "manual",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const reward = Number(form.reward);
  const slots = Number(form.slots);
  const minimumBudget = Number.isFinite(reward) && Number.isFinite(slots) ? reward * slots : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    const { error: saveError } = await (supabase as any).rpc("create_admin_task", {
      p_title: form.title, p_description: form.description, p_category: form.category,
      p_reward: reward, p_currency: form.currency, p_slots: slots,
      p_budget_total: Number(form.budget), p_deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      p_verification_method: form.method, p_verification_rules: {},
    });
    setSaving(false);
    if (saveError) { setError(saveError.message || "Não foi possível criar a tarefa."); return; }
    navigate({ to: "/admin/tasks" });
  };

  return (
    <div className="space-y-5">
      <Link to="/admin/tasks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para Tarefas
      </Link>
      <AdminPageHeader title="Criar tarefa" description="Tarefa administrativa usando o mesmo Motor de Verificação e Ledger Financeiro." />

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Título"><input required value={form.title} onChange={e=>set("title",e.target.value)} /></Field>
          <Field label="Categoria"><input required value={form.category} onChange={e=>set("category",e.target.value)} /></Field>
          <Field label="Valor por conclusão"><input required min="0.01" step="0.01" type="number" value={form.reward} onChange={e=>set("reward",e.target.value)} /></Field>
          <Field label="Moeda"><input required maxLength={3} value={form.currency} onChange={e=>set("currency",e.target.value.toUpperCase())} /></Field>
          <Field label="Número de vagas"><input required min="1" step="1" type="number" value={form.slots} onChange={e=>set("slots",e.target.value)} /></Field>
          <Field label={`Orçamento total · mínimo ${minimumBudget.toFixed(2)} ${form.currency}`}><input required min={minimumBudget || 0} step="0.01" type="number" value={form.budget} onChange={e=>set("budget",e.target.value)} /></Field>
          <Field label="Prazo"><input type="datetime-local" value={form.deadline} onChange={e=>set("deadline",e.target.value)} /></Field>
          <Field label="Método de verificação">
            <select value={form.method} onChange={e=>set("method",e.target.value)}>
              <option value="manual">Revisão manual</option>
              <option value="automatic">Automática</option>
              <option value="code">Código de confirmação</option>
              <option value="external_event">Evento externo</option>
              <option value="automatic_manual_review">Automática + revisão manual</option>
            </select>
          </Field>
        </div>
        <label className="block text-sm font-medium">Descrição
          <textarea required rows={5} value={form.description} onChange={e=>set("description",e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-primary" />
        </label>
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          O orçamento é obrigatório para tarefas remuneradas. Cada conclusão reserva o valor correspondente antes da verificação; a recompensa só fica disponível após aprovação.
        </div>
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <CheckCircle2 className="h-4 w-4" /> {saving ? "A criar…" : "Criar tarefa"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<span className="[&_input]:mt-1 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:outline-none [&_input]:focus:border-primary [&_select]:mt-1 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2">{children}</span></label>;
}
