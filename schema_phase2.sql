-- Phase 2: Seller Outreach + Crime Data + Management Tools

-- ============================================
-- SELLER CONTACTS (skip-traced property owners)
-- ============================================
CREATE TABLE seller_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  zip_code TEXT,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  skip_trace_source TEXT,
  skip_traced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seller_address ON seller_contacts(address);
CREATE INDEX idx_seller_city ON seller_contacts(city);

-- ============================================
-- OUTREACH CAMPAIGNS
-- ============================================
CREATE TABLE outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_subject TEXT NOT NULL,
  template_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  auto_send BOOLEAN NOT NULL DEFAULT false,
  min_deal_score FLOAT NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- OUTREACH EMAILS (sent/scheduled)
-- ============================================
CREATE TABLE outreach_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_contact_id UUID NOT NULL REFERENCES seller_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'replied', 'bounced', 'failed')),
  sequence_step INT NOT NULL DEFAULT 1,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outreach_campaign ON outreach_emails(campaign_id);
CREATE INDEX idx_outreach_status ON outreach_emails(status);
CREATE INDEX idx_outreach_scheduled ON outreach_emails(scheduled_at) WHERE status = 'pending';

-- ============================================
-- NEIGHBORHOOD DATA (crime, schools, walkability)
-- ============================================
CREATE TABLE neighborhood_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zip_code TEXT NOT NULL,
  city TEXT,
  crime_score FLOAT,
  crime_grade TEXT,
  school_score FLOAT,
  walkability_score FLOAT,
  data_source TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(zip_code)
);

CREATE INDEX idx_neighborhood_zip ON neighborhood_scores(zip_code);

-- ============================================
-- MANAGEMENT TOOLS TRACKER
-- ============================================
CREATE TABLE management_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES portfolio_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  management_type TEXT NOT NULL DEFAULT 'self' CHECK (management_type IN ('self', 'property_manager', 'hybrid')),
  pm_fee_pct FLOAT DEFAULT 0.10,
  pm_monthly_cost FLOAT DEFAULT 0,
  self_manage_tools JSONB DEFAULT '[]'::jsonb,
  self_manage_monthly_cost FLOAT DEFAULT 0,
  monthly_savings FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE seller_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_expenses ENABLE ROW LEVEL SECURITY;

-- Seller contacts: authenticated read (they come from deals which are public)
CREATE POLICY seller_contacts_select ON seller_contacts FOR SELECT TO authenticated USING (true);

-- Outreach: users own their campaigns and emails
CREATE POLICY campaigns_all ON outreach_campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY outreach_emails_all ON outreach_emails FOR ALL USING (auth.uid() = user_id);

-- Neighborhood: public read
CREATE POLICY neighborhood_select ON neighborhood_scores FOR SELECT USING (true);

-- Management: users own their records
CREATE POLICY management_all ON management_expenses FOR ALL USING (auth.uid() = user_id);
