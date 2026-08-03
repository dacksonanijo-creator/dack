import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({
    meta: [
      { title: "Logs do sistema — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Auditoria de ações e eventos técnicos." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Logs do sistema" description="Auditoria de ações e eventos técnicos." />
      <AdminPlaceholder items={["Ações administrativas", "Eventos de autenticação", "Erros do sistema", "Alterações de dados", "Chamadas a APIs externas", "Exportar registos"]} />
    </div>
  );
}
