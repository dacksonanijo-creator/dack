import { DEFAULT_LOCALE, LOCALES, type LocaleCode } from "./config";
import type { Messages } from "./types";

/**
 * Every locale owns an independent folder of translation files:
 *   src/i18n/locales/<locale>/<namespace>.ts
 *
 * Adding a language = create the folder + files and register the code in
 * ./config.ts. Adding a screen = drop a namespace file in each locale folder.
 */
const modules = import.meta.glob<{ default: Messages }>("./locales/*/*.ts", {
  eager: true,
});

const catalogs = Object.fromEntries(LOCALES.map((l) => [l.code, {} as Messages])) as Record<
  LocaleCode,
  Messages
>;

for (const [path, mod] of Object.entries(modules)) {
  const code = path.split("/")[2] as LocaleCode;
  if (!catalogs[code]) continue;
  Object.assign(catalogs[code], mod.default);
}

export function translate(locale: LocaleCode, key: string, vars?: Record<string, string | number>) {
  let text = catalogs[locale]?.[key] ?? catalogs[DEFAULT_LOCALE]?.[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function hasMessage(key: string, locale: LocaleCode = DEFAULT_LOCALE) {
  return key in (catalogs[locale] ?? {});
}
