import type { PayoutProvider } from "./providers/types.server";
import { mpesaProvider } from "./providers/mpesa.server";

/** Registar aqui futuros métodos (e-Mola, Airtel Money, Pix...). */
const providers: Record<string, PayoutProvider> = {
  mpesa: mpesaProvider,
};

export function getPayoutProvider(id: string): PayoutProvider | null {
  return providers[id] ?? null;
}
