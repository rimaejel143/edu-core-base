UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'rimaejel93@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM auth.users WHERE email = 'rimaejel93@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles
WHERE role = 'center_admin'::public.app_role
  AND user_id IN (SELECT id FROM auth.users WHERE email = 'rimaejel93@gmail.com');