import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";

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
  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entra para continuares onde ficaste.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/app" });
        }}
      >
        <Field label="Email ou nome de utilizador">
          <input className={input} placeholder="ana@email.com" defaultValue="" />
        </Field>
        <Field label="Palavra-passe">
          <input type="password" className={input} placeholder="••••••••" />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Esqueci a palavra-passe
          </Link>
        </div>
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base shadow-glow">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
