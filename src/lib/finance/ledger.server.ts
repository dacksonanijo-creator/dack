import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type TaskConversionInput = {
  taskId?: string | null;
  conversionId: string;
  userId: string;
  provider: string;
  providerTransactionId?: string | null;
  transactionId?: string | null;
  idempotencyKey: string;
  grossAmount: number;
  providerFees?: number;
  adjustments?: number;
  reversals?: number;
  currency?: string;
  originalCurrency?: string | null;
  originalAmount?: number | null;
  exchangeRate?: number | null;
  convertedAmount?: number | null;
  metadata?: Record<string, unknown>;
};

/**
 * Server-only financial entry point.
 * Provider integrations must call this after the backend has independently
 * validated the conversion value. The browser must never supply the amount.
 */
export async function recognizeTaskConversion(input: TaskConversionInput) {
  const { data, error } = await (supabaseAdmin as any).rpc("recognize_task_conversion", {
    p_task_id: input.taskId ?? null,
    p_conversion_id: input.conversionId,
    p_user_id: input.userId,
    p_provider: input.provider,
    p_provider_transaction_id: input.providerTransactionId ?? null,
    p_transaction_id: input.transactionId ?? null,
    p_idempotency_key: input.idempotencyKey,
    p_gross_amount: input.grossAmount,
    p_provider_fees: input.providerFees ?? 0,
    p_adjustments: input.adjustments ?? 0,
    p_reversals: input.reversals ?? 0,
    p_currency: input.currency ?? "MZN",
    p_original_currency: input.originalCurrency ?? null,
    p_original_amount: input.originalAmount ?? null,
    p_exchange_rate: input.exchangeRate ?? null,
    p_converted_amount: input.convertedAmount ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) throw error;
  return data;
}

export async function makeTaskConversionAvailable(conversionId: string) {
  const { data, error } = await (supabaseAdmin as any).rpc("make_task_conversion_available", {
    p_conversion_id: conversionId,
  });
  if (error) throw error;
  return data;
}

export async function reverseTaskConversion(conversionId: string, reason: string) {
  const { data, error } = await supabaseAdmin.rpc("reverse_task_conversion", {
    p_conversion_id: conversionId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}
