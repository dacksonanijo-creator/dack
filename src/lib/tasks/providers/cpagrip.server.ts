import process from "node:process";

import type { UnifiedTask } from "../types";
import type { TaskProvider } from "./types.server";

const SLUG = "cpagrip";
const LABEL = "CPAGrip";

interface CpaGripOffer {
  offerid?: string | number;
  offer_id?: string | number;
  title?: string;
  description?: string;
  payout?: string | number;
  offerlink?: string;
  offer_url?: string;
  previewimage?: string;
  image?: string;
  categories?: string;
  category?: string;
  country?: string;
  countries?: string;
  expiration?: string;
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function toText(value: unknown): string | undefined {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : undefined;
}

function toCountries(offer: CpaGripOffer): string[] | undefined {
  const raw = toText(offer.countries) ?? toText(offer.country);
  if (!raw) return undefined;
  const list = raw
    .split(/[,;|\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function normalize(offer: CpaGripOffer): UnifiedTask | null {
  const externalId = toText(String(offer.offerid ?? offer.offer_id ?? ""));
  const title = toText(offer.title);
  if (!externalId || !title) return null;

  return {
    id: `${SLUG}:${externalId}`,
    externalId,
    provider: SLUG,
    providerLabel: LABEL,
    title,
    description: toText(offer.description),
    category: toText(offer.categories) ?? toText(offer.category),
    reward: toNumber(offer.payout),
    currency: toNumber(offer.payout) ? "USD" : undefined,
    deadline: toText(offer.expiration),
    imageUrl: toText(offer.previewimage) ?? toText(offer.image),
    actionUrl: toText(offer.offerlink) ?? toText(offer.offer_url),
    countries: toCountries(offer),
    status: "active",
  };
}

export const cpagripProvider: TaskProvider = {
  slug: SLUG,
  label: LABEL,

  isConfigured: () =>
    Boolean(process.env["CPAGRIP_USER_ID"] && process.env["CPAGRIP_PUBKEY"]),

  fetchTasks: async ({ country }) => {
    const userId = process.env["CPAGRIP_USER_ID"];
    const pubKey = process.env["CPAGRIP_PUBKEY"];
    if (!userId || !pubKey) return [];

    const url = new URL("https://www.cpagrip.com/common/offer_feed_json.php");
    url.searchParams.set("user_id", userId);
    url.searchParams.set("pubkey", pubKey);
    if (country) url.searchParams.set("country", country);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`${LABEL} respondeu com estado ${response.status}`);
      }
      const payload: unknown = await response.json();
      const offers: CpaGripOffer[] = Array.isArray(payload)
        ? (payload as CpaGripOffer[])
        : Array.isArray((payload as { offers?: CpaGripOffer[] })?.offers)
          ? (payload as { offers: CpaGripOffer[] }).offers
          : [];

      return offers.map(normalize).filter((t): t is UnifiedTask => t !== null);
    } finally {
      clearTimeout(timeout);
    }
  },
};
