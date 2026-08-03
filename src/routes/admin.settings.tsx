import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Parâmetros globais da plataforma." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Configurações" description="Parâmetros globais da plataforma." />
      <AdminPlaceholder items={["Dados da plataforma", "Moedas e conversões", "Comissões e taxas", "Valor mínimo de saque", "Idiomas disponíveis", "Modo de manutenção"]} />
    </div>
  );
}
