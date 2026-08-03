import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/security")({
  head: () => ({
    meta: [
      { title: "Segurança — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Anti-fraude, permissões e alertas de risco." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Segurança" description="Anti-fraude, permissões e alertas de risco." />
      <AdminPlaceholder items={["Regras anti-fraude", "Contas suspeitas", "Tentativas de acesso", "Autenticação de dois fatores", "Permissões administrativas", "Bloqueios automáticos"]} />
    </div>
  );
}
