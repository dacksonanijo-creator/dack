import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/apis")({
  head: () => ({
    meta: [
      { title: "APIs de tarefas — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Integrações com fornecedores externos de tarefas." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="APIs de tarefas" description="Integrações com fornecedores externos de tarefas." />
      <AdminPlaceholder items={["Fornecedores integrados", "Chaves de API", "Sincronização de ofertas", "Postbacks e callbacks", "Estado das integrações", "Registo de erros"]} />
    </div>
  );
}
