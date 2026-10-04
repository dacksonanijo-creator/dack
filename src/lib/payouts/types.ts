/** Métodos de levantamento realmente suportados pelo backend. */
export type PayoutMethod = "mpesa";

export const PAYOUT_RATES = { USD_TO_MZN: 70 } as const;
export const MIN_WITHDRAWAL_USD = 3;
export const MAX_WITHDRAWAL_USD = 1000;

export type WithdrawalStatus =
  | "pending" | "review" | "approved" | "processing" | "paid"
  | "failed" | "rejected" | "cancelled" | "reversed";

export interface WithdrawalDTO {
  id: string;
  reference: string | null;
  method: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  createdAt: string;
  failureReason: string | null;
}

export interface RequestWithdrawalResult {
  ok: boolean;
  error?: string;
  withdrawal?: WithdrawalDTO;
}
