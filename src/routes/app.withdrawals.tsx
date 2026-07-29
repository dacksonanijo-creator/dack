import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Lock, Smartphone, Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/withdrawals")({
  head: () => ({
    meta: [
      { title: "Saques — Taskora" },
      {
        name: "description",
        content:
          "Solicita levantamentos dos teus ganhos em USD via M-Pesa, e-Mola, PayPal ou cartão e acompanha o estado dos pedidos.",
      },
      { property: "og:title", content: "Saques — Taskora" },
      { property: "og:description", content: "Pedidos de levantamento e histórico de saques na Taskora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WithdrawalsPage,
});

/* Estrutura preparada para múltiplos países/moedas */
interface CurrencyConfig {
  code: string;
  rate: number; // 1 USD -> moeda local
  locale: string;
}

const currencies: Record<string, CurrencyConfig> = {
  MZ: { code: "MZN", rate: 70, locale: "pt-MZ" },
  AO: { code: "AOA", rate: 910, locale: "pt-AO" },
  BR: { code: "BRL", rate: 5.4, locale: "pt-BR" },
  PT: { code: "EUR", rate: 0.92, locale: "pt-PT" },
};

const userCountry = "MZ";
const local = currencies[userCountry];

const MIN_WITHDRAWAL = 3;
const availableUsd = 0;

const usd = (v: number) => `$${v.toFixed(2)}`;
const toLocal = (v: number) =>
  `${new Intl.NumberFormat(local.locale, { maximumFractionDigits: 0 }).format(v * local.rate)} ${local.code}`;

type MethodId = "mpesa" | "emola" | "paypal" | "card";

const methods: { id: MethodId; name: string; hint: string; icon: typeof Smartphone }[] = [
  { id: "mpesa", name: "M-Pesa", hint: "Carteira móvel", icon: Smartphone },
  { id: "emola", name: "e-Mola", hint: "Carteira móvel", icon: Smartphone },
  { id: "paypal", name: "PayPal", hint: "Conta internacional", icon: Wallet },
  { id: "card", name: "Cartão", hint: "Visa / Mastercard", icon: CreditCard },
];

type RequestStatus = "review" | "approved" | "rejected" | "paid";

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: MethodId;
  date: string;
  status: RequestStatus;
}

const statusLabels: Record<RequestStatus, string> = {
  review: "Em análise",
  approved: "Aprovado",
  rejected: "Rejeitado",
  paid: "Pago",
};

const statusTone: Record<RequestStatus, string> = {
  review: "text-warning",
  approved: "text-task-accent",
  rejected: "text-destructive",
  paid: "text-task-accent",
};

function WithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<MethodId>("mpesa");
  const [destination, setDestination] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canRequest = availableUsd >= MIN_WITHDRAWAL;
  const amountNumber = Number(amount.replace(",", ".")) || 0;

  const amountValid = useMemo(
    () => amountNumber >= MIN_WITHDRAWAL && amountNumber <= availableUsd && destination.trim().length >= 4,
    [amountNumber, destination],
  );

  const reset = () => {
    setOpen(false);
    setStep(1);
    setAmount("");
    setDestination("");
    setPassword("");
    setError(null);
  };

  const submit = () => {
    if (password.trim().length < 6) {
      setError("Introduz a palavra-passe da tua conta para confirmar.");
      return;
    }
    setRequests((prev) => [
      {
        id: `w${Date.now()}`,
        amount: amountNumber,
        method,
        date: new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }),
        status: "review",
      },
      ...prev,
    ]);
    reset();
  };

  return (
    <div className="-mx-4 -my-4 min-h-full bg-task-bg px-4 py-4 sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-base font-bold text-task-title">Saques</h1>
          <span className="text-[11px] text-task-muted">{requests.length} pedidos</span>
        </div>

        {/* Saldo disponível */}
        <div className="rounded-lg border border-task-border bg-task-card px-3 py-3">
          <p className="text-[10px] uppercase tracking-wide text-task-muted">Disponível para saque</p>
          <p className="mt-0.5 font-display text-[22px] font-bold leading-none text-task-title">
            {usd(availableUsd)}
          </p>
          <p className="mt-1 text-[11px] text-task-muted">({toLocal(availableUsd)})</p>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-task-border pt-2">
            <p className="text-[11px] text-task-muted">Valor mínimo para saque: {usd(MIN_WITHDRAWAL)}</p>
            <button
              disabled={!canRequest}
              onClick={() => setOpen(true)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                canRequest
                  ? "bg-task-accent text-task-bg hover:opacity-90"
                  : "cursor-not-allowed border border-task-border text-task-muted",
              )}
            >
              Solicitar saque
            </button>
          </div>
          {!canRequest && (
            <p className="mt-2 text-[11px] text-warning">
              Precisas de atingir o mínimo de {usd(MIN_WITHDRAWAL)} para solicitar um saque.
            </p>
          )}
        </div>

        {/* Métodos disponíveis */}
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-task-muted">Métodos de pagamento</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {methods.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-task-border bg-task-card px-2.5 py-2"
              >
                <m.icon className="h-3.5 w-3.5 shrink-0 text-task-accent" />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-task-title">{m.name}</p>
                  <p className="truncate text-[10px] text-task-muted">{m.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico */}
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-task-muted">Histórico de saques</p>
          {requests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-task-border px-4 py-8 text-center">
              <p className="text-[13px] font-medium text-task-title">Sem pedidos de saque</p>
              <p className="mt-1 text-[11px] text-task-muted">
                Os teus pedidos e o respetivo estado aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {requests.map((r) => (
                <article
                  key={r.id}
                  className="rounded-lg border border-task-border bg-task-card px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-task-title">
                      {methods.find((m) => m.id === r.method)?.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-task-muted">{r.date}</span>
                  </div>
                  <p className="mt-1 font-display text-[15px] font-bold text-task-title">{usd(r.amount)}</p>
                  <p className="text-[10px] text-task-muted">({toLocal(r.amount)})</p>
                  <p className={cn("mt-0.5 text-[11px] font-medium", statusTone[r.status])}>
                    {statusLabels[r.status]}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fluxo de pedido */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-xl border border-task-border bg-task-card p-4 sm:rounded-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[14px] font-bold text-task-title">
                {step === 1 ? "Solicitar saque" : "Confirmar pedido"}
              </h2>
              <button onClick={reset} className="text-[11px] text-task-muted hover:text-task-title">
                Cancelar
              </button>
            </div>

            {step === 1 ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-[11px] text-task-muted">Valor (USD)</label>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.slice(0, 10))}
                    placeholder="3.00"
                    className="mt-1 w-full rounded-md border border-task-border bg-task-bg px-2.5 py-1.5 text-[13px] text-task-title outline-none placeholder:text-task-muted focus:border-task-accent/60"
                  />
                  <p className="mt-1 text-[10px] text-task-muted">
                    {amountNumber > 0 ? `≈ ${toLocal(amountNumber)}` : `Mínimo ${usd(MIN_WITHDRAWAL)}`}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-task-muted">Método</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                          method === m.id
                            ? "border-task-accent/60 bg-task-accent/10"
                            : "border-task-border hover:border-task-accent/40",
                        )}
                      >
                        <m.icon className="h-3.5 w-3.5 shrink-0 text-task-accent" />
                        <span className="truncate text-[12px] text-task-title">{m.name}</span>
                        {method === m.id && <Check className="ml-auto h-3 w-3 text-task-accent" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-task-muted">
                    {method === "paypal"
                      ? "Email PayPal"
                      : method === "card"
                        ? "Número do cartão"
                        : "Número de telemóvel"}
                  </label>
                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value.slice(0, 60))}
                    className="mt-1 w-full rounded-md border border-task-border bg-task-bg px-2.5 py-1.5 text-[13px] text-task-title outline-none placeholder:text-task-muted focus:border-task-accent/60"
                    placeholder={method === "paypal" ? "nome@email.com" : "84 000 0000"}
                  />
                </div>

                <button
                  disabled={!amountValid}
                  onClick={() => setStep(2)}
                  className={cn(
                    "w-full rounded-md py-2 text-[12px] font-medium transition-colors",
                    amountValid
                      ? "bg-task-accent text-task-bg hover:opacity-90"
                      : "cursor-not-allowed border border-task-border text-task-muted",
                  )}
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-md border border-task-border bg-task-bg px-3 py-2 text-[12px]">
                  <Row label="Valor" value={`${usd(amountNumber)} (${toLocal(amountNumber)})`} />
                  <Row label="Método" value={methods.find((m) => m.id === method)!.name} />
                  <Row label="Destino" value={destination} />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] text-task-muted">
                    <Lock className="h-3 w-3" /> Digita a tua palavra-passe para confirmar o saque
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="mt-1 w-full rounded-md border border-task-border bg-task-bg px-2.5 py-1.5 text-[13px] text-task-title outline-none focus:border-task-accent/60"
                    placeholder="••••••••"
                  />
                  {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-md border border-task-border py-2 text-[12px] text-task-muted hover:text-task-title"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={submit}
                    className="flex-1 rounded-md bg-task-accent py-2 text-[12px] font-medium text-task-bg hover:opacity-90"
                  >
                    Enviar pedido
                  </button>
                </div>
                <p className="text-[10px] text-task-muted">
                  O pedido fica em análise até aprovação administrativa.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-task-muted">{label}</span>
      <span className="truncate text-task-title">{value}</span>
    </div>
  );
}
