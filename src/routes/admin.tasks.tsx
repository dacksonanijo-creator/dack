import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  PauseCircle,
  RefreshCw,
  Server,
  Wifi,
  XCircle,
  Activity,
} from "lucide-react";

type ProviderKey = "offerwall_ad" | "ayet_studios";
type TechnicalStatus = "not_configured" | "connected" | "attention" | "error" | "disabled";

type Provider = {
  provider: ProviderKey;
  display_name: string;
  status: TechnicalStatus;
  enabled: boolean;
  credentials_configured: boolean;
  last_test_at: string | null;
  last_communication_at: string | null;
};

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({
    meta: [
      { title: "Tarefas — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Tarefas e fontes de tarefas activas no Taskora." },
    ],
  }),
  component: Page,
});

function Page() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("task-providers", {
        body: { action: "list" },
      });

      if (invokeError) throw new Error("Não foi possível carregar o estado das APIs de tarefas.");

      const list = Array.isArray(data?.providers)
        ? data.providers
        : Array.isArray(data)
          ? data
          : [];

      const normalized: Provider[] = list
        .filter((item: any) => item.provider_key === "offerwall_ad" || item.provider_key === "ayet_studios")
        .map((item: any) => ({
          provider: item.provider_key as ProviderKey,
          display_name: item.display_name,
          status: normalizeStatus(item.status),
          enabled: Boolean(item.enabled),
          credentials_configured: Boolean(item.credentials_configured),
          last_test_at: item.last_test_at ?? null,
          last_communication_at: item.last_communication_at ?? null,
        }));

      setProviders(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const refreshOnFocus = () => void load(true);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    // Mantém esta página sincronizada com alterações feitas em Admin → APIs de tarefas.
    const interval = window.setInterval(() => void load(true), 15000);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.clearInterval(interval);
    };
  }, [load]);

  const activeProviders = providers.filter((provider) => provider.enabled);
  const configuredProviders = providers.filter((provider) => provider.credentials_configured);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tarefas"
        description="Fontes de tarefas, estado das integrações e disponibilidade real de ofertas."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/tasks/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Criar tarefa
            </Link>
            <Link
              to="/admin/verifications"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Verificações pendentes
            </Link>
          </div>
        }
      />

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Erro ao actualizar as fontes de tarefas</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Fontes de tarefas activas</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta área utiliza o estado real das integrações definido em Admin → APIs de tarefas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            A verificar as integrações…
          </div>
        ) : activeProviders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-6">
            <div className="flex items-start gap-3">
              <PauseCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Nenhuma fonte de tarefas activa</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure e active uma integração em <strong>Admin → APIs de tarefas</strong>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {activeProviders.map((provider) => (
              <ProviderCard key={provider.provider} provider={provider} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ActivityIcon />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Disponibilidade de tarefas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A sincronização automática de ofertas ainda não está configurada nesta etapa. Por isso, o sistema não inventa quantidade nem data de sincronização.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-5">
          <p className="font-semibold">Sincronização de ofertas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando a sincronização for implementada, esta área passará a apresentar automaticamente a quantidade real de ofertas/tarefas disponíveis e a última sincronização real por fornecedor.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Ofertas disponíveis" value="—" />
            <Info label="Última sincronização" value="—" />
          </div>
        </div>
      </section>

      {configuredProviders.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">Estado das integrações configuradas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Integrações configuradas mas desactivadas continuam visíveis aqui para distinguir configuração de utilização.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {configuredProviders.map((provider) => (
              <ConfiguredProviderRow key={provider.provider} provider={provider} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Tarefas activas" value="—" />
          <Info label="Tarefas concluídas" value="—" />
          <Info label="Submissões e provas" value="—" />
          <Info label="Rejeições e motivos" value="—" />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Estes indicadores só serão preenchidos quando existirem consultas administrativas reais para essas métricas.
        </p>
      </section>
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const status = presentation(provider);

  return (
    <article className="rounded-2xl border border-border bg-background/60 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">{provider.display_name}</h3>
            <StatusBadge kind={status.kind} label={status.label} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {provider.provider === "offerwall_ad" ? "API de ofertas" : "Offerwall / Surveywall API"}
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Activada</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Info label="Estado da integração" value={status.label} />
        <Info label="Ofertas disponíveis" value="—" />
        <Info label="Última verificação" value={formatDate(provider.last_test_at)} />
        <Info label="Última sincronização" value="—" />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-sm font-medium">Activa — sincronização ainda não configurada</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A integração está activa conforme Admin → APIs de tarefas. A quantidade de ofertas e a última sincronização só aparecerão quando houver sincronização real.
        </p>
      </div>

      {provider.status === "error" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Erro de conexão registado na integração. Consulte Admin → APIs de tarefas para testar novamente.</span>
        </div>
      )}

      {provider.status === "attention" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>A integração está activa, mas requer atenção técnica.</span>
        </div>
      )}
    </article>
  );
}

function ConfiguredProviderRow({ provider }: { provider: Provider }) {
  const status = presentation(provider);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{provider.display_name}</span>
          <StatusBadge kind={status.kind} label={provider.enabled ? status.label : "Desactivado"} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Última verificação: {formatDate(provider.last_test_at)} · Última comunicação: {formatDate(provider.last_communication_at)}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">Admin → APIs de tarefas</span>
    </div>
  );
}

function presentation(provider: Provider) {
  if (!provider.enabled) {
    return { kind: "disabled" as const, label: "Desactivado" };
  }
  if (provider.status === "connected") {
    return { kind: "connected" as const, label: "Activo e operacional" };
  }
  if (provider.status === "attention") {
    return { kind: "attention" as const, label: "Activo, mas com atenção" };
  }
  if (provider.status === "error") {
    return { kind: "error" as const, label: "Erro de conexão" };
  }
  return { kind: "not_configured" as const, label: "Não configurado" };
}

function StatusBadge({
  kind,
  label,
}: {
  kind: "connected" | "attention" | "error" | "disabled" | "not_configured";
  label: string;
}) {
  const classes = {
    connected: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    attention: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    disabled: "border-border bg-muted text-muted-foreground",
    not_configured: "border-border bg-muted text-muted-foreground",
  }[kind];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}>
      {kind === "connected" ? <CheckCircle2 className="h-3.5 w-3.5" /> : kind === "error" ? <XCircle className="h-3.5 w-3.5" /> : kind === "attention" ? <AlertCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function ActivityIcon() {
  return <Activity className="mt-0.5 h-5 w-5 text-muted-foreground" />;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function normalizeStatus(value: unknown): TechnicalStatus {
  if (value === "connected" || value === "attention" || value === "error" || value === "disabled" || value === "not_configured") {
    return value;
  }
  return "not_configured";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
