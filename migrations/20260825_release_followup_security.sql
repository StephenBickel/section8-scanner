-- Follow-up public-release controls for existing installations.

ALTER TABLE public.saved_searches
  ADD CONSTRAINT saved_search_name_bounds CHECK (char_length(btrim(name)) BETWEEN 1 AND 100) NOT VALID,
  ADD CONSTRAINT saved_search_city_format CHECK (char_length(city) <= 80 AND city ~ '^[a-z0-9]+(-[a-z0-9]+)*$') NOT VALID,
  ADD CONSTRAINT saved_search_price_bounds CHECK (max_price BETWEEN 1 AND 5000000) NOT VALID,
  ADD CONSTRAINT saved_search_score_bounds CHECK (min_score BETWEEN 0 AND 100) NOT VALID,
  ADD CONSTRAINT saved_search_page_bounds CHECK (max_pages BETWEEN 1 AND 10) NOT VALID;

ALTER TABLE public.alerts ALTER COLUMN sent_at DROP DEFAULT;
ALTER TABLE public.alerts ALTER COLUMN sent_at DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.consume_scan_allowance()
RETURNS boolean AS $$
DECLARE
  current_profile public.profiles%ROWTYPE;
  daily_limit integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT * INTO current_profile FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  daily_limit := CASE current_profile.plan WHEN 'investor' THEN 200 WHEN 'pro' THEN 50 ELSE 3 END;
  IF current_profile.daily_scans_reset_at < NOW() - INTERVAL '24 hours' THEN
    UPDATE public.profiles SET daily_scans_used = 1, daily_scans_reset_at = NOW() WHERE id = auth.uid();
    RETURN true;
  END IF;
  IF current_profile.daily_scans_used >= daily_limit THEN RETURN false; END IF;
  UPDATE public.profiles SET daily_scans_used = daily_scans_used + 1 WHERE id = auth.uid();
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.consume_scan_allowance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_scan_allowance() TO authenticated;
