
CREATE POLICY "Users self-claim company role" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'company');
