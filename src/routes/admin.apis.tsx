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
  const [lastTestAt, setLastTestAt] = useState<string | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(true);

  const [ayetApiKey, setAyetApiKey] = useState("");
  const [showAyetApiKey, setShowAyetApiKey] = useState(false);
  const [ayetAdslotId, setAyetAdslotId] = useState("");
  const [ayetStatus, setAyetStatus] = useState<ConnectionStatus>("idle");
  const [ayetMessage, setAyetMessage] = useState("");
  const [ayetLastTestAt, setAyetLastTestAt] = useState<string | null>(null);
  const [ayetApiKeyConfigured, setAyetApiKeyConfigured] = useState(false);
  const [showAyetConfiguration, setShowAyetConfiguration] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.functions.invoke("offerwall-ad-test", {
        body: { action: "get_configuration" },
      });
      if (data) {
        if (typeof data.endpoint === "string") setEndpoint(data.endpoint);
        if (typeof data.testedAt === "string") setLastTestAt(data.testedAt);
        setApiKeyConfigured(Boolean(data.apiKeyConfigured));
        if (data.status && statusCopy[data.status as ConnectionStatus]) setStatus(data.status as ConnectionStatus);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.functions.invoke("ayet-studios-test", {
        body: { action: "get_configuration" },
      });
      if (data) {
        if (typeof data.adslotId === "string") setAyetAdslotId(data.adslotId);
        if (typeof data.testedAt === "string") setAyetLastTestAt(data.testedAt);
        setAyetApiKeyConfigured(Boolean(data.apiKeyConfigured));
        if (data.status && statusCopy[data.status as ConnectionStatus]) {
          setAyetStatus(data.status as ConnectionStatus);
        }
      }
    })();
  }, []);

  const invoke = async (action: "save_configuration" | "test_connection") => {
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

  const invokeAyet = async (action: "save_configuration" | "test_connection") => {
    const { data, error } = await supabase.functions.invoke("ayet-studios-test", {
      body: {
        action,
        adslotId: ayetAdslotId.trim() || undefined,
        ...(ayetApiKey.trim() ? { apiKey: ayetApiKey.trim() } : {}),
      },
    });

    if (error) {
      setAyetStatus("communication_error");
      setAyetMessage("Não foi possível comunicar com o backend do TASKORA.");
      return;
    }

    const nextStatus = (data?.status ?? "communication_error") as ConnectionStatus;
    setAyetStatus(statusCopy[nextStatus] ? nextStatus : "communication_error");
    setAyetMessage(
      typeof data?.message === "string"
        ? data.message
        : "A operação terminou sem uma mensagem de diagnóstico.",
    );

    if (typeof data?.testedAt === "string") {
      setAyetLastTestAt(data.testedAt);
    }
    if (typeof data?.apiKeyConfigured === "boolean") {
      setAyetApiKeyConfigured(data.apiKeyConfigured);
    }
  };

  const saveAyetConfiguration = async () => {
    setAyetStatus("saving");
    setAyetMessage("");
    await invokeAyet("save_configuration");
  };

  const testAyetConnection = async () => {
    setAyetStatus("loading");
    setAyetMessage("");
    await invokeAyet("test_connection");
  };

  const current = statusCopy[status];
  const StatusIcon = current.icon;
  const ayetCurrent = statusCopy[ayetStatus];
  const AyetStatusIcon = ayetCurrent.icon;

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

        <div className="space-y-6 px-5 py-6 sm:px-6">
          {!showConfiguration && (
            <div className="rounded-xl border border-border bg-background p-5">
              <p className="text-sm font-semibold text-foreground">Configuração da API</p>
              <p className="mt-1 text-xs text-muted-foreground">API Key: {apiKeyConfigured ? "Configurada com segurança no backend" : "Não configurada"} · Endpoint: {endpoint || "Não definido"}</p>
            </div>
          )}

          {showConfiguration && (
          <>
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Configurar fornecedor</p>
                <p className="text-xs text-muted-foreground">Offerwall Ad · Ambiente de produção</p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfiguration((visible) => !visible)}
                className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                {showConfiguration ? "Fechar configuração" : "Configurar"}
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
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
                A API Key não é incluída no código, GitHub, URL, localStorage ou logs. Quando guardada pelo painel, fica armazenada no Supabase Vault e só o backend pode recuperá-la para testar a conexão.
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

          </>
          )}

          <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
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


      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border/70 bg-muted/20 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ServerCog className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">ayeT-Studios</h2>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Offerwall / Surveywall API
                  </span>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Produção
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Segundo fornecedor externo preparado para integração futura de ofertas e surveys.
                </p>
              </div>
            </div>

            <div className={cn("flex shrink-0 items-center gap-2 text-sm font-semibold", ayetCurrent.className)}>
              <AyetStatusIcon className={cn("h-4 w-4", (ayetStatus === "loading" || ayetStatus === "saving") && "animate-spin")} />
              {ayetCurrent.label}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-6">
          {!showAyetConfiguration && (
            <div className="rounded-xl border border-border bg-background p-5">
              <p className="text-sm font-semibold text-foreground">Configuração do ayeT-Studios</p>
              <p className="mt-1 text-xs text-muted-foreground">
                API Key: {ayetApiKeyConfigured ? "Configurada com segurança no backend" : "Não configurada"} · Adslot ID: {ayetAdslotId || "Não definido"} · Ambiente: Produção
              </p>
            </div>
          )}

          {showAyetConfiguration && (
            <>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Configurar fornecedor</p>
                    <p className="text-xs text-muted-foreground">ayeT-Studios · Offerwall / Surveywall API · Ambiente de produção</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
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
                      value={ayetApiKey}
                      onChange={(event) => {
                        setAyetApiKey(event.target.value);
                        setAyetStatus("idle");
                        setAyetMessage("");
                      }}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                      type={showAyetApiKey ? "text" : "password"}
                      placeholder={ayetApiKeyConfigured ? "API Key já configurada — deixe vazio para manter" : "Cole a API Key do ayeT-Studios"}
                      autoComplete="new-password"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAyetApiKey((visible) => !visible)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={showAyetApiKey ? "Ocultar API Key" : "Mostrar API Key"}
                    >
                      {showAyetApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    A chave é enviada por HTTPS ao backend, guardada no Supabase Vault e nunca devolvida completa ao frontend, ao GitHub ou aos logs.
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Adslot ID</span>
                  <input
                    value={ayetAdslotId}
                    onChange={(event) => {
                      setAyetAdslotId(event.target.value.replace(/\D/g, ""));
                      setAyetStatus("idle");
                      setAyetMessage("");
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    inputMode="numeric"
                    placeholder="Ex.: 12345"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    O ID do adslot é obtido no painel do ayeT-Studios, conforme a documentação oficial.
                  </p>
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Ambiente</span>
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm font-medium text-foreground">
                    Produção · Live Server
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Nesta etapa é usado somente o Live Server documentado pelo ayeT-Studios.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Tipo</span>
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm font-medium text-foreground">
                    Offerwall / Surveywall API
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    A estrutura fica preparada para os dois formatos; nenhuma sincronização automática é executada nesta fase.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Guardar configuração</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Guarda o Adslot ID e, quando informada, a API Key de forma segura no backend. A chave nunca é exibida novamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void saveAyetConfiguration()}
                  disabled={ayetStatus === "loading" || ayetStatus === "saving"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {ayetStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar configuração
                </button>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Teste de conexão</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Testa o Adslot ID através do endpoint Offerwall oficial do ayeT-Studios. A API Key permanece somente no backend.
                  </p>
                  {ayetLastTestAt && (
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      Último teste: {new Date(ayetLastTestAt).toLocaleString("pt-MZ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void testAyetConnection()}
                  disabled={ayetStatus === "loading" || ayetStatus === "saving"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {ayetStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  Testar conexão
                </button>
              </div>

              {ayetMessage && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
                    ayetStatus === "connected"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : ayetStatus === "authentication_error" || ayetStatus === "endpoint_error"
                        ? "border-destructive/20 bg-destructive/5 text-destructive"
                        : "border-border bg-muted/20 text-muted-foreground",
                  )}
                >
                  {ayetMessage}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Segurança da credencial
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    A API Key não é incluída no código, GitHub, URL, localStorage ou logs. O backend é o único componente autorizado a recuperá-la.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ServerCog className="h-4 w-4 text-primary" />
                    Próxima fase
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Consultar ofertas, filtros por país/dispositivo, callbacks, chargebacks, conversões e deduplicação ficam preparados para uma fase posterior. Não são executados agora.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                Documentação oficial:{" "}
                <a
                  href="https://www.ayetstudios.com/openapi/publisher-doc"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  ayeT-Studios Publisher API
                </a>
                . O teste usa o endpoint Offerwall documentado e não inventa endpoints ou parâmetros.
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
