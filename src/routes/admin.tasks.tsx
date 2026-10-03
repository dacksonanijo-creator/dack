import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, Clock3, Loader2, RefreshCw, Server, Wifi, XCircle } from "lucide-react";

type ProviderKey = "offerwall_ad" | "ayet_studios";
type Provider = {
  provider: ProviderKey;
  display_name: string;
  status: "not_configured" | "connected" | "attention" | "error" | "disabled";
  enabled: boolean;
  credentials_configured: boolean;
  last_test_at: string | null;
  last_communication_at: string | null;
};

type TaskStats = {
  active: number;
  external: number;
  offerwallAd: number;
  ayetStudios: number;
};

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({
    meta: [
      { title: "Tarefas — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Monitorização real das tarefas e dos fornecedores activos." },
    ],
  }),
  component: Page,
});

function Page() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<TaskStats>({ active: 0, external: 0, offerwallAd: 0, ayetStudios: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [providerResult, activeResult, offerwallResult, ayetResult] = await Promise.all([
        supabase.functions.invoke("task-providers", { body: { action: "list" } }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "active").eq("external_source", "offerwall_ad"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "active").eq("external_source", "ayet_studios"),
      ]);

      if (providerResult.error) throw new Error("Não foi possível carregar o estado dos fornecedores.");
      if (activeResult.error || offerwallResult.error || ayetResult.error) {
        throw new Error("Não foi possível carregar a disponibilidade actual de tarefas.");
      }

      const list = Array.isArray(providerResult.data?.providers)
        ? providerResult.data.providers
        : Array.isArray(providerResult.data)
          ? providerResult.data
          : [];

      const normalized = list
        .filter((item: any) => item.provider_key === "offerwall_ad" || item.provider_key === "ayet_studios")
        .map((item: any) => ({
          provider: item.provider_key as ProviderKey,
          display_name: item.display_name,
          status: item.status,
          enabled: Boolean(item.enabled),
          credentials_configured: Boolean(item.credentials_configured),
          last_test_at: item.last_test_at ?? null,
          last_communication_at: item.last_communication_at ?? null,
        }));

      setProviders(normalized);
      setStats({
        active: activeResult.count ?? 0,
        external: (offerwallResult.count ?? 0) + (ayetResult.count ?? 0),
        offerwallAd: offerwallResult.count ?? 0,
        ayetStudios: ayetResult.count ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const supplyingProviders = providers.filter(
    (provider) => provider.enabled && provider.status === "connected" &&
      ((provider.provider === "offerwall_ad" && stats.offerwallAd > 0) ||
       (provider.provider === "ayet_studios" && stats.ayetStudios > 0))
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tarefas"
        description="Monitorização das tarefas disponíveis e dos fornecedores que estão actualmente a fornecer tarefas."
      />

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Disponibilidade de tarefas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estes números vêm directamente da base de dados. Nenhum valor é apresentado como disponível sem existir uma tarefa registada.
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

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Tarefas activas" value={stats.active} icon={<Activity className="h-4 w-4" />} loading={loading} />
          <Metric label="Tarefas de APIs" value={stats.external} icon={<Server className="h-4 w-4" />} loading={loading} />
          <Metric label="Offerwall Ad" value={stats.offerwallAd} icon={<Wifi className="h-4 w-4" />} loading={loading} />
          <Metric label="ayeT-Studios" value={stats.ayetStudios} icon={<Wifi className="h-4 w-4" />} loading={loading} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Server className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Fornecedores a fornecer tarefas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Um fornecedor só aparece aqui quando está activado, tecnicamente operacional e existem tarefas activas identificadas pela respectiva origem.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> A verificar disponibilidade…
          </div>
        ) : supplyingProviders.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {supplyingProviders.map((provider) => (
              <div key={provider.provider} className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{provider.display_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Integração activa e a fornecer tarefas</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Operacional
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-sm">
                  <span className="text-muted-foreground">Tarefas disponíveis</span>
                  <strong>{provider.provider === "offerwall_ad" ? stats.offerwallAd : stats.ayetStudios}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Última verificação</span>
                  <span>{formatDate(provider.last_test_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/30 p-5">
            <p className="font-medium">Nenhuma API está actualmente a fornecer tarefas.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando Offerwall Ad ou ayeT-Studios estiverem activados, operacionais e houver tarefas importadas/registadas, elas aparecerão automaticamente nesta página.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Monitorização operacional</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OperationalItem label="Tarefas pendentes de aprovação" value="—" />
          <OperationalItem label="Tarefas concluídas" value="—" />
          <OperationalItem label="Submissões e provas" value="—" />
          <OperationalItem label="Rejeições e motivos" value="—" />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Estes indicadores permanecem como “—” até existir uma consulta administrativa segura para cada métrica. Não são apresentados números fictícios.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Origem das tarefas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              As tarefas externas são identificadas por <code className="rounded bg-muted px-1 py-0.5">external_source</code>. A página não considera uma API como fornecedora apenas por estar activada.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon, loading }: { label: string; value: number; icon: React.ReactNode; loading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-xl font-semibold">{loading ? "—" : value.toLocaleString("pt-PT")}</div>
    </div>
  );
}

function OperationalItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
