import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { countries } from "@/components/taskora/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, emailRe } from "@/lib/auth-errors";

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

type Errors = Partial<Record<"fullName" | "email" | "password" | "confirm" | "terms", string>>;

function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    country: countries[0],
    password: "",
    confirm: "",
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const validate = () => {
    const next: Errors = {};
    if (form.fullName.trim().length < 3) next.fullName = "Indica o teu nome completo.";
    if (!emailRe.test(form.email.trim())) next.email = "Introduz um email válido.";
    if (form.password.length < 6) next.password = "Mínimo de 6 caracteres.";
    if (form.confirm !== form.password) next.confirm = "As palavras-passe não coincidem.";
    if (!accepted) next.terms = "Tens de aceitar os Termos e a Política de Privacidade.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) {
      toast.error("Corrige os campos assinalados.");
      return;
    }

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { full_name: form.fullName.trim(), country: form.country },
        },
      });

      if (error) {
        const msg = authErrorMessage(error.message);
        setErrors({ email: msg });
        toast.error(msg);
        return;
      }

      // Conta já existente devolve user sem identidades associadas.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        const msg = "Já existe uma conta com este email. Entra em vez de criar conta.";
        setErrors({ email: msg });
        toast.error(msg);
        return;
      }

      let session = data.session;
      if (!session) {
        const signIn = await supabase.auth.signInWithPassword({ email, password: form.password });
        if (signIn.error) {
          toast.success("Conta criada. Confirma o teu email para entrares.");
          navigate({ to: "/login" });
          return;
        }
        session = signIn.data.session;
      }

      if (session?.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: session.user.id,
          full_name: form.fullName.trim(),
          email,
          country: form.country,
        });
        if (profileError) console.error("[signup] perfil:", profileError.message);
      }

      toast.success("Conta criada com sucesso.");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(authErrorMessage(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const errText = (k: keyof Errors) =>
    errors[k] ? <span className="mt-1 block text-xs font-medium text-destructive">{errors[k]}</span> : null;

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
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Nome completo">
          <input
            className={input}
            placeholder="O teu nome completo"
            value={form.fullName}
            onChange={set("fullName")}
          />
          {errText("fullName")}
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={input}
            placeholder="nome@email.com"
            value={form.email}
            onChange={set("email")}
          />
          {errText("email")}
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
              className={input}
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
            />
            {errText("password")}
          </Field>
          <Field label="Confirmar">
            <input
              type="password"
              className={input}
              placeholder="••••••••"
              value={form.confirm}
              onChange={set("confirm")}
            />
            {errText("confirm")}
          </Field>
        </div>
        <div>
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                setErrors((p) => ({ ...p, terms: undefined }));
              }}
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
          {errText("terms")}
        </div>
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
