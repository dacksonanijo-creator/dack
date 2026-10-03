import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, Loader2, RefreshCw, XCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";

type Verification = {
  id: string;
  task_id: string;
  submission_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  task_title: string;
  origin: "company" | "admin" | "provider";
  verification_type: string;
  provider: string | null;
  value: number;
  currency: string;
  status: "PENDING" | "REVIEW";
  decision_reason: string | null;
  created_at: string;
};

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({
    meta: [
      { title: "Verificações — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Fila real do Motor de Verificação TASKORA." },
    ],
  }),
  component: VerificationQueue,
});

function VerificationQueue() {
  const [items, setItems] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Verification | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await (supabase as any).rpc("get_pending_task_verifications");
    if (rpcError) setError(rpcError.message || "Não foi possível carregar a fila.");
    else setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (item: Verification, action: "approve" | "reject") => {
    if (action === "reject" && !reason.trim()) {
      setError("Indique o motivo da rejeição.");
      return;
    }
    if (action === "approve" && !window.confirm("Aprovar esta conclusão e libertar a recompensa através do ledger?")) return;
    if (action === "reject" && !window.confirm("Rejeitar esta conclusão e libertar a reserva?")) return;

    setWorking(item.id);
    setError("");
    const fn = action === "approve" ? "approve_task_verification" : "reject_task_verification";
    const { error: decisionError } = await (supabase as any).rpc(fn, {
      p_verification_id: item.id,
      p_reason: reason.trim() || null,
    });
    setWorking(null);
    if (decisionError) {
      setError(decisionError.message || "A operação não foi concluída.");
      return;
    }
    setSelected(null);
    setReason("");
    await load();
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Verificações pendentes"
        description="Fila central do Motor de Verificação TASKORA. Aprovação e rejeição desencadeiam o fluxo financeiro protegido."
        action={
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Actualizar
          </button>
        }
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A carregar verificações reais…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-semibold">Nenhuma verificação pendente</p>
          <p className="mt-1 text-sm text-muted-foreground">A fila está vazia neste momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold">{item.task_title}</h2>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">{item.status}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{originLabel(item.origin)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.user_name || item.user_email || item.user_id} · {item.verification_type}
                    {item.provider ? ` · ${item.provider}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold">{money(item.value)} {item.currency}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => { setSelected(item); setReason(item.decision_reason || ""); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
                  <Eye className="h-3.5 w-3.5" /> Ver detalhes
                </button>
                <button type="button" disabled={working === item.id} onClick={() => void decide(item, "approve")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar e libertar
                </button>
                <button type="button" disabled={working === item.id} onClick={() => { setSelected(item); setReason(""); }} className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50">
                  <XCircle className="h-3.5 w-3.5" /> Rejeitar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{selected.task_title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Submissão {selected.submission_id}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-sm text-muted-foreground">Fechar</button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Info label="Utilizador" value={selected.user_name || selected.user_email || selected.user_id} />
              <Info label="Origem" value={originLabel(selected.origin)} />
              <Info label="Método" value={selected.verification_type} />
              <Info label="Valor" value={`${money(selected.value)} ${selected.currency}`} />
            </div>

            <label className="mt-4 block text-xs font-semibold">
              Observação / motivo
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Obrigatório para rejeição." />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">Cancelar</button>
              <button type="button" onClick={() => void decide(selected, "reject")} disabled={working === selected.id} className="rounded-xl border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive">Rejeitar</button>
              <button type="button" onClick={() => void decide(selected, "approve")} disabled={working === selected.id} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Aprovar e libertar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function originLabel(origin: Verification["origin"]) {
  return origin === "company" ? "Empresa" : origin === "admin" ? "ADM" : "Fornecedor/API";
}

function money(value: number) {
  return new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold break-words">{value}</p></div>;
}
