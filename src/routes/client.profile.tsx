import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, Building2, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const db = supabase as any;

export const Route = createFileRoute("/client/profile")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const { data: profile } = await db.from("profiles").select("account_type").eq("id", data.user.id).maybeSingle();
    if (profile?.account_type !== "client") throw redirect({ to: "/app" });
    return { userId: data.user.id };
  },
  component: BusinessProfilePage,
});

const inputClass = "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";
const statusLabels: Record<string, string> = {
  not_started: "Incompleto", incomplete: "Incompleto", pending: "Pendente de verificação",
  verified: "Verificado", rejected: "Rejeitado", corrections_required: "Correções necessárias",
  suspended: "Suspenso",
};

function BusinessProfilePage() {
  const { userId } = Route.useRouteContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("incomplete");
  const [reason, setReason] = useState("");
  const [form, setForm] = useState({
    business_name: "", business_type: "empresa", country: "MZ",
    business_category: "", email: "", phone: "", business_website: "", business_description: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await db.from("profiles")
        .select("business_name,business_type,country,business_category,email,phone,business_website,business_description,verification_status")
        .eq("id", userId).maybeSingle();
      if (!alive) return;
      if (error) toast.error("Não foi possível carregar o perfil empresarial.");
      if (data) {
        setForm({
          business_name: data.business_name ?? "", business_type: data.business_type ?? "empresa",
          country: data.country ?? "MZ", business_category: data.business_category ?? "",
          email: data.email ?? "", phone: data.phone ?? "", business_website: data.business_website ?? "",
          business_description: data.business_description ?? "",
        });
        setStatus(data.verification_status ?? "incomplete");
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  const update = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const save = async () => {
    if (!form.business_name.trim() || !form.business_type || !form.country.trim() ||
        !form.business_category.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Preenche todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    const { error } = await db.from("profiles").update({
      business_name: form.business_name.trim(), business_type: form.business_type,
      country: form.country.trim(), business_category: form.business_category.trim(),
      email: form.email.trim(), phone: form.phone.trim(),
      business_website: form.business_website.trim() || null,
      business_description: form.business_description.trim() || null,
    }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error("Não foi possível guardar o perfil. Tenta novamente."); return; }
    toast.success("Perfil empresarial guardado.");
  };
  const submit = async () => {
    setSaving(true);
    const { data, error } = await db.rpc("submit_business_profile_for_review");
    setSaving(false);
    if (error) { toast.error(error.message || "Não foi possível submeter para verificação."); return; }
    setStatus(data?.status ?? "pending");
    setReason("");
    toast.success("Perfil submetido para análise administrativa.");
  };
  const isSuspended = status === "suspended";
  const statusIcon = isSuspended ? ShieldAlert : status === "verified" ? CheckCircle2 : Clock3;

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to="/client" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao painel empresarial</Link>
        <header className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TASKORA · CONTA EMPRESARIAL</p><h1 className="mt-1 text-2xl font-bold">Perfil empresarial</h1><p className="mt-1 text-sm text-muted-foreground">Mantém os dados do teu negócio atualizados para solicitar verificação.</p></div>
        </header>
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            {(() => { const Icon = statusIcon; return <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted"><Icon className="h-5 w-5" /></span>; })()}
            <div><p className="text-xs text-muted-foreground">Estado atual da conta</p><p className="font-semibold">{statusLabels[status] ?? "Incompleto"}</p></div>
          </div>
          {status === "rejected" && <p className="mt-3 text-sm text-muted-foreground">A solicitação anterior foi rejeitada. Atualiza os dados antes de voltar a submeter.</p>}
          {status === "corrections_required" && <p className="mt-3 text-sm text-muted-foreground">O administrador solicitou correções. Atualiza os dados e submete novamente.</p>}
          {isSuspended && <p className="mt-3 text-sm text-destructive">A conta está temporariamente impedida de utilizar funcionalidades restritas. Contacta o apoio.</p>}
          {status === "verified" && <p className="mt-3 text-sm text-muted-foreground">A conta foi aprovada pela administração.</p>}
        </section>
        {loading ? <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">A carregar perfil…</div> : (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-4 font-semibold">Dados do cliente</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Nome comercial ou nome público *<input className={inputClass} value={form.business_name} onChange={(e) => update("business_name", e.target.value)} maxLength={120} /></label>
              <label className="text-sm font-medium">Tipo de cliente *<select className={inputClass} value={form.business_type} onChange={(e) => update("business_type", e.target.value)}><option value="empresa">Empresa</option><option value="comerciante">Comerciante</option><option value="criador_conteudo">Criador de conteúdo</option><option value="outro">Outro</option></select></label>
              <label className="text-sm font-medium">País *<input className={inputClass} value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="Ex.: MZ ou Moçambique" maxLength={80} /></label>
              <label className="text-sm font-medium">Categoria de atividade *<input className={inputClass} value={form.business_category} onChange={(e) => update("business_category", e.target.value)} placeholder="Ex.: Comércio, educação, tecnologia" maxLength={120} /></label>
              <label className="text-sm font-medium">Email de contacto *<input type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={254} /></label>
              <label className="text-sm font-medium">Número de telefone *<input type="tel" className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={40} /></label>
              <label className="text-sm font-medium sm:col-span-2">Website ou link principal (opcional)<input type="url" className={inputClass} value={form.business_website} onChange={(e) => update("business_website", e.target.value)} placeholder="https://" maxLength={500} /></label>
              <label className="text-sm font-medium sm:col-span-2">Descrição breve (opcional)<textarea className={inputClass} rows={4} value={form.business_description} onChange={(e) => update("business_description", e.target.value)} maxLength={1000} /></label>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Os campos assinalados com * são obrigatórios. Não é necessário enviar documentos nesta etapa.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button onClick={save} disabled={saving || isSuspended} className="w-full sm:w-auto">{saving ? "A guardar…" : "Guardar alterações"}</Button>
              <Button onClick={submit} disabled={saving || isSuspended || status === "verified" || status === "pending"} variant="outline" className="w-full sm:w-auto">{saving ? "A processar…" : status === "pending" ? "Em análise" : "Submeter para verificação"}</Button>
            </div>
          </section>
        )}
        <p className="text-xs leading-5 text-muted-foreground">A submissão não aprova automaticamente a conta. A verificação depende de uma decisão da administração.</p>
      </div>
    </main>
  );
}
