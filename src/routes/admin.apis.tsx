import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Settings2,
  Wifi,
  XCircle,
} from "lucide-react";

type ProviderKey = "offerwall_ad" | "ayet_studios";
type TechnicalStatus = "not_configured" | "connected" | "attention" | "error" | "disabled";

type ProviderState = {
  provider: ProviderKey;
  enabled: boolean;
  status: TechnicalStatus;
  credentialsConfigured: boolean;
  testedAt: string | null;
  lastCommunicationAt: string | null;
  endpoint?: string;
  adslotId?: string;
  apiKeyConfigured: boolean;
};

const initialState: ProviderState = {
  provider: "offerwall_ad",
  enabled: false,
  status: "not_configured",
  credentialsConfigured: false,
  testedAt: null,
  lastCommunicationAt: null,
  apiKeyConfigured: false,
};

export const Route = createFileRoute("/admin/apis")({
  head: () => ({
    meta: [
      { title: "APIs de tarefas — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Gerenciamento técnico das integrações de tarefas." },
    ],
  }),
  component: Page,
});

function Page() {
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>("offerwall_ad");
  const [states, setStates] = useState<Record<ProviderKey, ProviderState>>({
    offerwall_ad: initialState,
    ayet_studios: { ...initialState, provider: "ayet_studios" },
  });
  const [offerwallEndpoint, setOfferwallEndpoint] = useState("");
  const [offerwallKey, setOfferwallKey] = useState("");
  const [ayetAdslot, setAyetAdslot] = useState("");
  const [ayetKey, setAyetKey] = useState("");
  const [showOfferwallKey, setShowOfferwallKey] = useState(false);
  const [showAyetKey, setShowAyetKey] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const configRef = useRef<HTMLDivElement>(null);

  const selected = states[selectedProvider];

  const refresh = async () => {
    setLoading(true);
    try {
      const [offerwall, ayet] = await Promise.all([
        invoke("offerwall-ad-test", { action: "get_configuration" }),
        invoke("ayet-studios-test", { action: "get_configuration" }),
      ]);
      setStates({
        offerwall_ad: normalizeState("offerwall_ad", offerwall),
        ayet_studios: normalizeState("ayet_studios", ayet),
      });
      setOfferwallEndpoint(offerwall.endpoint ?? "");
      setAyetAdslot(ayet.adslotId ?? "");
    } catch (error) {
      setMessage({ kind: "error", text: safeMessage(error, "Não foi possível carregar o estado das integrações.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const selectedConfigValid = useMemo(() => {
    if (selectedProvider === "offerwall_ad") {
      return Boolean(offerwallEndpoint.trim()) && isHttpsUrl(offerwallEndpoint) && (offerwallKey.trim().length > 0 || selected.apiKeyConfigured);
    }
    return /^\d+$/.test(ayetAdslot.trim()) && (ayetKey.trim().length > 0 || selected.apiKeyConfigured);
  }, [selectedProvider, offerwallEndpoint, offerwallKey, ayetAdslot, ayetKey, selected.apiKeyConfigured]);

  const configure = () => {
    setConfiguring(true);
    setMessage(null);
    requestAnimationFrame(() => configRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const save = async () => {
    const actionKey = `${selectedProvider}:save`;
    setBusyAction(actionKey);
    setMessage(null);
    try {
      if (!selectedConfigValid) throw new Error(selectedProvider === "offerwall_ad"
        ? "Preencha um endpoint HTTPS válido e uma API Key."
        : "Preencha um Adslot ID numérico e uma API Key.");
      const data = selectedProvider === "offerwall_ad"
        ? await invoke("offerwall-ad-test", { action: "save_configuration", endpoint: offerwallEndpoint, apiKey: offerwallKey || undefined })
        : await invoke("ayet-studios-test", { action: "save_configuration", adslotId: ayetAdslot, apiKey: ayetKey || undefined });
      if (data.status !== "not_configured" && data.status !== "connected") throw new Error(data.message || "Não foi possível guardar a configuração.");
      setOfferwallKey("");
      setAyetKey("");
      setMessage({ kind: "success", text: "Configuração guardada com segurança. As credenciais não são exibidas novamente." });
      await refresh();
    } catch (error) {
      setMessage({ kind: "error", text: safeMessage(error, "Não foi possível guardar a configuração.") });
    } finally {
      setBusyAction(null);
    }
  };

  const testConnection = async () => {
    const actionKey = `${selectedProvider}:test`;
    setBusyAction(actionKey);
    setMessage(null);
    try {
      if (!selectedConfigValid) throw new Error(selectedProvider === "offerwall_ad"
        ? "Configure primeiro o endpoint HTTPS e a API Key."
        : "Configure primeiro o Adslot ID e a API Key.");
      const saveData = selectedProvider === "offerwall_ad"
        ? await invoke("offerwall-ad-test", { action: "save_configuration", endpoint: offerwallEndpoint, apiKey: offerwallKey || undefined })
        : await invoke("ayet-studios-test", { action: "save_configuration", adslotId: ayetAdslot, apiKey: ayetKey || undefined });
      if (saveData.status === "endpoint_error" || saveData.status === "not_configured") throw new Error(saveData.message || "Configuração inválida.");
      const data = selectedProvider === "offerwall_ad"
        ? await invoke("offerwall-ad-test", { action: "test_connection", endpoint: offerwallEndpoint, apiKey: offerwallKey || undefined })
        : await invoke("ayet-studios-test", { action: "test_connection", adslotId: ayetAdslot, apiKey: ayetKey || undefined });
      setOfferwallKey("");
      setAyetKey("");
      if (data.status === "connected") {
        setMessage({ kind: "success", text: data.message || "Teste de conexão concluído com sucesso." });
      } else {
        throw new Error(data.message || "O teste de conexão falhou.");
      }
      await refresh();
    } catch (error) {
      setMessage({ kind: "error", text: safeMessage(error, "Não foi possível testar a conexão.") });
      await refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const setEnabled = async (enabled: boolean) => {
    const actionKey = `${selectedProvider}:${enabled ? "activate" : "deactivate"}`;
    setBusyAction(actionKey);
    setMessage(null);
    try {
      const functionName = selectedProvider === "offerwall_ad" ? "offerwall-ad-test" : "ayet-studios-test";
      const data = await invoke(functionName, { action: "set_enabled", enabled });
      if (enabled && data.status !== "connected") throw new Error(data.message || "A integração só pode ser activada após um teste bem-sucedido.");
      setMessage({ kind: "success", text: data.message || (enabled ? "Integração activada." : "Integração desactivada.") });
      await refresh();
    } catch (error) {
      setMessage({ kind: "error", text: safeMessage(error, "Não foi possível alterar o estado administrativo.") });
      await refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const actionBusy = (name: string) => busyAction === `${selectedProvider}:${name}`;
  const activationAllowed = selected.enabled
    ? true
    : selected.status === "connected" && selected.credentialsConfigured && selectedConfigValid;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="APIs de tarefas"
        description="Gerencie somente as integrações Offerwall Ad e ayeT-Studios. O estado administrativo e o estado técnico são independentes."
      />

      {message && (
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${message.kind === "success" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" : message.kind === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/30 bg-primary/5 text-primary"}`}>
          {message.kind === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : message.kind === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <label className="block w-full max-w-xl space-y-2">
            <span className="text-sm font-semibold">Plataforma de tarefas</span>
            <select
              value={selectedProvider}
              onChange={(event) => { setSelectedProvider(event.target.value as ProviderKey); setConfiguring(false); setMessage(null); }}
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="offerwall_ad">Offerwall Ad</option>
              <option value="ayet_studios">ayeT-Studios</option>
            </select>
          </label>
          <button type="button" onClick={refresh} disabled={loading || busyAction !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar estado
          </button>
        </div>
      </section>

      <ProviderCard
        provider={selectedProvider}
        state={selected}
        loading={loading}
        configuring={configuring}
        onConfigure={configure}
        onTest={testConnection}
        onActivate={() => setEnabled(true)}
        onDeactivate={() => setEnabled(false)}
        testBusy={actionBusy("test")}
        activateBusy={actionBusy("activate")}
        deactivateBusy={actionBusy("deactivate")}
        activationAllowed={activationAllowed}
        configRef={configRef}
        offerwallEndpoint={offerwallEndpoint}
        setOfferwallEndpoint={setOfferwallEndpoint}
        offerwallKey={offerwallKey}
        setOfferwallKey={setOfferwallKey}
        showOfferwallKey={showOfferwallKey}
        setShowOfferwallKey={setShowOfferwallKey}
        ayetAdslot={ayetAdslot}
        setAyetAdslot={setAyetAdslot}
        ayetKey={ayetKey}
        setAyetKey={setAyetKey}
        showAyetKey={showAyetKey}
        setShowAyetKey={setShowAyetKey}
        onSave={save}
        saveBusy={actionBusy("save")}
        selectedConfigValid={selectedConfigValid}
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Settings2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Preparação futura</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A estrutura já separa espaço para sincronização de ofertas, contagem de ofertas, postbacks/conversões, chargebacks/reversões e monitorização de erros. Nenhuma dessas funções é executada nesta etapa.
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Última sincronização: —</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProviderCard(props: {
  provider: ProviderKey;
  state: ProviderState;
  loading: boolean;
  configuring: boolean;
  onConfigure: () => void;
  onTest: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  testBusy: boolean;
  activateBusy: boolean;
  deactivateBusy: boolean;
  activationAllowed: boolean;
  configRef: RefObject<HTMLDivElement | null>;
  offerwallEndpoint: string;
  setOfferwallEndpoint: (value: string) => void;
  offerwallKey: string;
  setOfferwallKey: (value: string) => void;
  showOfferwallKey: boolean;
  setShowOfferwallKey: (value: boolean) => void;
  ayetAdslot: string;
  setAyetAdslot: (value: string) => void;
  ayetKey: string;
  setAyetKey: (value: string) => void;
  showAyetKey: boolean;
  setShowAyetKey: (value: boolean) => void;
  onSave: () => void;
  saveBusy: boolean;
  selectedConfigValid: boolean;
}) {
  const { provider, state } = props;
  const title = provider === "offerwall_ad" ? "Offerwall Ad" : "ayeT-Studios";
  const status = statusPresentation(state);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{title}</h2>
              <StatusBadge {...status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {provider === "offerwall_ad" ? "API de ofertas" : "Offerwall / Surveywall API"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={props.onConfigure} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-sm font-semibold hover:bg-muted">
              <Settings2 className="h-4 w-4" /> Configurar
            </button>
            <button type="button" onClick={props.onTest} disabled={props.testBusy || !props.selectedConfigValid} className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 px-3.5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50">
              {props.testBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />} Testar conexão
            </button>
            {state.enabled ? (
              <button type="button" onClick={props.onDeactivate} disabled={props.deactivateBusy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                {props.deactivateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />} Desactivar
              </button>
            ) : (
              <button type="button" onClick={props.onActivate} disabled={props.activateBusy || !props.activationAllowed} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                {props.activateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} Activar
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Estado técnico" value={status.label} icon={<StatusIcon kind={status.kind} />} />
          <InfoItem label="Estado administrativo" value={state.enabled ? "Activada" : "Desactivada"} icon={<PauseCircle className="h-4 w-4" />} />
          <InfoItem label="Última verificação" value={formatDate(state.testedAt)} icon={<Clock3 className="h-4 w-4" />} />
          <InfoItem label="Última comunicação" value={formatDate(state.lastCommunicationAt)} icon={<Wifi className="h-4 w-4" />} />
        </div>

        <div className="mt-3 rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
          Última sincronização: —
        </div>
      </div>

      {props.configuring && (
        <div ref={props.configRef} className="border-b border-border bg-muted/20 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Configuração</h3>
              <p className="text-xs text-muted-foreground">As credenciais são enviadas apenas ao backend. A API Key nunca é devolvida à interface.</p>
            </div>
            <button type="button" onClick={() => props.onConfigure()} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Manter configuração aberta">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {provider === "offerwall_ad" ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="API Key">
                <SecretInput value={props.offerwallKey} onChange={props.setOfferwallKey} show={props.showOfferwallKey} onToggle={() => props.setShowOfferwallKey(!props.showOfferwallKey)} placeholder={state.apiKeyConfigured ? "API Key já configurada · deixe vazio para manter" : "Introduza a API Key"} />
              </Field>
              <Field label="Endpoint da API">
                <input value={props.offerwallEndpoint} onChange={(e) => props.setOfferwallEndpoint(e.target.value)} type="url" placeholder="https://..." className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" autoComplete="off" />
              </Field>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="API Key">
                <SecretInput value={props.ayetKey} onChange={props.setAyetKey} show={props.showAyetKey} onToggle={() => props.setShowAyetKey(!props.showAyetKey)} placeholder={state.apiKeyConfigured ? "API Key já configurada · deixe vazio para manter" : "Introduza a API Key"} />
              </Field>
              <Field label="Adslot ID">
                <input value={props.ayetAdslot} onChange={(e) => props.setAyetAdslot(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Ex.: 12345" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" autoComplete="off" />
              </Field>
              <Field label="Ambiente">
                <input value="Produção · Live Server" readOnly className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
              </Field>
              <Field label="Tipo">
                <input value="Offerwall / Surveywall API" readOnly className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
              </Field>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className={`text-xs font-medium ${props.selectedConfigValid ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {props.selectedConfigValid ? "Configuração válida para teste." : "Complete os campos obrigatórios antes de testar."}
            </div>
            <button type="button" onClick={props.onSave} disabled={props.saveBusy || !props.selectedConfigValid} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {props.saveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Guardar configuração
            </button>
          </div>
        </div>
      )}

      <div className="p-5">
        <p className="text-xs text-muted-foreground">
          Activar não significa que a API esteja a funcionar. A integração só fica <strong>Activa e operacional</strong> quando estiver activada, com credenciais configuradas e o último teste tiver sido bem-sucedido.
        </p>
      </div>
    </section>
  );
}

function normalizeState(provider: ProviderKey, data: any): ProviderState {
  const configured = Boolean(data?.apiKeyConfigured && (provider === "offerwall_ad" ? data?.endpoint : data?.adslotId));
  const technicalStatus: TechnicalStatus =
    data?.status === "connected"
      ? "connected"
      : data?.status === "attention"
        ? "attention"
        : data?.status === "not_configured"
          ? "not_configured"
          : "error";

  return {
    provider,
    enabled: Boolean(data?.enabled),
    status: data?.enabled ? technicalStatus : technicalStatus === "connected" ? "disabled" : "not_configured",
    credentialsConfigured: configured,
    testedAt: data?.testedAt ?? null,
    lastCommunicationAt: data?.lastCommunicationAt ?? null,
    endpoint: data?.endpoint,
    adslotId: data?.adslotId,
    apiKeyConfigured: Boolean(data?.apiKeyConfigured),
  };
}

async function invoke(functionName: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) {
    throw new Error("Não foi possível comunicar com o backend da integração.");
  }
  if (!data || typeof data !== "object") throw new Error("Resposta inválida do backend.");
  return data as Record<string, any>;
}

function statusPresentation(state: ProviderState) {
  if (state.enabled && state.status === "connected") return { kind: "connected" as const, label: "Activo e operacional", description: "Credenciais válidas e último teste bem-sucedido." };
  if (state.enabled && state.status === "attention") return { kind: "attention" as const, label: "Activo, mas com atenção", description: "A integração está activa, mas requer atenção técnica." };
  if (state.enabled && state.status === "error") return { kind: "error" as const, label: "Erro de conexão", description: "A integração está activa, mas o último teste/comunicação apresentou erro." };
  if (!state.enabled && state.status === "disabled") return { kind: "disabled" as const, label: "Desactivado", description: "A integração está configurada, mas não está a ser utilizada." };
  return { kind: "not_configured" as const, label: "Não configurado", description: "Credenciais/configuração ainda não estão completas." };
}

function StatusBadge({ kind, label }: { kind: "connected" | "attention" | "error" | "disabled" | "not_configured"; label: string }) {
  const classes = {
    connected: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    attention: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    disabled: "border-border bg-muted text-muted-foreground",
    not_configured: "border-border bg-muted text-muted-foreground",
  }[kind];
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}><StatusIcon kind={kind} />{label}</span>;
}

function StatusIcon({ kind }: { kind: "connected" | "attention" | "error" | "disabled" | "not_configured" }) {
  if (kind === "connected") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (kind === "attention") return <AlertCircle className="h-3.5 w-3.5" />;
  if (kind === "error") return <XCircle className="h-3.5 w-3.5" />;
  if (kind === "disabled") return <PauseCircle className="h-3.5 w-3.5" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />;
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="rounded-xl border border-border bg-background/60 p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

function SecretInput({ value, onChange, show, onToggle, placeholder }: { value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void; placeholder: string }) {
  return <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"><input value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" type={show ? "text" : "password"} placeholder={placeholder} autoComplete="new-password" /><button type="button" onClick={onToggle} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label={show ? "Ocultar API Key" : "Mostrar API Key"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>;
}

function isHttpsUrl(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function safeMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
