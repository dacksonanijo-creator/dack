UPDATE public.profiles p SET account_type = 'client'
FROM auth.users u
WHERE u.id = p.id AND u.raw_user_meta_data->>'account_type' = 'client' AND p.account_type <> 'client';

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'company'::public.app_role FROM auth.users u
WHERE u.raw_user_meta_data->>'account_type' = 'client'
ON CONFLICT (user_id, role) DO NOTHING;