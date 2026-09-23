export type PayoutEnvironment = "sandbox" | "production";

export interface PayoutRequest {
  reference: string; // referência única Taskora (≤20 chars, alfanumérica)
  msisdn: string; // formato internacional já normalizado
  amount: number; // na moeda local do método
}

/** Resultado normalizado de qualquer provider. */
export type PayoutOutcome =
  | { state: "success"; transactionId?: string; conversationId?: string; code?: string; raw: unknown; httpStatus?: number }
  | { state: "failed"; code?: string; reason: string; conversationId?: string; raw: unknown; httpStatus?: number }
  /** Resultado incerto (timeout, erro de rede) → manter "processing" e consultar depois. */
  | { state: "unknown"; code?: string; reason: string; raw: unknown; httpStatus?: number };

export interface PayoutProvider {
  id: string;
  environment(): PayoutEnvironment;
  isConfigured(): boolean;
  normalizeAccount(input: string): string | null;
  send(req: PayoutRequest): Promise<PayoutOutcome>;
  query(req: { reference: string; queryReference: string }): Promise<PayoutOutcome>;
}
