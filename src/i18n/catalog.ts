import { DEFAULT_LOCALE, type LocaleCode } from "./config";
import type { MessageNamespace } from "./types";

/**
 * Every file in ./messages is picked up automatically — adding a screen's
 * namespace never requires touching this file.
 */
const modules = import.meta.glob<{ default: MessageNamespace }>("./messages/*.ts", {
  eager: true,
});

const catalog: MessageNamespace = {};
for (const mod of Object.values(modules)) {
  Object.assign(catalog, mod.default);
}

export function translate(locale: LocaleCode, key: string, vars?: Record<string, string | number>) {
  const entry = catalog[key];
  let text = entry?.[locale] ?? entry?.[DEFAULT_LOCALE] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function hasMessage(key: string) {
  return key in catalog;
}
