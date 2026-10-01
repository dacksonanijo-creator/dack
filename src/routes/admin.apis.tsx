import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, CircleAlert, KeyRound, Loader2, ServerCog, ShieldCheck, WifiOff } from "lucide-react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/apis")({
  head: () => ({
    meta: [
      { title: "APIs de tarefas — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Integrações com fornecedores externos de tarefas." },
    ],
  }),
  component: Page,
});

type ConnectionStatus = "idle" | "loading" | "connected" | "authentication_error" | "communication_error" | "not_configured";

const statusCopy: Record<ConnectionStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  idle: { label: "Ainda não testado", icon: ServerCog, className: "text-muted-foreground" },
  loading: { label: "A testar conexão…", icon: Loader2, className: "text-primary" },
  connected: { label: "Conectado", icon: CheckCircle2, className: "text-emerald-600" },
  authentication_error: { label: "Erro de autenticação", icon: CircleAlert, className: "text-destructive" },
  communication_error: { label: "Erro de comunicação", icon: WifiOff, className: "text-amber-600" },
  not_configured: { label: "Não configurado", icon: KeyRound, className: "text-muted-foreground" },
};

function Page() {
  const [endpoint, setEndpoint] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [message, setMessage] = useState("");

  const testConnection = async () => {
    setStatus("loading");
    setMessage("");

    const { data, error } = await supabase.functions.invoke("offerwall-ad-test", {
      body: {
        endpoint: endpoint.trim() || undefined,
      },
    });

    if (error) {
      setStatus("communication_error");
      setMessage("Não foi possível executar o teste de conexão.");
      return;
    }

    const nextStatus = (data?.status ?? "communication_error") as ConnectionStatus;
    setStatus(statusCopy[nextStatus] ? nextStatus : "communication_error");
    setMessage(typeof data?.message === "string" ? data.message : "O teste terminou sem uma mensagem de diagnóstico.");
  };

  const current = statusCopy[status];
  const StatusIcon = current.icon;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="APIs de tarefas"
        description="Integrações com fornecedores externos de tarefas. Nesta fase, configurar e testar apenas a conexão do Offerwall Ad."
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border/70 bg-muted/20 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ServerCog className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Offerwall Ad</h2>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Produção
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Publisher API preparada para conexão server-side. A sincronização de ofertas e os Postbacks S2S serão ativados numa fase seguinte.
                </p>
              </div>
            </div>

            <div className={cn("flex shrink-0 items-center gap-2 text-sm font-semibold", current.className)}>
              <StatusIcon className={cn("h-4 w-4", status === "loading" && "animate-spin")} />
              {current.label}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">API Key</span>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                <KeyRound className="h-4 w-4 shrink-0 text-primary" />
                <code className="min-w-0 flex-1 truncate text-sm">OFFERWALL_AD_API_KEY</code>
                <span className="shrink-0 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Secret backend
                </span>
              </div>
              <p className="text-xs text-muted-foreground">A chave nunca é recebida pelo frontend. Configure o valor real como secret no Supabase Edge Functions.</p>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Endpoint oficial da API</span>
              <input
                value={endpoint}
                onChange={(event) => {
                  setEndpoint(event.target.value);
                  setStatus("idle");
                  setMessage("");
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                type="url"
                placeholder="Cole aqui o endpoint indicado na documentação oficial"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">O TASKORA não inventa nem assume um endpoint. Use exatamente o endpoint fornecido pelo Offerwall Ad.</p>
            </label>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Estado da integração</p>
              <p className="mt-1 text-xs text-muted-foreground">O teste é executado no backend/Edge Function e usa autenticação Bearer.</p>
            </div>
            <button
              type="button"
              onClick={() => void testConnection()}
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4 rotate-45" />}
              Testar conexão
            </button>
          </div>

          {message && (
            <div className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              status === "connected" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
              status === "authentication_error" ? "border-destructive/20 bg-destructive/5 text-destructive" :
              "border-border bg-muted/20 text-muted-foreground",
            )}>
              {message}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Segurança</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">A API Key nunca é gravada no código, GitHub, banco público ou interface pública. O backend pode ler <code>OFFERWALL_AD_API_KEY</code> como secret.</p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4 text-primary" /> Próxima fase preparada</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">A estrutura deixa espaço para ofertas, filtros por país/dispositivo, sincronização, Postback S2S, reversões e idempotência sem mexer na carteira nesta fase.</p>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            Documentação oficial: <a href="https://offerwall.ad/offerwall-api" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Offerwall API</a>. A API oficial usa <code>Authorization: Bearer &lt;API_KEY&gt;</code>; não foi adicionado nenhum endpoint não confirmado.
          </div>
        </div>
      </section>
    </div>
  );
}
