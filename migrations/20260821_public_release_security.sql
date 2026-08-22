-- Apply this migration to an existing Section 8 Scanner Supabase project.
-- Existing seller contacts remain inaccessible until an administrator assigns
-- user_id values; this avoids guessing ownership for personal information.

ALTER TABLE public.seller_contacts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_seller_user ON public.seller_contacts(user_id);

DROP POLICY IF EXISTS seller_contacts_select ON public.seller_contacts;
DROP POLICY IF EXISTS seller_contacts_all ON public.seller_contacts;
CREATE POLICY seller_contacts_all ON public.seller_contacts FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (full_name, updated_at) ON TABLE public.profiles TO authenticated;

-- After assigning every legacy contact to its real owner, enforce the fresh
-- install invariant with:
-- ALTER TABLE public.seller_contacts ALTER COLUMN user_id SET NOT NULL;
