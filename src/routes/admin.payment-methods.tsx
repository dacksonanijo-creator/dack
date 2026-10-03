import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/payment-methods")({
  head: () => ({
    meta: [
      { title: "Métodos de pagamento — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Campos de configuração das plataformas de pagamento." },
    ],
  }),
  component: Page,
});

function Page() {
  const [selectedProvider, setSelectedProvider] = useState<"payted" | "debito_pay">("payted");
  const [showPaytedSecrets, setShowPaytedSecrets] = useState(false);
  const [showDebitoApiKey, setShowDebitoApiKey] = useState(false);
  const [showDebitoWebhookSecret, setShowDebitoWebhookSecret] = useState(false);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Métodos de pagamento"
        description="Selecione uma plataforma para visualizar somente os campos específicos dessa plataforma."
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <label className="block max-w-xl space-y-2">
          <span className="text-sm font-semibold">Plataforma de pagamento</span>
          <select
            value={selectedProvider}
            onChange={(event) => setSelectedProvider(event.target.value as "payted" | "debito_pay")}
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="payted">PayTED</option>
            <option value="debito_pay">Debito Pay</option>
          </select>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          Nesta etapa existem apenas os campos. A integração das APIs será feita manualmente posteriormente.
        </p>
      </section>

      {selectedProvider === "payted" && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">PayTED</h2>
          <p className="mt-1 text-sm text-muted-foreground">Campos que já existiam para o PayTED.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Ambiente">
              <select className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" defaultValue="sandbox">
                <option value="sandbox">Sandbox / Testes</option>
                <option value="production">Produção</option>
              </select>
            </Field>

            <Field label="API Base URL">
              <input className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="https://api.exemplo.com" type="url" autoComplete="off" />
            </Field>

            <SecretField label="API Key" show={showPaytedSecrets} />
            <SecretField label="Secret" show={showPaytedSecrets} />
            <SecretField label="Webhook Secret" show={showPaytedSecrets} />

            <Field label="Moeda principal">
              <select className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" defaultValue="USD">
                <option value="USD">USD</option>
                <option value="MZN">MZN</option>
              </select>
            </Field>
          </div>

          <button
            type="button"
            onClick={() => setShowPaytedSecrets((value) => !value)}
            className="mt-5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
          >
            {showPaytedSecrets ? "Ocultar credenciais" : "Mostrar credenciais"}
          </button>
        </section>
      )}

      {selectedProvider === "debito_pay" && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Debito Pay</h2>
          <p className="mt-1 text-sm text-muted-foreground">Campos que já existiam para o Debito Pay.</p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Ambiente">
              <select className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" defaultValue="sandbox">
                <option value="sandbox">Sandbox / Testes</option>
                <option value="production">Produção</option>
              </select>
            </Field>

            <Field label="Merchant ID">
              <input className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-mono" placeholder="Merchant ID" autoComplete="off" />
            </Field>

            <Field label="Wallet Code">
              <input className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-mono" placeholder="Wallet Code" autoComplete="off" />
            </Field>

            <Field label="Base URL / Endpoint">
              <input className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-mono" placeholder="Base URL / Endpoint" type="url" autoComplete="off" />
            </Field>

            <SecretField label="API Key" show={showDebitoApiKey} onToggle={() => setShowDebitoApiKey((value) => !value)} />

            <SecretField
              label="Webhook Secret"
              show={showDebitoWebhookSecret}
              onToggle={() => setShowDebitoWebhookSecret((value) => !value)}
            />

            <Field label="Webhook URL" full>
              <input className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-mono" placeholder="Webhook URL" autoComplete="off" />
            </Field>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={full ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function SecretField({ label, show, onToggle }: { label: string; show: boolean; onToggle?: () => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
        <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" type={show ? "text" : "password"} placeholder={label} autoComplete="off" />
        {onToggle ? (
          <button type="button" onClick={onToggle} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label={show ? `Ocultar ${label}` : `Mostrar ${label}`}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </Field>
  );
}
