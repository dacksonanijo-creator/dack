import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Entradas de dinheiro e conciliação financeira." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Pagamentos" description="Entradas de dinheiro e conciliação financeira." />
      <AdminPlaceholder items={["Pagamentos recebidos", "Pagamentos de empresas", "Conciliação bancária", "Faturas e recibos", "Reembolsos", "Falhas de pagamento"]} />
    </div>
  );
}
