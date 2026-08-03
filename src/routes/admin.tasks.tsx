import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({
    meta: [
      { title: "Tarefas — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Aprovação, edição e monitorização de tarefas." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Tarefas" description="Aprovação, edição e monitorização de tarefas." />
      <AdminPlaceholder items={["Tarefas pendentes de aprovação", "Tarefas ativas", "Tarefas concluídas", "Submissões e provas", "Rejeições e motivos", "Definição de vagas e prazos"]} />
    </div>
  );
}
