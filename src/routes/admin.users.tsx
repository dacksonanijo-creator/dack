import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Utilizadores — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Gestão de contas registadas na plataforma." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Utilizadores" description="Gestão de contas registadas na plataforma." />
      <AdminPlaceholder items={["Lista e pesquisa de utilizadores", "Detalhe da conta", "Verificação de identidade", "Bloquear / desbloquear conta", "Histórico de tarefas do utilizador", "Ajustes manuais de saldo"]} />
    </div>
  );
}
