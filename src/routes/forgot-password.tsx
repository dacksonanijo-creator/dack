import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AuthLayout, Field } from "@/components/taskora/auth-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar palavra-passe — Taskora" },
      { name: "description", content: "Recupera o acesso à tua conta Taskora por email." },
      { property: "og:title", content: "Recuperar palavra-passe — Taskora" },
      { property: "og:description", content: "Enviamos-te um link de recuperação por email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Forgot,
});

const input =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10";

function Forgot() {
  const [sent, setSent] = useState(false);
  return (
    <AuthLayout
      title="Recuperar palavra-passe"
      subtitle="Enviamos-te um link seguro para redefinires o acesso."
      backTo="/login"
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Voltar ao login
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center rounded-2xl bg-accent/60 p-6 text-center">
          <CheckCircle2 className="h-9 w-9 text-money" />
          <p className="mt-3 font-display text-sm font-bold">Link enviado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifica a tua caixa de entrada e segue as instruções.
          </p>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <Field label="Email">
            <input type="email" className={input} placeholder="ana@email.com" />
          </Field>
          <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base shadow-glow">
            Enviar
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
