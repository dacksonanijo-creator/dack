CREATE TABLE IF NOT EXISTS public.platform_branding (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  logo_light_url text,
  logo_dark_url text,
  show_wordmark boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_branding TO anon;
GRANT SELECT, INSERT, UPDATE ON public.platform_branding TO authenticated;
GRANT ALL ON public.platform_branding TO service_role;

ALTER TABLE public.platform_branding ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) IN ('dackson144@gmail.com','dacksonanijo@gmail.com')
$$;

CREATE POLICY "Branding is public" ON public.platform_branding FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert branding" ON public.platform_branding FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update branding" ON public.platform_branding FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

INSERT INTO public.platform_branding (id) VALUES (true) ON CONFLICT (id) DO NOTHING;