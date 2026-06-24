
-- 1) Prevent profile.role self-elevation via trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change a profile role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_self_change ON public.profiles;
CREATE TRIGGER prevent_profile_role_self_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_self_change();

-- 2) Tighten user_roles: only admins may insert/update/delete
DROP POLICY IF EXISTS "User roles manageable by company admins" ON public.user_roles;

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id = public.get_user_company_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) Add UPDATE policy for csv-imports storage bucket
CREATE POLICY "Users can update their own CSV files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'csv-imports'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'csv-imports'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
