import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/withdrawals")({
  head: () => ({
    meta: [
      { title: "Saques — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Pedidos de levantamento dos utilizadores." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Saques" description="Pedidos de levantamento dos utilizadores." />
      <AdminPlaceholder items={["Pedidos pendentes", "Aprovar / rejeitar pedido", "Processamento por lote", "Comprovativos de pagamento", "Limites de saque", "Histórico de saques"]} />
    </div>
  );
}
