import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, emailRe } from "@/lib/auth-errors";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Taskora" },
      { name: "description", content: "Acede à tua conta Taskora e continua as tuas microtarefas." },
      { property: "og:title", content: "Entrar — Taskora" },
      { property: "og:description", content: "Acede à tua conta Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const input =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!emailRe.test(email.trim())) {
      setError("Introduz um email válido.");
      return;
    }
    if (!password) {
      setError("Introduz a tua palavra-passe.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) {
        const msg = authErrorMessage(err.message);
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!data.session) {
        setError("Não foi possível iniciar sessão. Tenta novamente.");
        return;
      }
      navigate({ to: "/app" });
    } catch (err) {
      const msg = authErrorMessage(err instanceof Error ? err.message : String(err));
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entra para continuares onde ficaste.">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Email">
          <input
            type="email"
            className={input}
            placeholder="nome@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label="Palavra-passe">
          <input
            type="password"
            className={input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
        </Field>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Esqueci a palavra-passe
          </Link>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 w-full rounded-xl text-base shadow-glow"
        >
          {loading ? "A entrar…" : "Entrar"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Ainda não tens conta?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
