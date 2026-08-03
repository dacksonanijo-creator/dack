import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/wallet")({
  head: () => ({
    meta: [
      { title: "Carteira da plataforma — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Saldo global, reservas e movimentos internos." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Carteira da plataforma" description="Saldo global, reservas e movimentos internos." />
      <AdminPlaceholder items={["Saldo disponível da plataforma", "Saldo reservado", "Movimentos internos", "Comissões acumuladas", "Transferências manuais", "Extrato consolidado"]} />
    </div>
  );
}
