import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Exportações e análises operacionais e financeiras." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Relatórios" description="Exportações e análises operacionais e financeiras." />
      <AdminPlaceholder items={["Relatório financeiro", "Relatório de utilizadores", "Relatório de tarefas", "Relatório de saques", "Exportar CSV / PDF", "Relatórios agendados"]} />
    </div>
  );
}
