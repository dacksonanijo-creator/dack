export const LOCALES = [
  { code: "pt-PT", label: "Português (Portugal)", short: "PT", flag: "🇵🇹" },
  { code: "pt-BR", label: "Português (Brasil)", short: "BR", flag: "🇧🇷" },
  { code: "en", label: "English", short: "EN", flag: "🇬🇧" },
  { code: "fr", label: "Français", short: "FR", flag: "🇫🇷" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "pt-PT";

export const LOCALE_STORAGE_KEY = "taskora-locale";

/** Normalises any stored/legacy value (e.g. "pt", "en-US") into a supported locale. */
export function normalizeLocale(value: string | null | undefined): LocaleCode | null {
  if (!value) return null;
  const v = value.trim();
  const exact = LOCALES.find((l) => l.code.toLowerCase() === v.toLowerCase());
  if (exact) return exact.code;
  const base = v.split("-")[0]?.toLowerCase();
  if (base === "pt") return v.toLowerCase().includes("br") ? "pt-BR" : "pt-PT";
  if (base === "en") return "en";
  if (base === "fr") return "fr";
  return null;
}
