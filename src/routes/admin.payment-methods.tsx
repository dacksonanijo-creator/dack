import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { Eye, EyeOff } from "lucide-react";

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
  const [selectedProvider, setSelectedProvider] = useState<"payted" | "debito_pay">("payted");
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
  const [showDebitoApiKey, setShowDebitoApiKey] = useState(false);
  const [showDebitoWebhookSecret, setShowDebitoWebhookSecret] = useState(false);

  const debitoStatusCopy = {
    not_configured: { label: "Não configurado", className: "text-muted-foreground" },
    connected: { label: "Conectado", className: "text-emerald-600" },
    authentication_error: { label: "Erro de autenticação", className: "text-destructive" },
    communication_error: { label: "Erro de comunicação", className: "text-amber-600" },
    disabled: { label: "Desativado", className: "text-muted-foreground" },
  } as const;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Métodos de pagamento" description="Selecione a plataforma para visualizar apenas os campos necessários dessa API." />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Fornecedor de pagamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada fornecedor possui a sua própria configuração, teste, ativação e desativação. Novas APIs serão adicionadas à seleção somente depois de estudarmos a documentação oficial e criarmos a página específica.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Seleção de plataformas
          </span>
        </div>
        <label className="block max-w-xl space-y-1.5">
          <span className="text-sm font-medium">Selecionar plataforma</span>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            value={selectedProvider}
            onChange={(event) => setSelectedProvider(event.target.value as "payted" | "debito_pay")}
          >
            <option value="payted">PayTED</option>
            <option value="debito_pay">Debito Pay</option>
          </select>
        </label>
      </section>

      {selectedProvider === "payted" && <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">PayTED</h2>
            <p className="text-sm text-muted-foreground">Configuração específica do PayTED. Esta página permanece independente das outras plataformas.</p>
          </div>
          <button type="button" onClick={() => setEnabled((value) => !value)} className="rounded-full border px-3 py-1.5 text-sm font-medium">
            {enabled ? "Ativo" : "Inativo"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
      </section>}

      {selectedProvider === "debito_pay" && <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-6 border-b border-border/70 pb-5">
          <h2 className="text-lg font-semibold">Debito Pay</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Campos da plataforma Debito Pay. Nesta etapa são apenas campos de configuração; a integração da API será feita manualmente.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Ambiente</span>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
              value={debitoEnvironment}
              onChange={(event) => setDebitoEnvironment(event.target.value as "sandbox" | "production")}
            >
              <option value="sandbox">Sandbox / Testes</option>
              <option value="production">Produção</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Merchant ID</span>
            <input value={debitoMerchantId} onChange={(event) => setDebitoMerchantId(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm" placeholder="Merchant ID" autoComplete="off" />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Wallet Code</span>
            <input value={debitoWalletCode} onChange={(event) => setDebitoWalletCode(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm" placeholder="Wallet Code" autoComplete="off" />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Base URL / Endpoint</span>
            <input value={debitoBaseUrl} onChange={(event) => setDebitoBaseUrl(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm" placeholder="Base URL / Endpoint" type="url" autoComplete="off" />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">API Key</span>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
              <input value={debitoApiKey} onChange={(event) => setDebitoApiKey(event.target.value)} className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none" type={showDebitoApiKey ? "text" : "password"} placeholder="API Key" autoComplete="off" />
              <button type="button" onClick={() => setShowDebitoApiKey((value) => !value)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Mostrar ou ocultar API Key">
                {showDebitoApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Webhook Secret</span>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
              <input value={debitoWebhookSecret} onChange={(event) => setDebitoWebhookSecret(event.target.value)} className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none" type={showDebitoWebhookSecret ? "text" : "password"} placeholder="Webhook Secret" autoComplete="off" />
              <button type="button" onClick={() => setShowDebitoWebhookSecret((value) => !value)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Mostrar ou ocultar Webhook Secret">
                {showDebitoWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium">Webhook URL</span>
            <input value={debitoWebhookUrl} onChange={(event) => setDebitoWebhookUrl(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm" placeholder="Webhook URL" autoComplete="off" />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Somente campos:</strong> nenhum teste, ativação, desativação ou chamada à API será executado nesta etapa. A integração será feita manualmente posteriormente.
        </div>
      </section>}

    </div>
  );
}

function SecretField({ label, show }: { label: string; show: boolean }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input className="w-full rounded-xl border bg-background px-3 py-2.5" type={show ? "text" : "password"} placeholder={label} autoComplete="off" />
    </label>
  );
}
