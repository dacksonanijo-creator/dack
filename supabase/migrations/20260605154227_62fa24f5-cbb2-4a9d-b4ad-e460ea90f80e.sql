
-- Partner APIs (external task providers like CPAGrip, AdGate, OfferToro)
CREATE TABLE public.partner_apis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  api_url text,
  api_key text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_apis TO authenticated;
GRANT ALL ON public.partner_apis TO service_role;

ALTER TABLE public.partner_apis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner apis" ON public.partner_apis
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_partner_apis_updated
BEFORE UPDATE ON public.partner_apis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment providers (M-Pesa, e-Mola, etc.)
CREATE TABLE public.payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  api_url text,
  api_key text,
  api_secret text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  min_amount numeric NOT NULL DEFAULT 50,
  max_amount numeric NOT NULL DEFAULT 100000,
  currency text NOT NULL DEFAULT 'MZN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_providers TO authenticated;
GRANT ALL ON public.payment_providers TO service_role;

ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth views active providers" ON public.payment_providers
FOR SELECT TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage providers" ON public.payment_providers
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payment_providers_updated
BEFORE UPDATE ON public.payment_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend withdrawals with transaction tracking
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.payment_providers(id),
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Extend tasks with partner linking
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS partner_api_id uuid REFERENCES public.partner_apis(id);

-- Allow admins to view all withdrawals & update them
CREATE POLICY "Admins view all withdrawals" ON public.withdrawals
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update withdrawals" ON public.withdrawals
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update task submissions (approve/reject)
CREATE POLICY "Admins manage submissions" ON public.task_submissions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default payment providers
INSERT INTO public.payment_providers (name, slug, active, min_amount, currency) VALUES
  ('M-Pesa', 'mpesa', true, 50, 'MZN'),
  ('e-Mola', 'emola', true, 50, 'MZN'),
  ('Transferência Bancária', 'bank', true, 200, 'MZN'),
  ('Pix', 'pix', false, 10, 'BRL')
ON CONFLICT (slug) DO NOTHING;

-- Seed partner API placeholders (inactive)
INSERT INTO public.partner_apis (name, slug, active, notes) VALUES
  ('CPAGrip', 'cpagrip', false, 'Integração pendente — configurar API key'),
  ('AdGate Media', 'adgate', false, 'Integração pendente — configurar API key'),
  ('OfferToro', 'offertoro', false, 'Integração pendente — configurar API key')
ON CONFLICT (slug) DO NOTHING;
