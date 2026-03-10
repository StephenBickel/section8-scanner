# Phase 2 Build Spec — Intelligence + Outreach + Management Tools

## Context
Phase 1 is complete (auth, dashboard, portfolio, pricing, Stripe). Build compiles clean.
Phase 2 database tables already deployed to Supabase (see schema_phase2.sql).

## Supabase Details (same project)
- **Ref:** `heocvgxhgmludycstedj`
- **URL:** `https://heocvgxhgmludycstedj.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlb2N2Z3hoZ21sdWR5Y3N0ZWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMTg5NjUsImV4cCI6MjA4ODY5NDk2NX0.U33nbsyLudPHme0X5ZWeVoxu1UkgsJfpjUZmrOqKe2Q`

## Design System (MUST MATCH — same as Phase 1)
- Background: `#0a0a0a` / Surface: `#111` / Surface2: `#1a1a1a` / Border: `#222`
- Accent: `#00ff88` (neon green)
- Text: `#e0e0e0` / Muted: `#777` / Dim: `#555`
- Red: `#ff4444` / Yellow: `#ffcc00`
- Fonts: Space Grotesk (body), JetBrains Mono (data/numbers)
- Dark fintech aesthetic. Sharp, data-dense.

## New Database Tables (Already Deployed)
- `seller_contacts` — skip-traced owner info (name, email, phone)
- `outreach_campaigns` — email campaign templates
- `outreach_emails` — individual sent/scheduled emails with status tracking
- `neighborhood_scores` — crime, school, walkability scores per zip
- `management_expenses` — PM vs self-management cost tracking per property

## What to Build

### 1. Update Types (`src/lib/types.ts`)
Add TypeScript interfaces for all new tables:
- SellerContact
- OutreachCampaign
- OutreachEmail
- NeighborhoodScore
- ManagementExpense

### 2. Crime/Neighborhood Data Integration

**SpotCrime API alternative:** Since SpotCrime doesn't have a free API, use CrimeGrade.org which provides letter grades (A-F) per zip code via web scraping, OR use the AreaVibes API for livability scores.

Create `src/lib/neighborhood.ts`:
- Function to fetch neighborhood data by zip code
- Cache results in `neighborhood_scores` table (Supabase)
- Return crime grade (A-F), crime score (0-100), and any available school/walkability data
- For the MVP: scrape CrimeGrade.org letter grades per zip, OR use static data from the FBI UCR dataset

Create API route `/api/neighborhood/[zipCode]/route.ts`:
- GET: Return cached neighborhood score, or fetch + cache if missing
- Response: `{ crime_score, crime_grade, school_score, walkability_score }`

**Integrate into deal cards:** Update the scanner page (`page.tsx`) deal expanded row to show:
- Crime grade badge (A = green, B = yellow-green, C = yellow, D = orange, F = red)
- "Avg Section 8 tenant stay: 7 years" stat
- "Payment Standard" label instead of just "HUD FMR"
- Neighborhood score summary

**Update the Python scorer** (`~/Projects/section8-finder/scorer.py`):
- Replace the `crime_score = 100` placeholder with actual crime data
- Crime grade A = 100 points, B = 80, C = 60, D = 40, F = 20
- This changes the deal_score calculation to factor in real crime data

### 3. Seller Outreach System (Investor Tier Only)

**New page: `/outreach/page.tsx`**
A full outreach dashboard with:
- Campaign list (create, edit, pause, resume campaigns)
- Email templates with merge fields: `{owner_name}`, `{address}`, `{price}`, `{monthly_rent}`, `{cash_flow}`, `{score}`
- Contact list showing skip-traced sellers
- Email log (sent, opened, replied, bounced)
- Stats: total sent, open rate, reply rate

**Outreach flow:**
1. User clicks "Contact Seller" on a deal card → opens outreach modal
2. System looks up seller contact (or shows "Skip trace needed" placeholder)
3. User picks campaign template → previews personalized email
4. Sends via API route

**Default email templates (pre-built):**
```
Template 1: "Initial Outreach"
Subject: Interested in your property at {address}
Body: Hi {owner_name},

I came across your property at {address} and I'm interested in purchasing it. 
Based on my analysis, this property could generate ${monthly_rent}/month in 
Section 8 rental income with a DSCR of {dscr}.

Would you be open to discussing a potential sale? I can close quickly and 
handle all the paperwork.

Best regards,
{user_name}

Template 2: "Follow-up (Day 3)"
Subject: Following up — {address}
Body: Hi {owner_name},

I wanted to follow up on my previous email about your property at {address}. 
I'm a serious buyer and can move quickly if you're interested in selling.

Happy to jump on a quick call to discuss.

Best,
{user_name}

Template 3: "Final Follow-up (Day 7)"  
Subject: Last check-in — {address}
Body: Hi {owner_name},

Just a final check-in regarding {address}. If now isn't the right time, 
no worries at all. I'll keep an eye on the market.

If anything changes, feel free to reach out anytime.

Best,
{user_name}
```

