
-- Revoke EXECUTE from anon for all SECURITY DEFINER functions (none need anonymous callers)
REVOKE EXECUTE ON FUNCTION public.calculate_dso(uuid, date, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_accounting_basis(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.setup_demo_user_profile(uuid) FROM anon, public;

-- Trigger-only functions: revoke from everyone (only the trigger needs them)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_audit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_self_change() FROM anon, authenticated, public;

-- Ensure authenticated still has EXECUTE on helpers used by RLS / app code
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accounting_basis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_dso(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_demo_user_profile(uuid) TO authenticated;
