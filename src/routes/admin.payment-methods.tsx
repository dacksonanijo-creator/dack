import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/payment-methods")({
  head: () => ({
    meta: [
      { title: "Métodos de pagamento — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Canais de pagamento e levantamento disponíveis." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Métodos de pagamento" description="Canais de pagamento e levantamento disponíveis." />
      <AdminPlaceholder items={["M-Pesa", "e-Mola", "PayPal", "Transferência bancária", "Taxas por método", "Ativar / desativar método"]} />
    </div>
  );
}
