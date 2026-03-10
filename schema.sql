-- Section 8 Scanner — Full Database Schema
-- Supabase project: heocvgxhgmludycstedj

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'investor')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  daily_scans_used INT NOT NULL DEFAULT 0,
  daily_scans_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SAVED SEARCHES
-- ============================================
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  max_price INT NOT NULL DEFAULT 100000,
  min_score FLOAT NOT NULL DEFAULT 40,
  max_pages INT NOT NULL DEFAULT 3,
  alert_enabled BOOLEAN NOT NULL DEFAULT false,
  alert_frequency TEXT DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
  alert_email BOOLEAN NOT NULL DEFAULT true,
  alert_sms BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DEALS (scanned properties, deduped by address)
-- ============================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  zip_code TEXT,
  price INT NOT NULL,
  beds INT NOT NULL DEFAULT 0,
  baths FLOAT NOT NULL DEFAULT 0,
  sqft INT NOT NULL DEFAULT 0,
  hud_rent FLOAT,
  rent_zestimate FLOAT,
  monthly_rent FLOAT NOT NULL,
  dscr FLOAT NOT NULL,
  monthly_cash_flow FLOAT NOT NULL,
  annual_cash_flow FLOAT NOT NULL,
  cash_on_cash FLOAT NOT NULL,
  rent_to_price FLOAT NOT NULL,
  down_payment FLOAT NOT NULL,
  mortgage FLOAT NOT NULL,
  expenses_total FLOAT NOT NULL,
  deal_score FLOAT NOT NULL,
  zillow_url TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price_history JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(address, city)
);

CREATE INDEX idx_deals_city ON deals(city);
CREATE INDEX idx_deals_score ON deals(deal_score DESC);
CREATE INDEX idx_deals_active ON deals(is_active) WHERE is_active = true;

-- ============================================
-- ALERTS LOG
-- ============================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saved_search_id UUID REFERENCES saved_searches(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('new_deal', 'price_drop', 'score_change')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- PORTFOLIO
-- ============================================
CREATE TABLE portfolio_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  zip_code TEXT,
  purchase_price INT NOT NULL,
  purchase_date DATE,
  beds INT NOT NULL DEFAULT 0,
  baths FLOAT NOT NULL DEFAULT 0,
  sqft INT NOT NULL DEFAULT 0,
  current_rent FLOAT,
  hud_rent FLOAT,
  is_section8 BOOLEAN NOT NULL DEFAULT true,
  tenant_name TEXT,
  lease_start DATE,
  lease_end DATE,
  vacancy_status TEXT DEFAULT 'occupied' CHECK (vacancy_status IN ('occupied', 'vacant', 'turning')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PORTFOLIO TRANSACTIONS
-- ============================================
CREATE TABLE portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES portfolio_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rent', 'mortgage', 'tax', 'insurance', 'maintenance', 'management', 'other_income', 'other_expense')),
  amount FLOAT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_property ON portfolio_transactions(property_id);
CREATE INDEX idx_transactions_date ON portfolio_transactions(date);

-- ============================================
-- FMR HISTORY (HUD rent trends by zip)
-- ============================================
CREATE TABLE fmr_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zip_code TEXT NOT NULL,
  year INT NOT NULL,
  efficiency FLOAT,
  one_bed FLOAT,
  two_bed FLOAT,
  three_bed FLOAT,
  four_bed FLOAT,
  metro_name TEXT,
  UNIQUE(zip_code, year)
);

CREATE INDEX idx_fmr_zip ON fmr_history(zip_code);

-- ============================================
-- SCAN RUNS (audit trail)
-- ============================================
CREATE TABLE scan_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  saved_search_id UUID REFERENCES saved_searches(id) ON DELETE SET NULL,
  city TEXT NOT NULL,
  max_price INT NOT NULL,
  min_score FLOAT NOT NULL,
  properties_found INT NOT NULL DEFAULT 0,
  deals_found INT NOT NULL DEFAULT 0,
  new_deals INT NOT NULL DEFAULT 0,
  duration_ms INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fmr_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY searches_all ON saved_searches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY alerts_select ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY portfolio_all ON portfolio_properties FOR ALL USING (auth.uid() = user_id);
CREATE POLICY transactions_all ON portfolio_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY deals_select ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY fmr_select ON fmr_history FOR SELECT USING (true);
CREATE POLICY scans_select ON scan_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY scans_insert ON scan_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION reset_daily_scans()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET daily_scans_used = 0, daily_scans_reset_at = NOW()
  WHERE daily_scans_reset_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
