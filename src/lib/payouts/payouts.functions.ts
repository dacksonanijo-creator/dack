import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_WITHDRAWAL_USD, MIN_WITHDRAWAL_USD, PAYOUT_RATES, type RequestWithdrawalResult, type WithdrawalDTO } from "./types";

type Row = {
  id: string; reference: string | null; method: string; amount: number; currency: string;
  status: string; created_at: string; failure_reason: string | null;
};
const toDTO = (r: Row): WithdrawalDTO => ({
  id: r.id, reference: r.reference, method: r.method, amount: Number(r.amount), currency: r.currency,
  status: r.status as WithdrawalDTO["status"], createdAt: r.created_at, failureReason: r.failure_reason,
});

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    method: z.enum(["mpesa"]),
    amountUsd: z.number().min(MIN_WITHDRAWAL_USD).max(MAX_WITHDRAWAL_USD),
    account: z.string().trim().min(9).max(20),
    accountHolder: z.string().trim().min(2).max(100).optional(),
    idempotencyKey: z.string().uuid(),
  }).parse(i))
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
      _min_amount: null,
      _max_amount: null,
    });
    if (error || !row) {
      const m = error?.message ?? "";
      const known = [
        "insufficient_ledger_balance","withdrawal_in_progress","invalid_amount",
        "withdrawal_method_not_configured","daily_withdrawal_limit",
        "weekly_withdrawal_limit","monthly_withdrawal_limit","withdrawal_request_limit",
        "invalid_account","invalid_account_holder","profile_not_found",
      ].find((k) => m.includes(k));
      return { ok: false, error: known ?? "request_failed" };
    }
    return { ok: true, withdrawal: toDTO(row as unknown as Row) };
  });

export const getMyPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: summary }, { data: rows }] = await Promise.all([
      context.supabase.rpc("get_my_withdrawal_summary"),
      context.supabase.from("withdrawals").select("id,reference,method,amount,currency,status,created_at,failure_reason").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50),
    ]);
    const s = Array.isArray(summary) ? summary[0] : summary;
    return {
      available: Number(s?.available ?? 0),
      reserved: Number(s?.reserved ?? 0),
      pending: Number(s?.reserved ?? 0),
      currency: s?.currency ?? "MZN",
      withdrawals: (rows ?? []).map((r) => toDTO(r as unknown as Row)),
    };
  });

export const refreshMyPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("withdrawals").select("id").eq("user_id", context.userId).eq("status", "processing" as never);
    const { processWithdrawal } = await import("./processor.server");
    let checked = 0;
    for (const row of data ?? []) {
      await processWithdrawal(row.id, "query");
      checked++;
    }
    return { checked };
  });
