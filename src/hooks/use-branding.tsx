import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brandLogo } from "@/lib/brand";

export interface Branding {
  logoLight: string | null;
  logoDark: string | null;
  showWordmark: boolean;
}

const fallback: Branding = {
  logoLight: brandLogo.light,
  logoDark: brandLogo.dark,
  showWordmark: brandLogo.showWordmark,
};

interface BrandingContextValue extends Branding {
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  ...fallback,
  loading: false,
  refresh: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(fallback);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("platform_branding")
      .select("logo_light_url, logo_dark_url, show_wordmark")
      .maybeSingle();
    if (data) {
      setBranding({
        logoLight: data.logo_light_url ?? null,
        logoDark: data.logo_dark_url ?? null,
        showWordmark: data.show_wordmark ?? true,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Aplica o logótipo publicado como ícone da aplicação (favicon).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const icon = branding.logoLight ?? branding.logoDark;
    if (!icon) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = icon;
  }, [branding.logoLight, branding.logoDark]);

  return (
    <BrandingContext.Provider value={{ ...branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
