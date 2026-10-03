import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/apis")({
  head: () => ({
    meta: [
      { title: "APIs de tarefas — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Campos de configuração das plataformas de tarefas." },
    ],
  }),
  component: Page,
});

function Page() {
  const [selectedProvider, setSelectedProvider] = useState<"offerwall_ad" | "ayet_studios">("offerwall_ad");
  const [showOfferwallKey, setShowOfferwallKey] = useState(false);
  const [showAyetKey, setShowAyetKey] = useState(false);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="APIs de tarefas"
        description="Selecione uma plataforma para visualizar somente os campos específicos dessa plataforma."
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <label className="block max-w-xl space-y-2">
          <span className="text-sm font-semibold">Plataforma de tarefas</span>
          <select
            value={selectedProvider}
            onChange={(event) => setSelectedProvider(event.target.value as "offerwall_ad" | "ayet_studios")}
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="offerwall_ad">Offerwall Ad</option>
            <option value="ayet_studios">ayeT-Studios</option>
          </select>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          Nesta etapa existem apenas os campos. A integração das APIs será feita manualmente posteriormente.
        </p>
      </section>

      {selectedProvider === "offerwall_ad" && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Offerwall Ad</h2>
          <p className="mt-1 text-sm text-muted-foreground">Campos que já existiam para o Offerwall Ad.</p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SecretField label="API Key" show={showOfferwallKey} onToggle={() => setShowOfferwallKey((value) => !value)} />
            <Field label="Endpoint da API">
              <input className="field font-mono" type="url" placeholder="Endpoint oficial fornecido pelo Offerwall Ad" autoComplete="off" />
            </Field>
          </div>
        </section>
      )}

      {selectedProvider === "ayet_studios" && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">ayeT-Studios</h2>
          <p className="mt-1 text-sm text-muted-foreground">Campos que já existiam para o ayeT-Studios.</p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SecretField label="API Key" show={showAyetKey} onToggle={() => setShowAyetKey((value) => setShowAyetKey((value) => !value))} />

            <Field label="Adslot ID">
              <input className="field font-mono" inputMode="numeric" placeholder="Ex.: 12345" autoComplete="off" />
            </Field>

            <Field label="Ambiente">
              <input className="field" value="Produção · Live Server" readOnly />
            </Field>

            <Field label="Tipo">
              <input className="field" value="Offerwall / Surveywall API" readOnly />
            </Field>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function SecretField({ label, show, onToggle }: { label: string; show: boolean; onToggle: () => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
        <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" type={show ? "text" : "password"} placeholder={label} autoComplete="off" />
        <button type="button" onClick={onToggle} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label={show ? `Ocultar ${label}` : `Mostrar ${label}`}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}
