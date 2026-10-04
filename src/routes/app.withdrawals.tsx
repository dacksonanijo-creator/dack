import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock, Smartphone, Wallet, CreditCard } from "lucide-react";
import { useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { getMyPayouts, refreshMyPayouts, requestWithdrawal } from "@/lib/payouts/payouts.functions";
import { PAYOUT_RATES, type WithdrawalStatus } from "@/lib/payouts/types";

const WITHDRAW_ERRORS: Record<string, string> = {
  insufficient_balance: "Saldo insuficiente.",
  withdrawal_in_progress: "Já tens um levantamento em processamento.",
  invalid_amount: "Valor inválido.",
  invalid_account: "Número M-Pesa inválido (84/85 xxx xxxx).",
  not_configured: "Levantamentos M-Pesa ainda não estão ativos.",
  method_unavailable: "Método indisponível.",
};
const mapStatus = (s: WithdrawalStatus): RequestStatus =>
  s === "paid" ? "paid" : s === "approved" ? "approved" : s === "failed" || s === "rejected" || s === "cancelled" || s === "reversed" ? "rejected" : "review";

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

const usd = (v: number) => `$${v.toFixed(2)}`;
const toLocal = (v: number) =>
  `${new Intl.NumberFormat(local.locale, { maximumFractionDigits: 0 }).format(v * local.rate)} ${local.code}`;

type MethodId = "mpesa";

type RequestStatus = "review" | "approved" | "rejected" | "paid";

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: MethodId;
  date: string;
  status: RequestStatus;
}

const statusTone: Record<RequestStatus, string> = {
  review: "text-warning",
  approved: "text-task-accent",
  rejected: "text-destructive",
  paid: "text-task-accent",
};

function WithdrawalsPage() {
  const t = useT();
  const { locale } = useLocale();
  const qc = useQueryClient();
  const fetchPayouts = useServerFn(getMyPayouts);
  const refreshFn = useServerFn(refreshMyPayouts);
  const requestFn = useServerFn(requestWithdrawal);
  const payouts = useQuery({ queryKey: ["payouts"], queryFn: () => fetchPayouts() });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<MethodId>("mpesa");
  const [destination, setDestination] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());

  const availableUsd = (payouts.data?.available ?? 0) / PAYOUT_RATES.USD_TO_MZN;
  const requests: WithdrawalRequest[] = (payouts.data?.withdrawals ?? []).map((w) => ({
    id: w.id,
    amount: w.amount / PAYOUT_RATES.USD_TO_MZN,
    method: w.method as MethodId,
    date: new Date(w.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }),
    status: mapStatus(w.status),
  }));
  const hasProcessing = payouts.data?.withdrawals.some((w) => w.status === "processing");

  useEffect(() => {
    if (!hasProcessing) return;
    const id = setInterval(async () => {
      await refreshFn().catch(() => null);
      qc.invalidateQueries({ queryKey: ["payouts"] });
    }, 20000);
    return () => clearInterval(id);
  }, [hasProcessing, refreshFn, qc]);

  const methods: { id: MethodId; name: string; hint: string; icon: typeof Smartphone }[] = [
    { id: "mpesa", name: t("withdraw.method.mpesa"), hint: t("withdraw.hint.mobileWallet"), icon: Smartphone },
  ];
