import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface Group { key: string; count: number; amount: number }
export interface Divergence { userId: string; type: string; expected: number; actual: number; detail: string }
export interface PayoutReport {
  from: string; to: string;
  withdrawals: { id: string; reference: string | null; userId: string; method: string; status: string; amount: number; currency: string; createdAt: string; transactionId: string | null }[];
  transactions: { id: string; userId: string; type: string; amount: number; currency: string; reference: string | null; createdAt: string }[];
  byStatus: Group[]; byMethod: Group[]; byDay: Group[]; txByType: Group[];
  divergences: Divergence[];
}

const group = <T,>(rows: T[], key: (r: T) => string, amt: (r: T) => number): Group[] => {
  const m = new Map<string, Group>();
  for (const r of rows) {
    const k = key(r); const g = m.get(k) ?? { key: k, count: 0, amount: 0 };
    g.count++; g.amount += amt(r); m.set(k, g);
  }
  return [...m.values()].sort((a, b) => a.key.localeCompare(b.key));
};

export const getPayoutReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ from: z.string().date(), to: z.string().date() }).parse(i))
  .handler(async ({ data, context }): Promise<PayoutReport> => {
    const { data: isAdmin } = await context.supabase.rpc("is_platform_admin");
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = `${data.from}T00:00:00Z`, end = `${data.to}T23:59:59.999Z`;

    const [w, t, wallets, allW, allTx] = await Promise.all([
      supabaseAdmin.from("withdrawals").select("*").gte("created_at", start).lte("created_at", end).order("created_at", { ascending: false }).limit(5000),
      supabaseAdmin.from("transactions").select("*").gte("created_at", start).lte("created_at", end).order("created_at", { ascending: false }).limit(5000),
      supabaseAdmin.from("wallets").select("user_id, pending_balance, total_withdrawn"),
      supabaseAdmin.from("withdrawals").select("user_id, amount, status, reference, created_at, transaction_id"),
      supabaseAdmin.from("transactions").select("reference").eq("type", "withdrawal"),
    ]);

    const withdrawals = (w.data ?? []).map((r) => ({
      id: r.id, reference: r.reference, userId: r.user_id, method: r.method, status: String(r.status),
      amount: Number(r.amount), currency: r.currency, createdAt: r.created_at, transactionId: r.transaction_id,
    }));
    const transactions = (t.data ?? []).map((r) => ({
      id: r.id, userId: r.user_id, type: String(r.type), amount: Number(r.amount), currency: r.currency, reference: r.reference, createdAt: r.created_at,
    }));

    // Divergências (sobre todos os dados, não apenas o período)
    const divergences: Divergence[] = [];
    const per = new Map<string, { open: number; paid: number }>();
    for (const r of allW.data ?? []) {
      const p = per.get(r.user_id) ?? { open: 0, paid: 0 };
      const s = String(r.status);
      if (s === "pending" || s === "processing") p.open += Number(r.amount);
      if (s === "paid") p.paid += Number(r.amount);
      per.set(r.user_id, p);
    }
    for (const wl of wallets.data ?? []) {
      const p = per.get(wl.user_id) ?? { open: 0, paid: 0 };
      if (Math.abs(Number(wl.pending_balance) - p.open) > 0.009)
        divergences.push({ userId: wl.user_id, type: "saldo_pendente", expected: p.open, actual: Number(wl.pending_balance), detail: "Saldo pendente da carteira ≠ levantamentos em aberto" });
      if (Math.abs(Number(wl.total_withdrawn) - p.paid) > 0.009)
        divergences.push({ userId: wl.user_id, type: "total_levantado", expected: p.paid, actual: Number(wl.total_withdrawn), detail: "Total levantado da carteira ≠ levantamentos pagos" });
    }
    const txRefs = new Set((allTx.data ?? []).map((r) => r.reference));
    const hourAgo = Date.now() - 3600_000;
    for (const r of allW.data ?? []) {
      const s = String(r.status);
      if (s === "paid" && !txRefs.has(r.reference))
        divergences.push({ userId: r.user_id, type: "sem_transacao", expected: Number(r.amount), actual: 0, detail: `Levantamento ${r.reference} pago sem registo no histórico` });
      if (s === "paid" && !r.transaction_id)
        divergences.push({ userId: r.user_id, type: "sem_id_provedor", expected: Number(r.amount), actual: 0, detail: `Levantamento ${r.reference} pago sem ID de transação do provedor` });
      if (s === "processing" && new Date(r.created_at).getTime() < hourAgo)
        divergences.push({ userId: r.user_id, type: "processamento_longo", expected: Number(r.amount), actual: 0, detail: `Levantamento ${r.reference} em processamento há mais de 1h` });
    }

    return {
      from: data.from, to: data.to, withdrawals, transactions,
      byStatus: group(withdrawals, (r) => r.status, (r) => r.amount),
      byMethod: group(withdrawals, (r) => r.method, (r) => r.amount),
      byDay: group(withdrawals, (r) => r.createdAt.slice(0, 10), (r) => r.amount),
      txByType: group(transactions, (r) => r.type, (r) => r.amount),
      divergences,
    };
  });
