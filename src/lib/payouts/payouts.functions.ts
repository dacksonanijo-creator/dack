import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MAX_WITHDRAWAL_USD,
  MIN_WITHDRAWAL_USD,
  PAYOUT_RATES,
  type RequestWithdrawalResult,
  type WithdrawalDTO,
} from "./types";

type Row = {
  id: string; reference: string | null; method: string; amount: number; currency: string;
  status: string; created_at: string; failure_reason: string | null;
};
const toDTO = (r: Row): WithdrawalDTO => ({
  id: r.id, reference: r.reference, method: r.method, amount: Number(r.amount), currency: r.currency,
  status: r.status as WithdrawalDTO["status"], createdAt: r.created_at, failureReason: r.failure_reason,
});

async function processWithdrawal(id: string, mode: "send" | "query") {
  const { processWithdrawal: run } = await import("./processor.server");
  return run(id, mode);
}

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      method: z.enum(["mpesa"]),
      amountUsd: z.number().min(MIN_WITHDRAWAL_USD).max(MAX_WITHDRAWAL_USD),
      account: z.string().trim().min(9).max(20),
      accountHolder: z.string().trim().max(100).optional(),
      idempotencyKey: z.string().uuid(),
    }).parse(i),
  )
  .handler(async ({ data, context }): Promise<RequestWithdrawalResult> => {
    const { getPayoutProvider } = await import("./registry.server");
    const provider = getPayoutProvider(data.method);
    if (!provider) return { ok: false, error: "method_unavailable" };
    if (!provider.isConfigured()) return { ok: false, error: "not_configured" };
    const msisdn = provider.normalizeAccount(data.account);
    if (!msisdn) return { ok: false, error: "invalid_account" };

    const rate = PAYOUT_RATES.USD_TO_MZN;
    const { data: row, error } = await context.supabase.rpc("request_withdrawal", {
      _method: data.method,
      _amount: Math.round(data.amountUsd * rate),
      _account_holder: data.accountHolder || "—",
      _account_number: msisdn,
      _idempotency_key: data.idempotencyKey,
      _min_amount: MIN_WITHDRAWAL_USD * rate,
      _max_amount: MAX_WITHDRAWAL_USD * rate,
    });
    if (error || !row) {
      const m = error?.message ?? "";
      const known = ["insufficient_balance", "withdrawal_in_progress", "invalid_amount", "wallet_not_found"].find((k) => m.includes(k));
      return { ok: false, error: known ?? "request_failed" };
    }
    const r = row as unknown as Row;
    if (r.status === "pending") await processWithdrawal(r.id, "send");

    const { data: fresh } = await context.supabase.from("withdrawals").select("*").eq("id", r.id).single();
    return { ok: true, withdrawal: toDTO((fresh ?? r) as unknown as Row) };
  });

export const getMyPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: wallet }, { data: rows }] = await Promise.all([
      context.supabase.from("wallets").select("available_balance, pending_balance, currency").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("withdrawals").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50),
    ]);
    return {
      available: Number(wallet?.available_balance ?? 0),
      pending: Number(wallet?.pending_balance ?? 0),
      currency: wallet?.currency ?? "MZN",
      withdrawals: (rows ?? []).map((r) => toDTO(r as unknown as Row)),
    };
  });

/** Consulta o estado de levantamentos "em processamento" do próprio utilizador. */
export const refreshMyPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("withdrawals").select("id")
      .eq("user_id", context.userId).eq("status", "processing" as never);
    for (const r of data ?? []) await processWithdrawal(r.id, "query");
    return { checked: data?.length ?? 0 };
  });
