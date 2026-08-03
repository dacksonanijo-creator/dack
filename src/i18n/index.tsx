import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  type LocaleCode,
} from "./config";
import { translate } from "./catalog";

interface LocaleCtx {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locales: typeof LOCALES;
  ready: boolean;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  // 1) instant restore from device storage
  useEffect(() => {
    const stored = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) setLocaleState(stored);
    setReady(true);
  }, []);

  // 2) account preference wins as soon as a session is known
  useEffect(() => {
    let cancelled = false;

    const syncFromAccount = async (userId: string | undefined) => {
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", userId)
        .maybeSingle();
      const fromAccount = normalizeLocale(data?.preferred_language);
      if (!cancelled && fromAccount) {
        setLocaleState(fromAccount);
        localStorage.setItem(LOCALE_STORAGE_KEY, fromAccount);
      }
    };

    supabase.auth.getSession().then(({ data }) => syncFromAccount(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void syncFromAccount(session?.user.id);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      await supabase.from("profiles").update({ preferred_language: next }).eq("id", userId);
    })();
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      locales: LOCALES,
      ready,
    }),
    [locale, setLocale, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Shorthand: const t = useT(); t("common.save") */
export function useT() {
  return useLocale().t;
}