**API routes:**
- `/api/outreach/campaigns/route.ts` — CRUD campaigns
- `/api/outreach/send/route.ts` — Send an email (uses Resend placeholder for now)
- `/api/outreach/contacts/route.ts` — List/search seller contacts

**For now:** Skip tracing is manual (user enters owner name/email from county records). Later we'll integrate BatchSkipTracing API. The UI should have a "Manual Entry" form AND a placeholder "Auto Skip Trace" button that says "Coming Soon — requires API key".

### 4. Self-Management Tools Section

**Update `/portfolio/page.tsx`** to add a "Management" tab/section per property:
- Toggle: "Self-Managed" vs "Property Manager" vs "Hybrid"
- If PM: enter fee % → calculates monthly/annual cost
- If Self-Managed: checklist of recommended tools:
  - TenantCloud ($15/mo) — rent collection + maintenance
  - RentSpree ($50 one-time) — tenant screening  
  - Link to find local realtor for showings (~$50-100/showing)
- "Annual Savings" calculator: PM cost vs self-manage cost
- Display: "You save $X/year by self-managing with these tools"

### 5. Savings Calculator Component

Create `src/components/SavingsCalculator.tsx`:
- Input: number of properties, average rent, PM fee %
- Output: Annual PM cost, Annual self-manage cost, Annual savings
- Visual bar chart comparing the two
- This should be prominent on the pricing page too (as a selling point)

### 6. Enhanced Deal Cards (Update Scanner Page)

Update the expanded deal row in `page.tsx` to show:
- **Crime grade badge** (color-coded A-F) — fetched from neighborhood API
- **"HUD Payment Standard"** label (rename from "HUD FMR")  
- **"Avg tenant stay: 7 years"** stat
- **"Contact Seller" button** (Investor tier only, others see upgrade prompt)
- **"Self-manage savings"** line: "Save ~${pm_savings}/yr vs property manager"
- Keep existing buttons: "Add to Portfolio", "View on Zillow"

### 7. Add Outreach to Navbar

Update `src/components/Navbar.tsx`:
- Add "Outreach" nav link (between Portfolio and Pricing)
- Show lock icon if user is not on Investor plan
- Click shows upgrade modal if not Investor

### 8. Resource Links

Create `src/lib/resources.ts`:
- Curated list of Section 8 investor resources per category:
  - Tenant finding: affordablehousing.com, gosection8.com
  - Property management: tenantcloud.com, rentspree.com
  - Loan providers: biggerpockets.com DSCR lender directory
  - Crime data: spotcrime.com, crimegrade.org
  - HUD data: huduser.gov
- Display these in a "Resources" section on the dashboard

## File Organization (New Files)
```
src/
├── app/
│   ├── outreach/page.tsx                 # Outreach dashboard (NEW)
│   └── api/
│       ├── neighborhood/[zipCode]/route.ts  # Crime/neighborhood data (NEW)
│       └── outreach/
│           ├── campaigns/route.ts         # Campaign CRUD (NEW)
│           ├── send/route.ts              # Send email (NEW)
│           └── contacts/route.ts          # Seller contacts (NEW)
├── components/
│   ├── CrimeGradeBadge.tsx               # Color-coded crime badge (NEW)
│   ├── SavingsCalculator.tsx             # PM vs self-manage calc (NEW)
│   ├── OutreachModal.tsx                 # Contact seller modal (NEW)
│   └── ResourceLinks.tsx                 # Curated resource links (NEW)
└── lib/
    ├── neighborhood.ts                    # Crime data fetching (NEW)
    ├── resources.ts                       # Curated resource links (NEW)
    └── email-templates.ts                 # Default outreach templates (NEW)
```

## Constraints
- MUST keep Phase 1 working perfectly (scanner, auth, dashboard, portfolio, pricing)
- Same dark design system
- Mobile responsive
- TypeScript strict — no `any`
- Outreach features gated to Investor plan
- Crime data: use static/mock data for now if APIs are unavailable, but build the architecture to swap in real data
- Email sending: build the UI and API structure using a placeholder/mock send function. Document that Resend API key is needed for real sending.
