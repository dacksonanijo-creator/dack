import type { UnifiedTask } from "../types";

/**
 * Contrato de um adapter de rede de tarefas.
 * Para adicionar uma nova rede (AdGate, OfferToro, AyeT...) basta criar
 * um ficheiro que exporte um TaskProvider e registá-lo em registry.server.ts.
 */
export interface TaskProvider {
  /** slug interno, ex: "cpagrip" */
  slug: string;
  /** nome apresentado ao utilizador */
  label: string;
  /** true quando as credenciais existem no ambiente do servidor */
  isConfigured: () => boolean;
  /** obtém e normaliza as tarefas da rede */
  fetchTasks: (options: { country?: string }) => Promise<UnifiedTask[]>;
}
