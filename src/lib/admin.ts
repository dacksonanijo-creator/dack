import {
  Activity,
  CheckCircle2,
  Banknote,
  Bell,
  Building2,
  CreditCard,
  FileBarChart,
  FolderTree,
  ImageUp,

  LayoutDashboard,
  ListChecks,
  Plug,
  ScrollText,
  Settings,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Emails com acesso ao painel administrativo. */
export const ADMIN_EMAILS = [
  "dackson144@gmail.com",
  "dacksonanijo@gmail.com",
] as const;

/** @deprecated usar ADMIN_EMAILS */
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export function isAdminEmail(email?: string | null) {
  const normalized = (email ?? "").trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized as (typeof ADMIN_EMAILS)[number]);
}

export interface AdminSection {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const adminSections: AdminSection[] = [
  {
    to: "/admin",
    label: "Dashboard",
    description: "Visão geral da plataforma.",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: "/admin/users",
    label: "Utilizadores",
    description: "Contas registadas, estados e verificações.",
    icon: Users,
  },
  {
    to: "/admin/companies",
    label: "Empresas",
    description: "Empresas anunciantes e respetivas campanhas.",
    icon: Building2,
  },
  {
    to: "/admin/tasks",
    label: "Tarefas",
    description: "Aprovação, edição e monitorização de tarefas.",
    icon: ListChecks,
  },
  {
    to: "/admin/verifications",
    label: "Verificações",
    description: "Motor de verificação e libertação financeira das conclusões.",
    icon: CheckCircle2,
  },
  {
    to: "/admin/categories",
    label: "Categorias",
    description: "Organização das tarefas por categoria.",
    icon: FolderTree,
  },
  {
    to: "/admin/payments",
    label: "Pagamentos",
    description: "Entradas, faturação e conciliação.",
    icon: CreditCard,
  },
  {
    to: "/admin/withdrawals",
    label: "Saques",
    description: "Pedidos de levantamento e aprovações.",
    icon: Banknote,
  },
  {
    to: "/admin/finance",
    label: "Financeiro",
    description: "Ledger, distribuição, receita e obrigações financeiras.",
    icon: Wallet,
  },
  {
    to: "/admin/wallet",
    label: "Carteira TASKORA",
    description: "Receita TASKORA, obrigações e movimentos do ledger.",
    icon: Wallet,
  },
  {
    to: "/admin/apis",
    label: "APIs de tarefas",
    description: "Integrações com fornecedores externos de tarefas.",
    icon: Plug,
  },
  {
    to: "/admin/payment-methods",
    label: "Métodos de pagamento",
    description: "M-Pesa, e-Mola, PayPal e futuros canais.",
    icon: CreditCard,
  },
  {
    to: "/admin/reports",
    label: "Relatórios",
    description: "Exportações e análises financeiras e operacionais.",
    icon: FileBarChart,
  },
  {
    to: "/admin/notifications",
    label: "Notificações",
    description: "Comunicações e campanhas para utilizadores.",
    icon: Bell,
  },
  {
    to: "/admin/security",
    label: "Segurança",
    description: "Anti-fraude, permissões e alertas de risco.",
    icon: Shield,
  },
  {
    to: "/admin/branding",
    label: "Logótipo oficial",
    description: "Publicar e gerir a identidade visual da marca.",
    icon: ImageUp,
  },
  {
    to: "/admin/settings",
    label: "Configurações",
    description: "Parâmetros globais da plataforma.",
    icon: Settings,
  },
  {
    to: "/admin/logs",
    label: "Logs do sistema",
    description: "Auditoria de ações e eventos técnicos.",
    icon: ScrollText,
  },
];

export const adminActivityIcon = Activity;
