import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";

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
