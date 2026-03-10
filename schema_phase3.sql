-- Phase 3: Alerts, Reports, FMR History, Expense Modeling

-- ============================================
-- ALERT PREFERENCES (per-user notification settings)
-- ============================================
CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  email_address TEXT,
  digest_frequency TEXT NOT NULL DEFAULT 'instant' CHECK (digest_frequency IN ('instant', 'daily', 'weekly')),
  min_deal_score FLOAT NOT NULL DEFAULT 70,
  price_drop_threshold FLOAT NOT NULL DEFAULT 5.0,
  notify_new_deals BOOLEAN NOT NULL DEFAULT true,
  notify_price_drops BOOLEAN NOT NULL DEFAULT true,
  notify_score_changes BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start INT DEFAULT 22,
  quiet_hours_end INT DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY alert_prefs_all ON alert_preferences FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- DEAL REPORTS (generated PDF reports)
-- ============================================
CREATE TABLE deal_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  saved_search_id UUID REFERENCES saved_searches(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('single_deal', 'market_summary', 'portfolio_summary')),
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE deal_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_all ON deal_reports FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- COUNTY TAX RATES (real property tax data)
-- ============================================
CREATE TABLE county_tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state TEXT NOT NULL,
  county TEXT NOT NULL,
  fips_code TEXT,
  effective_tax_rate FLOAT NOT NULL,
  median_home_value FLOAT,
  median_tax_paid FLOAT,
  year INT NOT NULL DEFAULT 2024,
  source TEXT DEFAULT 'census',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(state, county, year)
);

CREATE INDEX idx_county_tax ON county_tax_rates(state, county);
ALTER TABLE county_tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY county_tax_select ON county_tax_rates FOR SELECT USING (true);

-- ============================================
-- INSURANCE ESTIMATES (by state/county)
-- ============================================
CREATE TABLE insurance_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state TEXT NOT NULL,
  county TEXT,
  avg_annual_premium FLOAT NOT NULL,
  avg_monthly_premium FLOAT NOT NULL,
  coverage_amount FLOAT DEFAULT 200000,
  year INT NOT NULL DEFAULT 2024,
  source TEXT DEFAULT 'naic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(state, county, year)
);

ALTER TABLE insurance_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY insurance_select ON insurance_estimates FOR SELECT USING (true);

-- ============================================
-- Seed some FMR history data for top Section 8 markets
-- ============================================
INSERT INTO fmr_history (zip_code, year, efficiency, one_bed, two_bed, three_bed, four_bed) VALUES
  ('44101', 2024, 658, 735, 880, 1100, 1200),
  ('44101', 2023, 620, 700, 840, 1050, 1140),
  ('44101', 2022, 590, 665, 800, 1000, 1090),
  ('38101', 2024, 700, 780, 940, 1180, 1320),
  ('38101', 2023, 665, 745, 900, 1130, 1260),
  ('38101', 2022, 635, 710, 860, 1080, 1200),
  ('48201', 2024, 820, 920, 1100, 1450, 1620),
  ('48201', 2023, 780, 880, 1050, 1380, 1540),
  ('48201', 2022, 745, 840, 1000, 1320, 1470),
  ('46201', 2024, 620, 695, 830, 1040, 1160),
  ('46201', 2023, 590, 660, 790, 990, 1100),
  ('46201', 2022, 560, 630, 755, 945, 1050),
  ('35201', 2024, 640, 720, 860, 1080, 1200),
  ('35201', 2023, 610, 685, 820, 1030, 1140),
  ('35201', 2022, 580, 650, 780, 980, 1090)
ON CONFLICT DO NOTHING;

-- ============================================
-- Seed county tax rates for top Section 8 markets
-- ============================================
INSERT INTO county_tax_rates (state, county, effective_tax_rate, median_home_value, median_tax_paid, year) VALUES
  ('OH', 'Cuyahoga', 2.44, 107800, 2632, 2024),
  ('OH', 'Franklin', 1.86, 188900, 3514, 2024),
  ('OH', 'Hamilton', 2.10, 168100, 3530, 2024),
  ('TN', 'Shelby', 1.56, 125600, 1959, 2024),
  ('TX', 'Harris', 2.03, 189400, 3845, 2024),
  ('TX', 'Dallas', 1.93, 225100, 4344, 2024),
  ('TX', 'Bexar', 1.94, 172900, 3354, 2024),
  ('IN', 'Marion', 1.15, 135300, 1556, 2024),
  ('AL', 'Jefferson', 0.70, 135200, 946, 2024),
  ('GA', 'Fulton', 1.16, 286900, 3328, 2024),
  ('GA', 'DeKalb', 1.30, 236400, 3073, 2024),
  ('MO', 'Jackson', 1.43, 140600, 2011, 2024),
  ('MO', 'St. Louis', 1.38, 157800, 2178, 2024),
  ('PA', 'Philadelphia', 1.36, 174500, 2373, 2024),
  ('MI', 'Wayne', 2.65, 62700, 1661, 2024),
  ('WI', 'Milwaukee', 2.53, 130700, 3307, 2024),
  ('FL', 'Duval', 0.97, 210500, 2042, 2024),
  ('NC', 'Mecklenburg', 1.05, 274100, 2878, 2024),
  ('SC', 'Richland', 0.81, 155200, 1257, 2024),
  ('MS', 'Hinds', 1.26, 89800, 1131, 2024)
ON CONFLICT DO NOTHING;

-- ============================================
-- Seed insurance estimates by state
-- ============================================
INSERT INTO insurance_estimates (state, avg_annual_premium, avg_monthly_premium, year) VALUES
  ('OH', 1100, 91.67, 2024),
  ('TN', 1620, 135.00, 2024),
  ('TX', 2340, 195.00, 2024),
  ('IN', 1180, 98.33, 2024),
  ('AL', 1560, 130.00, 2024),
  ('GA', 1520, 126.67, 2024),
  ('MO', 1560, 130.00, 2024),
  ('PA', 1080, 90.00, 2024),
  ('MI', 1340, 111.67, 2024),
  ('WI', 980, 81.67, 2024),
  ('FL', 2780, 231.67, 2024),
  ('NC', 1260, 105.00, 2024),
  ('SC', 1480, 123.33, 2024),
  ('MS', 1660, 138.33, 2024)
ON CONFLICT DO NOTHING;
