import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { getPayoutReport, type Group } from "@/lib/payouts/reports.functions";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Relatórios exportáveis de levantamentos, transações e divergências." },
    ],
  }),
  component: Page,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number) => new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 2 }).format(n);

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function Page() {
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(() => iso(new Date()));
  const fn = useServerFn(getPayoutReport);
  const q = useQuery({ queryKey: ["payout-report", from, to], queryFn: () => fn({ data: { from, to } }) });
  const r = q.data;
  const tag = `${from}_${to}`;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Relatórios" description="Levantamentos, transações e divergências da carteira (valores em MZN)." />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <label className="text-xs text-muted-foreground">De
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground" />
        </label>
        <label className="text-xs text-muted-foreground">Até
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground" />
        </label>
        {r && (
          <div className="flex flex-wrap gap-2">
            <ExportBtn label="Levantamentos" onClick={() => downloadCsv(`levantamentos_${tag}.csv`, r.withdrawals)} />
            <ExportBtn label="Transações" onClick={() => downloadCsv(`transacoes_${tag}.csv`, r.transactions)} />
            <ExportBtn label="Resumo" onClick={() => downloadCsv(`resumo_${tag}.csv`, [
              ...r.byStatus.map((g) => ({ dimensao: "estado", ...g })),
              ...r.byMethod.map((g) => ({ dimensao: "metodo", ...g })),
              ...r.byDay.map((g) => ({ dimensao: "dia", ...g })),
              ...r.txByType.map((g) => ({ dimensao: "tipo_transacao", ...g })),
            ])} />
            <ExportBtn label="Divergências" onClick={() => downloadCsv(`divergencias_${tag}.csv`, r.divergences as unknown as Record<string, unknown>[])} />
          </div>
        )}
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {q.isError && <p className="text-sm text-destructive">Não foi possível gerar o relatório.</p>}
      {r && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Table title="Por estado" rows={r.byStatus} />
            <Table title="Por método" rows={r.byMethod} />
            <Table title="Por dia" rows={r.byDay} />
            <Table title="Transações por tipo" rows={r.txByType} />
          </div>
          <section className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Divergências ({r.divergences.length})</h2>
            {r.divergences.length === 0 ? (
              <p className="text-xs text-muted-foreground">Carteira interna e pagamentos processados coincidem.</p>
            ) : (
              <ul className="divide-y divide-border text-xs">
                {r.divergences.map((d, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 py-1.5">
                    <span className="text-foreground">{d.detail}</span>
                    <span className="text-muted-foreground">esperado {fmt(d.expected)} · atual {fmt(d.actual)} · {d.userId.slice(0, 8)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
      <Download className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Table({ title, rows }: { title: string; rows: Group[] }) {
  const total = rows.reduce((s, g) => s + g.amount, 0);
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados no período.</p> : (
        <table className="w-full text-xs">
          <tbody>
            {rows.map((g) => (
              <tr key={g.key} className="border-b border-border/60">
                <td className="py-1 text-foreground">{g.key}</td>
                <td className="py-1 text-right text-muted-foreground">{g.count}</td>
                <td className="py-1 text-right text-foreground">{fmt(g.amount)}</td>
              </tr>
            ))}
            <tr><td className="pt-1 font-semibold text-foreground">Total</td><td /><td className="pt-1 text-right font-semibold text-foreground">{fmt(total)}</td></tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
