import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  ServerCog,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
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

type ConnectionStatus =
  | "idle"
  | "loading"
  | "saving"
  | "connected"
  | "authentication_error"
  | "endpoint_error"
  | "communication_error"
  | "not_configured";

const statusCopy: Record<
  ConnectionStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  idle: { label: "Não configurado", icon: ServerCog, className: "text-muted-foreground" },
  loading: { label: "A testar conexão…", icon: Loader2, className: "text-primary" },
  saving: { label: "A guardar…", icon: Loader2, className: "text-primary" },
  connected: { label: "Conectado", icon: CheckCircle2, className: "text-emerald-600" },
  authentication_error: { label: "Chave inválida", icon: CircleAlert, className: "text-destructive" },
  endpoint_error: { label: "Endpoint inválido", icon: CircleAlert, className: "text-destructive" },
  communication_error: { label: "Erro de comunicação", icon: WifiOff, className: "text-amber-600" },
  not_configured: { label: "Não configurado", icon: KeyRound, className: "text-muted-foreground" },
};

function Page() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [message, setMessage] = useState("");
  const [lastTestAt, setLastTestAt] = useState<string | null>(null);\n  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);\n  const [showConfiguration, setShowConfiguration] = useState(false);

  useEffect(() => {\n    void (async () => {\n      const { data } = await supabase.functions.invoke("offerwall-ad-test", {\n        body: { action: "get_configuration" },\n      });\n      if (data) {\n        if (typeof data.endpoint === "string") setEndpoint(data.endpoint);\n        if (typeof data.testedAt === "string") setLastTestAt(data.testedAt);\n        setApiKeyConfigured(Boolean(data.apiKeyConfigured));\n        if (data.status && statusCopy[data.status as ConnectionStatus]) setStatus(data.status as ConnectionStatus);\n      }\n    })();\n  }, []);\n\n  const invoke = async (action: "save_configuration" | "test_connection") => {
    const { data, error } = await supabase.functions.invoke("offerwall-ad-test", {
      body: {
        action,
        endpoint: endpoint.trim() || undefined,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      },
    });

    if (error) {
      setStatus("communication_error");
      setMessage("Não foi possível comunicar com o backend do TASKORA.");
      return;
    }

    const nextStatus = (data?.status ?? "communication_error") as ConnectionStatus;
    setStatus(statusCopy[nextStatus] ? nextStatus : "communication_error");
    setMessage(
      typeof data?.message === "string"
        ? data.message
        : "A operação terminou sem uma mensagem de diagnóstico.",
    );

    if (typeof data?.testedAt === "string") {
      setLastTestAt(data.testedAt);
    }
  };

  const saveConfiguration = async () => {
    setStatus("saving");
    setMessage("");
    await invoke("save_configuration");
  };

  const testConnection = async () => {
    setStatus("loading");
    setMessage("");
    await invoke("test_connection");
  };

  const current = statusCopy[status];
  const StatusIcon = current.icon;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="APIs de tarefas"
        description="Configure e teste fornecedores externos de tarefas. O primeiro fornecedor disponível é o Offerwall Ad."
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
                    API de ofertas
                  </span>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Produção
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configuração inicial do fornecedor. Sincronização de ofertas, Postbacks S2S e conversões ficam para a próxima etapa.
                </p>
              </div>
            </div>

            <div className={cn("flex shrink-0 items-center gap-2 text-sm font-semibold", current.className)}>
              <StatusIcon className={cn("h-4 w-4", (status === "loading" || status === "saving") && "animate-spin")} />
              {current.label}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-6">\n          {!showConfiguration && (\n            <div className="rounded-xl border border-border bg-background p-5">\n              <p className="text-sm font-semibold text-foreground">Configuração da API</p>\n              <p className="mt-1 text-xs text-muted-foreground">API Key: {apiKeyConfigured ? "Configurada com segurança no backend" : "Não configurada"} · Endpoint: {endpoint || "Não definido"}</p>\n            </div>\n          )}\n\n          {showConfiguration && (
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Configurar fornecedor</p>
                <p className="text-xs text-muted-foreground">Offerwall Ad · Ambiente de produção</p>
              </div>
              <button\n                type="button"\n                onClick={() => setShowConfiguration((visible) => !visible)}\n                className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"\n              >\n                {showConfiguration ? "Fechar configuração" : "Configurar"}\n              </button>\n              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
                Área administrativa protegida
              </span>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">API Key</span>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                <KeyRound className="h-4 w-4 shrink-0 text-primary" />
                <input
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    setStatus("idle");
                    setMessage("");
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  type={showApiKey ? "text" : "password"}
                  placeholder={apiKeyConfigured ? "API Key já configurada — deixe vazio para manter" : "Cole a API Key do Offerwall Ad"}
                  autoComplete="new-password"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((visible) => !visible)}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label={showApiKey ? "Ocultar API Key" : "Mostrar API Key"}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                A chave é enviada por HTTPS ao backend. Depois de guardada, não é exibida novamente e fica protegida no Supabase Vault; nunca é colocada no GitHub, localStorage ou logs.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Endpoint da API</span>
              <input
                value={endpoint}
                onChange={(event) => {
                  setEndpoint(event.target.value);
                  setStatus("idle");
                  setMessage("");
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                type="url"
                placeholder="Endpoint oficial fornecido pelo Offerwall Ad"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Não existe endpoint inventado pelo TASKORA. Informe exatamente o endpoint indicado na documentação ou painel oficial do fornecedor.
              </p>
            </label>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Guardar configuração</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Guarda o endpoint e, quando informada, a API Key de forma segura no backend. A chave nunca é devolvida ao frontend depois de guardada.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveConfiguration()}
              disabled={status === "loading" || status === "saving"}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar configuração
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Teste de conexão</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                O teste usa a API Key digitada ou, se vazia, o secret <code>OFFERWALL_AD_API_KEY</code> configurado no backend.
              </p>
              {lastTestAt && (
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Último teste: {new Date(lastTestAt).toLocaleString("pt-MZ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void testConnection()}
              disabled={status === "loading" || status === "saving"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Testar conexão
            </button>
          </div>

          {message && (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                status === "connected"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : status === "authentication_error" || status === "endpoint_error"
                    ? "border-destructive/20 bg-destructive/5 text-destructive"
                    : "border-border bg-muted/20 text-muted-foreground",
              )}
            >
              {message}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Segurança da credencial
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                A API Key não é incluída no código, GitHub, URL, localStorage, banco de dados ou logs. Para uso persistente no backend, configure <code>OFFERWALL_AD_API_KEY</code> como secret do Supabase Edge Functions.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4 text-primary" />
                Próxima fase
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Depois de confirmar a conexão, avançaremos separadamente para sincronização de ofertas. Postbacks, callbacks, conversões, carteira, pagamentos e recompensas continuam desativados.
              </p>
            </div>
          </div>

          </div>}\n\n          <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            Documentação oficial:{" "}
            <a
              href="https://offerwall.ad/offerwall-api"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Offerwall API
            </a>
            . A autenticação utiliza Bearer e nenhum endpoint é assumido pelo TASKORA.
          </div>
        </div>
      </section>
    </div>
  );
}
