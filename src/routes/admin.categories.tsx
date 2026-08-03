import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Categorias — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Organização das tarefas por categoria." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Categorias" description="Organização das tarefas por categoria." />
      <AdminPlaceholder items={["Criar categoria", "Editar categoria", "Ordenar categorias", "Ícones e cores", "Ativar / desativar", "Tarefas por categoria"]} />
    </div>
  );
}
