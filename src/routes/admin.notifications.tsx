import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Comunicações enviadas aos utilizadores." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Notificações" description="Comunicações enviadas aos utilizadores." />
      <AdminPlaceholder items={["Enviar notificação", "Notificações automáticas", "Modelos de mensagem", "Campanhas e promoções", "Notificações por email", "Histórico de envios"]} />
    </div>
  );
}
