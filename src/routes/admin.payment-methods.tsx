import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2, ShieldCheck, Wifi, Save, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/payment-methods")({
  head: () => ({
    meta: [
      { title: "Métodos de pagamento — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Configuração dos gateways de pagamento e levantamento." },
    ],
  }),
  component: Page,
});

function Page() {
  const [showSecrets, setShowSecrets] = useState(false);
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [enabled, setEnabled] = useState(false);

  const [debitoEnvironment, setDebitoEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [debitoApiKey, setDebitoApiKey] = useState("");
  const [debitoMerchantId, setDebitoMerchantId] = useState("");
  const [debitoWalletCode, setDebitoWalletCode] = useState("");
  const [debitoWebhookSecret, setDebitoWebhookSecret] = useState("");
  const [debitoBaseUrl, setDebitoBaseUrl] = useState("");
  const [debitoWebhookUrl, setDebitoWebhookUrl] = useState("");
  const [debitoStatus, setDebitoStatus] = useState<"not_configured" | "connected" | "authentication_error" | "communication_error" | "disabled">("not_configured");
  const [debitoLastTest, setDebitoLastTest] = useState<string | null>(null);
  const [debitoLastCommunication, setDebitoLastCommunication] = useState<string | null>(null);
  const [debitoApiKeyConfigured, setDebitoApiKeyConfigured] = useState(false);
  const [debitoWebhookSecretConfigured, setDebitoWebhookSecretConfigured] = useState(false);
  const [showDebitoApiKey, setShowDebitoApiKey] = useState(false);
  const [showDebitoWebhookSecret, setShowDebitoWebhookSecret] = useState(false);
  const [debitoBusy, setDebitoBusy] = useState(false);
  const [debitoMessage, setDebitoMessage] = useState("");

  const loadDebitoConfig = async () => {
    const { data, error } = await supabase.functions.invoke("debito-pay-config", {
      body: { action: "get_configuration" },
    });
    if (error || !data) return;
    setDebitoEnvironment(data.environment === "production" ? "production" : "sandbox");
    setDebitoMerchantId(data.merchantId ?? "");
    setDebitoWalletCode(data.walletCode ?? "");
    setDebitoBaseUrl(data.baseUrl ?? "");
    setDebitoWebhookUrl(data.webhookUrl ?? "");
    setDebitoEnabled(Boolean(data.enabled));
    setDebitoStatus(data.status ?? "not_configured");
    setDebitoLastTest(data.lastTestAt ?? null);
    setDebitoLastCommunication(data.lastCommunicationAt ?? null);
    setDebitoApiKeyConfigured(Boolean(data.apiKeyConfigured));
    setDebitoWebhookSecretConfigured(Boolean(data.webhookSecretConfigured));
  };

  useEffect(() => {
    void loadDebitoConfig();
  }, []);

  const invokeDebito = async (action: "save_configuration" | "test_connection" | "set_enabled", enabledValue?: boolean) => {
    setDebitoBusy(true);
    setDebitoMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("debito-pay-config", {
        body: {
          action,
          environment: debitoEnvironment,
          apiKey: debitoApiKey.trim() || undefined,
          merchantId: debitoMerchantId.trim(),
          walletCode: debitoWalletCode.trim(),
          webhookSecret: debitoWebhookSecret.trim() || undefined,
          baseUrl: debitoBaseUrl.trim(),
          enabled: enabledValue,
        },
      });

      if (error || !data) {
        setDebitoStatus("communication_error");
        setDebitoMessage("Não foi possível comunicar com o backend do TASKORA.");
        return;
      }

      setDebitoStatus(data.status ?? "communication_error");
      setDebitoMessage(data.message ?? "");
      if (data.environment) setDebitoEnvironment(data.environment);
      if (typeof data.enabled === "boolean") setDebitoEnabled(data.enabled);
      if (typeof data.merchantId === "string") setDebitoMerchantId(data.merchantId);
      if (typeof data.walletCode === "string") setDebitoWalletCode(data.walletCode);
      if (typeof data.baseUrl === "string") setDebitoBaseUrl(data.baseUrl);
      if (typeof data.webhookUrl === "string") setDebitoWebhookUrl(data.webhookUrl);
      if (typeof data.lastTestAt === "string") setDebitoLastTest(data.lastTestAt);
      if (typeof data.lastCommunicationAt === "string") setDebitoLastCommunication(data.lastCommunicationAt);
      if (typeof data.apiKeyConfigured === "boolean") setDebitoApiKeyConfigured(data.apiKeyConfigured);
      if (typeof data.webhookSecretConfigured === "boolean") setDebitoWebhookSecretConfigured(data.webhookSecretConfigured);

      if (action === "save_configuration") {
        setDebitoApiKey("");
        setDebitoWebhookSecret("");
        setShowDebitoApiKey(false);
        setShowDebitoWebhookSecret(false);
      }
    } finally {
      setDebitoBusy(false);
    }
  };

  const [debitoEnabled, setDebitoEnabled] = useState(false);

  const debitoStatusCopy = {
    not_configured: { label: "Não configurado", className: "text-muted-foreground" },
    connected: { label: "Conectado", className: "text-emerald-600" },
    authentication_error: { label: "Erro de autenticação", className: "text-destructive" },
    communication_error: { label: "Erro de comunicação", className: "text-amber-600" },
    disabled: { label: "Desativado", className: "text-muted-foreground" },
  } as const;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Métodos de pagamento" description="Configure o gateway usado pelo TASKORA para depósitos empresariais e levantamentos." />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gateway de pagamento</h2>
            <p className="text-sm text-muted-foreground">Preparado para PayTED ou outro gateway compatível, sem ficar preso a um provedor.</p>
          </div>
          <button type="button" onClick={() => setEnabled((value) => !value)} className="rounded-full border px-3 py-1.5 text-sm font-medium">
            {enabled ? "Ativo" : "Inativo"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Provedor</span>
            <select className="w-full rounded-xl border bg-background px-3 py-2.5" defaultValue="">
              <option value="" disabled>Selecionar provedor</option>
              <option value="payted">PayTED</option>
              <option value="other">Outro gateway</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Ambiente</span>
            <select className="w-full rounded-xl border bg-background px-3 py-2.5" value={environment} onChange={(event) => setEnvironment(event.target.value as "sandbox" | "production")}>
              <option value="sandbox">Sandbox / Testes</option>
              <option value="production">Produção</option>
            </select>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium">API Base URL</span>
            <input className="w-full rounded-xl border bg-background px-3 py-2.5" placeholder="https://api.exemplo.com" type="url" autoComplete="off" />
          </label>

          <SecretField label="API Key" show={showSecrets} />
          <SecretField label="Secret" show={showSecrets} />
          <SecretField label="Webhook Secret" show={showSecrets} />

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Moeda principal</span>
            <select className="w-full rounded-xl border bg-background px-3 py-2.5" defaultValue="USD">
              <option value="USD">USD</option>
              <option value="MZN">MZN</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShowSecrets((value) => !value)} className="rounded-xl border px-4 py-2 text-sm font-medium">
            {showSecrets ? "Ocultar credenciais" : "Mostrar credenciais"}
          </button>
          <button type="button" className="rounded-xl border px-4 py-2 text-sm font-medium">Testar conexão</button>
          <button type="button" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar configuração</button>
        </div>

        <div className="mt-5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Segurança:</strong> API Key, Secret e Webhook Secret devem ficar apenas no backend/secret store. Nunca expor credenciais ao frontend ou ao GitHub.
        </div>

        <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm">
          <p className="font-medium">Canais preparados</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border px-3 py-1">M-Pesa</span>
            <span className="rounded-full border px-3 py-1">e-Mola</span>
            <span className="rounded-full border px-3 py-1">Payout / levantamento</span>
            <span className="rounded-full border px-3 py-1">Webhook</span>
          </div>
        </div>

        {environment === "production" && (
          <p className="mt-4 text-sm text-amber-600">Produção: valide primeiro credenciais, endpoints, webhooks e permissões do provedor.</p>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Debito Pay</h2>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Fornecedor adicional
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Configuração isolada do Debito Pay. A integração existente do PayTED permanece inalterada.
            </p>
          </div>
          <div className={cn("flex items-center gap-2 text-sm font-semibold", debitoStatusCopy[debitoStatus].className)}>
            <span className="h-2.5 w-2.5 rounded-full bg-current" />
            {debitoStatusCopy[debitoStatus].label}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Ambiente</span>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
              value={debitoEnvironment}
              onChange={(event) => setDebitoEnvironment(event.target.value as "sandbox" | "production")}
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Produção</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Merchant ID</span>
            <input
              value={debitoMerchantId}
              onChange={(event) => setDebitoMerchantId(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="UUID do Merchant"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Wallet Code</span>
            <input
              value={debitoWalletCode}
              onChange={(event) => setDebitoWalletCode(event.target.value.replace(/\D/g, "").slice(0, 5))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Código de 5 dígitos"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Base URL / Endpoint</span>
            <input
              value={debitoBaseUrl}
              onChange={(event) => setDebitoBaseUrl(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="https://..."
              type="url"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Use exatamente a Base URL documentada para o ambiente escolhido.
            </p>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">API Key</span>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
              <input
                value={debitoApiKey}
                onChange={(event) => setDebitoApiKey(event.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
                type={showDebitoApiKey ? "text" : "password"}
                placeholder={debitoApiKeyConfigured ? "Já configurada — deixe vazio para manter" : "sk_sandbox_... / sk_live_..."}
                autoComplete="new-password"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShowDebitoApiKey((value) => !value)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Mostrar ou ocultar API Key">
                {showDebitoApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Webhook Secret</span>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
              <input
                value={debitoWebhookSecret}
                onChange={(event) => setDebitoWebhookSecret(event.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
                type={showDebitoWebhookSecret ? "text" : "password"}
                placeholder={debitoWebhookSecretConfigured ? "Já configurado — deixe vazio para manter" : "Secret do webhook"}
                autoComplete="new-password"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShowDebitoWebhookSecret((value) => !value)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Mostrar ou ocultar Webhook Secret">
                {showDebitoWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium">Webhook URL</span>
            <input
              value={debitoWebhookUrl}
              readOnly
              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 font-mono text-sm text-muted-foreground outline-none"
              placeholder="Disponível após o backend Supabase estar configurado"
            />
            <p className="text-xs text-muted-foreground">
              URL gerada pelo backend do TASKORA para receber os webhooks assinados do Debito Pay.
            </p>
          </label>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Estado da integração</p>
            <p className={cn("mt-1 text-sm font-semibold", debitoStatusCopy[debitoStatus].className)}>{debitoStatusCopy[debitoStatus].label}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Último teste</p>
            <p className="mt-1 text-sm font-semibold">{debitoLastTest ? new Date(debitoLastTest).toLocaleString("pt-MZ") : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Última comunicação</p>
            <p className="mt-1 text-sm font-semibold">{debitoLastCommunication ? new Date(debitoLastCommunication).toLocaleString("pt-MZ") : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Credenciais</p>
            <p className="mt-1 text-sm font-semibold">
              {debitoApiKeyConfigured && debitoWebhookSecretConfigured ? "Configuradas" : "Incompletas"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void invokeDebito("save_configuration")}
            disabled={debitoBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            {debitoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar configuração
          </button>

          <button
            type="button"
            onClick={() => void invokeDebito("test_connection")}
            disabled={debitoBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {debitoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Testar conexão
          </button>

          <button
            type="button"
            onClick={() => void invokeDebito("set_enabled", true)}
            disabled={debitoBusy || debitoEnabled}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:opacity-60"
          >
            <Power className="h-4 w-4" />
            Ativar
          </button>

          <button
            type="button"
            onClick={() => void invokeDebito("set_enabled", false)}
            disabled={debitoBusy || !debitoEnabled}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-60"
          >
            <Power className="h-4 w-4" />
            Desativar
          </button>
        </div>

        {debitoMessage && (
          <div className={cn(
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            debitoStatus === "connected" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
            debitoStatus === "authentication_error" ? "border-destructive/20 bg-destructive/5 text-destructive" :
            "border-border bg-muted/20 text-muted-foreground",
          )}>
            {debitoMessage}
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Segurança
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              API Key e Webhook Secret são enviados por HTTPS diretamente à Edge Function. Não são guardados no frontend, GitHub ou logs e nunca são devolvidos completos após o armazenamento.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Webhook
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              O endpoint valida <code>x-webhook-signature</code> com HMAC-SHA256 sobre o corpo bruto e usa uma chave idempotente para impedir duplicação.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}

function SecretField({ label, show }: { label: string; show: boolean }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input className="w-full rounded-xl border bg-background px-3 py-2.5" type={show ? "text" : "password"} placeholder={label} autoComplete="new-password" />
    </label>
  );
}
