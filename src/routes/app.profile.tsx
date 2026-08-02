import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  Smartphone,
  User as UserIcon,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/taskora/app-shell";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Perfil — Taskora" },
      { name: "description", content: "Consulta e edita os dados da tua conta Taskora." },
      { property: "og:title", content: "Perfil — Taskora" },
      { property: "og:description", content: "Dados pessoais, contactos e segurança da conta." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

const security = [
  { icon: KeyRound, label: "Palavra-passe", hint: "Alterar palavra-passe" },
  { icon: Smartphone, label: "Sessões e dispositivos", hint: "Gerir acesso à conta" },
];

const input =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow focus:border-primary focus:ring-4 focus:ring-primary/10";

function Profile() {
  const { profile, displayName, email, loading, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", country: "" });

  useEffect(() => {
    setForm({
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      country: profile?.country ?? "",
    });
  }, [profile]);

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const personal = [
    { icon: UserIcon, label: "Nome completo", value: profile?.full_name || "—" },
    { icon: Mail, label: "Email", value: email || "—" },
    { icon: Phone, label: "Número de telefone", value: profile?.phone || "—" },
    { icon: Globe, label: "País", value: profile?.country || "—" },
    { icon: CalendarDays, label: "Data de registo", value: joined },
  ];

  const save = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      country: form.country.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível guardar as alterações.");
      return;
    }
    toast.success("Perfil atualizado.");
    setEditing(false);
  };

  return (
    <div className="space-y-5">
      <section className="animate-rise flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <Avatar className="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold leading-tight">
            {loading ? "…" : displayName || "Sem nome definido"}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{email ?? ""}</p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-money">
            <ShieldCheck className="h-3 w-3" /> Conta ativa
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 rounded-lg px-3 text-xs"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> {editing ? "Cancelar" : "Editar"}
        </Button>
      </section>

      <section>
        <h2 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Informações pessoais
        </h2>

        {editing ? (
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <label className="block text-xs font-medium text-muted-foreground">
              Nome completo
              <input
                className={`${input} mt-1`}
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Número de telefone
              <input
                className={`${input} mt-1`}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              País
              <input
                className={`${input} mt-1`}
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </label>
            <Button size="sm" className="h-9 w-full rounded-xl" onClick={save} disabled={saving}>
              {saving ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
            {personal.map((r) => (
              <div key={r.label} className="flex items-center gap-3 px-4 py-3">
                <r.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="flex-1 text-xs text-muted-foreground">{r.label}</p>
                <p className="max-w-[55%] truncate text-right text-sm font-semibold">{r.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Segurança
        </h2>
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          {security.map((s) => (
            <Link
              key={s.label}
              to="/app/settings"
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{s.hint}</p>
              </div>
              <span className="text-xs text-muted-foreground">›</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
