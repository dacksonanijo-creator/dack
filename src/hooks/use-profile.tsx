import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  created_at: string | null;
}

/** Nome de apresentação real da conta autenticada (nunca dados fictícios). */
export function displayNameOf(profile: Profile | null, fallbackEmail?: string | null) {
  const name = profile?.full_name?.trim();
  if (name) return name;
  const email = (profile?.email ?? fallbackEmail ?? "").trim();
  if (email) return email.split("@")[0];
  return "";
}

export function firstNameOf(profile: Profile | null, fallbackEmail?: string | null) {
  const full = displayNameOf(profile, fallbackEmail);
  return full.split(" ").filter(Boolean)[0] ?? "";
}

export function initialsOf(profile: Profile | null, fallbackEmail?: string | null) {
  const full = displayNameOf(profile, fallbackEmail);
  const parts = full.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, country, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
    } else {
      // Perfil ainda não existe: cria a partir dos dados reais da conta.
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const fullName =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        null;
      const { data: created } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: fullName, email: user.email ?? null })
        .select("id, full_name, email, phone, country, created_at")
        .maybeSingle();
      setProfile(
        (created as Profile) ?? {
          id: user.id,
          full_name: fullName,
          email: user.email ?? null,
          phone: null,
          country: null,
          created_at: user.created_at ?? null,
        },
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, "full_name" | "phone" | "country">>) => {
      if (!user) return { error: new Error("Sessão inválida") };
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select("id, full_name, email, phone, country, created_at")
        .maybeSingle();
      if (!error && data) setProfile(data as Profile);
      return { error };
    },
    [user],
  );

  return {
    profile,
    loading: loading || authLoading,
    email: profile?.email ?? user?.email ?? null,
    displayName: displayNameOf(profile, user?.email),
    firstName: firstNameOf(profile, user?.email),
    initials: initialsOf(profile, user?.email),
    reload: load,
    updateProfile,
  };
}
