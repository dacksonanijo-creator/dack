import type { LocaleCode } from "./config";

/**
 * A message namespace: one entry per key, holding every locale side by side.
 * Adding a new language = add its code to LOCALES and one string per entry.
 */
export type MessageNamespace = Record<string, Record<LocaleCode, string>>;

export function defineMessages<T extends MessageNamespace>(messages: T): T {
  return messages;
}
