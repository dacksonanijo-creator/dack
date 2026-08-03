/**
 * Each locale owns its own translation files under ./locales/<locale>/*.ts.
 * A namespace file is a flat map of message key -> translated string.
 */
export type Messages = Record<string, string>;

export function defineMessages<T extends Messages>(messages: T): T {
  return messages;
}
