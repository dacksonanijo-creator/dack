import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/taskora/admin-shell";

export const Route = createFileRoute("/admin/companies")({
  head: () => ({
    meta: [
      { title: "Empresas — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Empresas anunciantes e respetivas campanhas." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <AdminPageHeader title="Empresas" description="Empresas anunciantes e respetivas campanhas." />
      <AdminPlaceholder items={["Lista de empresas", "Aprovação de registo", "Campanhas ativas", "Faturação da empresa", "Limites e plafonds", "Documentos de verificação"]} />
    </div>
  );
}
