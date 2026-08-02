import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { countries } from "@/components/taskora/mock-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — Taskora" },
      { name: "description", content: "Cria a tua conta Taskora em menos de um minuto." },
      { property: "og:title", content: "Criar conta — Taskora" },
      { property: "og:description", content: "Junta-te à Taskora e começa a ganhar com microtarefas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Signup,
});

const input =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10";

function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    country: countries[0],
    password: "",
    confirm: "",
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: form.fullName.trim(), country: form.country },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (data.session && data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        country: form.country,
      });
      setLoading(false);
      navigate({ to: "/app" });
      return;
    }

    setLoading(false);
    toast.success("Conta criada. Confirma o teu email para entrares.");
    navigate({ to: "/login" });
  };

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Preenche os teus dados e começa hoje mesmo."
      footer={
        <>
          Já tens conta?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Nome completo">
          <input
            required
            className={input}
            placeholder="O teu nome completo"
            value={form.fullName}
            onChange={set("fullName")}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            className={input}
            placeholder="nome@email.com"
            value={form.email}
            onChange={set("email")}
          />
        </Field>
        <Field label="País">
          <select className={input} value={form.country} onChange={set("country")}>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Palavra-passe">
            <input
              type="password"
              required
              minLength={6}
              className={input}
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
            />
          </Field>
          <Field label="Confirmar">
            <input
              type="password"
              required
              minLength={6}
              className={input}
              placeholder="••••••••"
              value={form.confirm}
              onChange={set("confirm")}
            />
          </Field>
        </div>
        <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--primary)]"
          />
          <span>
            Aceito os{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Termos
            </Link>{" "}
            e a{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 w-full rounded-xl text-base shadow-glow"
        >
          {loading ? "A criar conta…" : "Criar conta"}
        </Button>
      </form>
    </AuthLayout>
  );
}
