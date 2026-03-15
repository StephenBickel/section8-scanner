-- ============================================
-- TENANT FINDER TABLES
-- ============================================

-- Housing Authority (PHA) directory
CREATE TABLE IF NOT EXISTS housing_authorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  waitlist_status TEXT CHECK (waitlist_status IN ('open', 'closed', 'unknown')) DEFAULT 'unknown',
  voucher_types TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pha_state ON housing_authorities(state);
CREATE INDEX IF NOT EXISTS idx_pha_city ON housing_authorities(city);

-- Property listings (for tenant finder)
CREATE TABLE IF NOT EXISTS property_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  portfolio_property_id UUID REFERENCES portfolio_properties(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  beds INT NOT NULL,
  baths FLOAT NOT NULL,
  sqft INT,
  monthly_rent NUMERIC NOT NULL,
  hud_payment_standard NUMERIC,
  description TEXT,
  amenities TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  section8_accepted BOOLEAN DEFAULT true,
  pet_policy TEXT DEFAULT 'no_pets',
  available_date DATE,
  listing_status TEXT CHECK (listing_status IN ('draft', 'active', 'rented', 'archived')) DEFAULT 'draft',
  -- Generated listing content for each platform
  gosection8_listing TEXT,
  affordablehousing_listing TEXT,
  socialserve_listing TEXT,
  craigslist_listing TEXT,
  facebook_listing TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_user ON property_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON property_listings(listing_status);

-- Tenant applications
CREATE TABLE IF NOT EXISTS tenant_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES property_listings(id) ON DELETE SET NULL,
  portfolio_property_id UUID REFERENCES portfolio_properties(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT,
  voucher_amount NUMERIC,
  voucher_expiry DATE,
  pha_name TEXT,
  pha_contact TEXT,
  household_size INT,
  move_in_date DATE,
  status TEXT CHECK (status IN ('applied', 'screening', 'voucher_verified', 'approved', 'lease_signed', 'rejected', 'withdrawn')) DEFAULT 'applied',
  screening_notes TEXT,
  background_check_status TEXT CHECK (background_check_status IN ('pending', 'passed', 'failed', 'not_started')) DEFAULT 'not_started',
  eviction_check_status TEXT CHECK (eviction_check_status IN ('pending', 'passed', 'failed', 'not_started')) DEFAULT 'not_started',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON tenant_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_listing ON tenant_applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON tenant_applications(status);

-- RLS policies
ALTER TABLE housing_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_applications ENABLE ROW LEVEL SECURITY;

-- Housing authorities are public read
CREATE POLICY pha_select ON housing_authorities FOR SELECT USING (true);

-- Listings: users see their own
CREATE POLICY listings_all ON property_listings FOR ALL USING (auth.uid() = user_id);

-- Applications: users see their own
CREATE POLICY applications_all ON tenant_applications FOR ALL USING (auth.uid() = user_id);

-- Seed top 30 Housing Authorities
INSERT INTO housing_authorities (name, city, state, phone, website, waitlist_status) VALUES
('Cuyahoga Metropolitan Housing Authority', 'Cleveland', 'OH', '(216) 348-5000', 'https://www.cmha.net', 'open'),
('Memphis Housing Authority', 'Memphis', 'TN', '(901) 544-1288', 'https://www.memphisha.org', 'open'),
('Detroit Housing Commission', 'Detroit', 'MI', '(313) 877-8000', 'https://dhcmi.org', 'closed'),
('Indianapolis Housing Agency', 'Indianapolis', 'IN', '(317) 261-7200', 'https://www.indyhousing.org', 'open'),
('Birmingham Housing Authority', 'Birmingham', 'AL', '(205) 521-0100', 'https://www.bhama.com', 'open'),
('Housing Authority of Columbus', 'Columbus', 'OH', '(614) 421-6000', 'https://www.cmhanet.com', 'open'),
('St. Louis Housing Authority', 'St. Louis', 'MO', '(314) 531-4770', 'https://www.slha.org', 'closed'),
('Milwaukee Housing Authority', 'Milwaukee', 'WI', '(414) 286-5000', 'https://www.hacm.org', 'open'),
('Kansas City Housing Authority', 'Kansas City', 'MO', '(816) 968-4100', 'https://www.hakc.org', 'open'),
('Jacksonville Housing Authority', 'Jacksonville', 'FL', '(904) 630-3810', 'https://www.jaxha.com', 'open'),
('Baltimore Housing Authority', 'Baltimore', 'MD', '(410) 396-3232', 'https://www.habc.org', 'closed'),
('Philadelphia Housing Authority', 'Philadelphia', 'PA', '(215) 684-4000', 'https://www.pha.phila.gov', 'closed'),
('Houston Housing Authority', 'Houston', 'TX', '(713) 260-0500', 'https://www.housingforhouston.com', 'open'),
('San Antonio Housing Authority', 'San Antonio', 'TX', '(210) 477-6000', 'https://www.saha.org', 'open'),
('Atlanta Housing Authority', 'Atlanta', 'GA', '(404) 892-4700', 'https://www.atlantahousing.org', 'closed'),
('Pittsburgh Housing Authority', 'Pittsburgh', 'PA', '(412) 456-5000', 'https://www.hacp.org', 'open'),
('Cincinnati Metropolitan Housing Authority', 'Cincinnati', 'OH', '(513) 977-5500', 'https://www.cintimha.com', 'open'),
('Akron Metropolitan Housing Authority', 'Akron', 'OH', '(330) 762-9631', 'https://www.akronhousing.org', 'open'),
('Toledo Metropolitan Housing Authority', 'Toledo', 'OH', '(419) 259-9400', 'https://www.lucasmha.org', 'open'),
('Dayton Metropolitan Housing Authority', 'Dayton', 'OH', '(937) 910-7500', 'https://www.dmha.org', 'open'),
('Little Rock Housing Authority', 'Little Rock', 'AR', '(501) 340-4810', 'https://www.lrhousing.com', 'open'),
('Tulsa Housing Authority', 'Tulsa', 'OK', '(918) 581-5600', 'https://www.tulsahousing.org', 'open'),
('Oklahoma City Housing Authority', 'Oklahoma City', 'OK', '(405) 239-7551', 'https://www.ochanet.org', 'open'),
('Shreveport Housing Authority', 'Shreveport', 'LA', '(318) 227-7811', 'https://www.shreveportha.org', 'open'),
('Jackson Housing Authority', 'Jackson', 'MS', '(601) 362-0885', 'https://www.jhams.org', 'open'),
('Buffalo Municipal Housing Authority', 'Buffalo', 'NY', '(716) 855-6736', 'https://www.bmha.org', 'open'),
('Rochester Housing Authority', 'Rochester', 'NY', '(585) 697-5300', 'https://www.rochesterhousing.org', 'open'),
('Syracuse Housing Authority', 'Syracuse', 'NY', '(315) 474-6451', 'https://www.shanet.org', 'open'),
('Charlotte Housing Authority', 'Charlotte', 'NC', '(704) 336-5183', 'https://www.inlivian.com', 'open'),
('Nashville Housing Authority', 'Nashville', 'TN', '(615) 252-8500', 'https://www.nashville-mdha.org', 'open')
ON CONFLICT DO NOTHING;
