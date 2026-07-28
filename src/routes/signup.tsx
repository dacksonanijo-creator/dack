import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";
import { countries } from "@/components/taskora/mock-data";

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
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/app" });
        }}
      >
        <Field label="Nome completo">
          <input className={input} placeholder="Ana Mucavele" />
        </Field>
        <Field label="Nome de utilizador">
          <input className={input} placeholder="anamuc" />
        </Field>
        <Field label="Email">
          <input type="email" className={input} placeholder="ana@email.com" />
        </Field>
        <Field label="País">
          <select className={input} defaultValue={countries[0]}>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Palavra-passe">
            <input type="password" className={input} placeholder="••••••••" />
          </Field>
          <Field label="Confirmar">
            <input type="password" className={input} placeholder="••••••••" />
          </Field>
        </div>
        <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--primary)]" />
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
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base shadow-glow">
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
