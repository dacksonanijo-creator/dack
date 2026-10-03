import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Percent, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/finance/distribution")({
  head: () => ({
    meta: [
      { title: "Regras de distribuição — Financeiro | Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Percentagem da receita TASKORA aplicada às novas distribuições de tarefas." },
    ],
  }),
  component: DistributionRulesPage,
});

type Rule = {
  id: string;
  version: number;
  taskora_percent: number;
  user_percent: number;
  effective_from: string;
  reason: string | null;
};

function DistributionRulesPage() {
  const [rule, setRule] = useState<Rule | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const client = supabase as any;
    const { data, error: loadError } = await client.rpc("get_taskora_distribution_rule");
    if (loadError) {
      setError(loadError.message || "Não foi possível carregar a regra financeira.");
    } else {
      const current = Array.isArray(data) ? data[0] ?? null : data ?? null;
      setRule(current);
      setValue(current ? String(current.taskora_percent) : "");
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const userPercent = value === "" || Number.isNaN(Number(value))
    ? 100
    : Math.max(0, Math.min(100, 100 - Number(value)));

  const normalized = Number(value);
  const valid = Number.isFinite(normalized) && normalized >= 0 && normalized <= 100;

  const save = async () => {
    if (!valid || saving) return;

    const previous = rule?.taskora_percent;
    const confirmed = window.confirm(
      previous == null
        ? `Definir a percentagem TASKORA em ${normalized}%?\n\nUtilizador: ${100 - normalized}%.\n\nA regra será aplicada somente às novas distribuições elegíveis.`
        : `Alterar a percentagem do TASKORA de ${previous}% para ${normalized}%?\n\nUtilizador: ${100 - normalized}%.\n\nEsta alteração será aplicada somente às novas distribuições elegíveis. Transacções anteriores não serão alteradas.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const client = supabase as any;
    const { data, error: saveError } = await client.rpc("set_taskora_distribution_percent", {
      p_taskora_percent: normalized,
      p_reason: reason.trim() || null,
    });

    if (saveError) {
      setError(saveError.message || "Não foi possível guardar a regra.");
    } else {
      const next = Array.isArray(data) ? data[0] ?? null : data ?? null;
      setRule(next);
      setValue(next ? String(next.taskora_percent) : String(normalized));
      setReason("");
      setSuccess("Regra de distribuição actualizada. As transacções anteriores permanecem inalteradas.");
    }

    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Regras de distribuição"
        description="Define apenas a percentagem do TASKORA. A percentagem do utilizador é calculada automaticamente para completar 100%."
      />

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Percent className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Regra actual</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A regra fica congelada em cada conversão no momento do reconhecimento financeiro.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">TASKORA</p>
            <p className="mt-1 text-2xl font-bold">{loading ? "…" : rule ? `${rule.taskora_percent}%` : "Não definida"}</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Utilizador</p>
            <p className="mt-1 text-2xl font-bold">{loading ? "…" : rule ? `${rule.user_percent}%` : "—"}</p>
          </div>
        </div>

        {rule && (
          <p className="mt-3 text-xs text-muted-foreground">
            Versão {rule.version} · efectiva desde {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(rule.effective_from))}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Editar percentagem</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Introduza somente a percentagem do TASKORA. O backend calcula automaticamente a parte do utilizador.
            </p>
          </div>
        </div>

        <div className="mt-5 max-w-sm">
          <label className="text-xs font-medium text-muted-foreground">Percentagem TASKORA</label>
          <div className="mt-1 flex items-center rounded-xl border border-border bg-background focus-within:border-primary/50">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value.replace(",", "."))}
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              placeholder="Ex.: 20"
              className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <span className="px-3 text-sm text-muted-foreground">%</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Utilizador: <strong className="text-foreground">{valid ? userPercent : "—"}%</strong> · soma obrigatória: 100%
          </p>
        </div>

        <div className="mt-4 max-w-lg">
          <label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            placeholder="Ex.: ajuste comercial da plataforma"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!valid || saving || loading}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "A guardar…" : "Guardar nova percentagem"}
          </button>
          <p className="text-xs text-muted-foreground">
            Alterações anteriores não são recalculadas.
          </p>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Importante:</strong> uma conversão confirmada guarda a percentagem, regra, valores e identificadores no ledger. Reversões criam novos lançamentos e não apagam o original.
      </div>
    </div>
  );
}
