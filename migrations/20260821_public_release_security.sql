-- Apply this migration to an existing Section 8 Scanner Supabase project.
-- If an installation has legacy seller contacts, assign each contact to its
-- real owner before running this migration. Never guess ownership for PII.

ALTER TABLE public.seller_contacts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_seller_user ON public.seller_contacts(user_id);

DROP POLICY IF EXISTS seller_contacts_select ON public.seller_contacts;
DROP POLICY IF EXISTS seller_contacts_all ON public.seller_contacts;
CREATE POLICY seller_contacts_all ON public.seller_contacts FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.seller_contacts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seller_contacts TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.seller_contacts WHERE user_id IS NULL) THEN
    ALTER TABLE public.seller_contacts ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, updated_at) ON TABLE public.profiles TO authenticated;

ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.reset_daily_scans() SET search_path = '';
REVOKE ALL ON FUNCTION public.reset_daily_scans() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_scans() TO service_role;
