/**
 * Formato interno unificado de tarefa da Taskora.
 * Todas as redes externas são convertidas para este formato.
 * Campos opcionais ficam indefinidos quando a rede não os fornece
 * (nunca inventamos dados).
 */
export interface UnifiedTask {
  /** ID único interno: `${provider}:${externalId}` */
  id: string;
  externalId: string;
  provider: string;
  providerLabel: string;
  title: string;
  description?: string;
  category?: string;
  reward?: number;
  currency?: string;
  estimatedMinutes?: number;
  deadline?: string;
  imageUrl?: string;
  actionUrl?: string;
  countries?: string[];
  status: "active" | "paused" | "expired";
}

export interface TaskFeedResult {
  tasks: UnifiedTask[];
  /** Redes consultadas com sucesso */
  providers: string[];
  /** Redes configuradas mas que falharam */
  failed: string[];
  /** Nenhuma rede está configurada (faltam credenciais) */
  notConfigured: boolean;
}
