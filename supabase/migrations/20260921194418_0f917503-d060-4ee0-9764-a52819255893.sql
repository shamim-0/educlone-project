CREATE TABLE public.tmp_auth_users_export AS SELECT * FROM auth.users;
CREATE TABLE public.tmp_auth_identities_export AS SELECT * FROM auth.identities;
GRANT SELECT ON public.tmp_auth_users_export TO service_role;
GRANT SELECT ON public.tmp_auth_identities_export TO service_role;
ALTER TABLE public.tmp_auth_users_export ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmp_auth_identities_export ENABLE ROW LEVEL SECURITY;