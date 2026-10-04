import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const adminGate = async (context: any) => {
  const { data, error } = await context.supabase.rpc("is_taskora_admin");
  if (error || !data) throw new Error("Forbidden");
};

export const listAdminWithdrawals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    status: z.string().nullable().optional(),
    search: z.string().max(100).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await adminGate(context);
    const { data: rows, error } = await context.supabase.rpc("get_admin_withdrawals", {
      p_status: data.status || null,
      p_search: data.search || null,
      p_limit: 500,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const approveAdminWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await adminGate(context);
    const { data: row, error } = await context.supabase.rpc("approve_withdrawal", { p_withdrawal_id: data.id });
    if (error) throw new Error(error.message);
    return row;
  });

export const rejectAdminWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(1000) }).parse(i))
  .handler(async ({ data, context }) => {
    await adminGate(context);
    const { data: row, error } = await context.supabase.rpc("reject_withdrawal", { p_withdrawal_id: data.id, p_reason: data.reason });
    if (error) throw new Error(error.message);
    return row;
  });

export const reviewAdminWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(1000) }).parse(i))
  .handler(async ({ data, context }) => {
    await adminGate(context);
    const { data: row, error } = await context.supabase.rpc("mark_withdrawal_review", { p_withdrawal_id: data.id, p_reason: data.reason });
    if (error) throw new Error(error.message);
    return row;
  });

export const processAdminWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), mode: z.enum(["send","query"]).default("send") }).parse(i))
  .handler(async ({ data, context }) => {
    await adminGate(context);
    const { processWithdrawal } = await import("./processor.server");
    return processWithdrawal(data.id, data.mode);
  });

export const retryAdminWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await adminGate(context);
    const { data: row, error } = await context.supabase.rpc("retry_failed_withdrawal", { p_withdrawal_id: data.id });
    if (error) throw new Error(error.message);
    return row;
  });

export const getAdminWithdrawalRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminGate(context);
    const { data, error } = await context.supabase.from("withdrawal_rules").select("*").order("country").order("method");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAdminWithdrawalRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().nullable().optional(),
    country: z.string().length(2),
    method: z.string().min(2),
    currency: z.string().min(3).max(5),
    enabled: z.boolean(),
    min: z.number().positive(),
    max: z.number().positive(),
    daily: z.number().positive().nullable(),
    weekly: z.number().positive().nullable(),
    monthly: z.number().positive().nullable(),
    maxRequests: z.number().int().positive(),
    fee: z.number().nonnegative(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await adminGate(context);
    const { data: row, error } = await context.supabase.rpc("upsert_withdrawal_rule", {
      p_id: data.id ?? null, p_country: data.country, p_method: data.method, p_currency: data.currency,
      p_enabled: data.enabled, p_min: data.min, p_max: data.max, p_daily: data.daily,
      p_weekly: data.weekly, p_monthly: data.monthly, p_max_requests: data.maxRequests, p_fee: data.fee,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const getAdminWithdrawalReconciliation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminGate(context);
    const { data, error } = await context.supabase.rpc("get_withdrawal_reconciliation");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
