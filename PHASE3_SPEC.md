# Phase 3 Build Spec — Alerts, Reports, FMR Trends, Real Expense Modeling

## Context
Phase 1 (auth, dashboard, portfolio, pricing) and Phase 2 (crime data, outreach, management tools) complete.
Phase 3 tables already deployed to Supabase (see schema_phase3.sql).
Build compiles clean with 35 files, 18 routes.

## Supabase Details (same project)
- **Ref:** `heocvgxhgmludycstedj`
- **URL:** `https://heocvgxhgmludycstedj.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlb2N2Z3hoZ21sdWR5Y3N0ZWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMTg5NjUsImV4cCI6MjA4ODY5NDk2NX0.U33nbsyLudPHme0X5ZWeVoxu1UkgsJfpjUZmrOqKe2Q`

## Design System (MUST MATCH — exact same as Phase 1 & 2)
- Background: `#0a0a0a` / Surface: `#111` / Surface2: `#1a1a1a` / Border: `#222`
- Accent: `#00ff88` (neon green)
- Text: `#e0e0e0` / Muted: `#777` / Dim: `#555`
- Red: `#ff4444` / Yellow: `#ffcc00`
- Fonts: Space Grotesk (body), JetBrains Mono (data/numbers)
- Dark fintech aesthetic. Sharp, data-dense. Same design language as existing pages.

## New Database Tables (Already Deployed + Seeded)
- `alert_preferences` — per-user notification settings (email, frequency, thresholds)
- `deal_reports` — generated report metadata (single_deal, market_summary, portfolio_summary)
- `county_tax_rates` — real property tax rates by county (20 top Section 8 markets seeded)
- `insurance_estimates` — average insurance premiums by state (14 states seeded)
- `fmr_history` — already existed from Phase 1, now seeded with 2022-2024 data for 5 major zips

## What to Build

### 1. Update Types (`src/lib/types.ts`)
Add TypeScript interfaces for:
- AlertPreferences
- DealReport
- CountyTaxRate
- InsuranceEstimate
- FMRHistoryEntry

### 2. Email Alert System

**Alert Preferences UI** — Add to Settings page (`src/app/settings/page.tsx`):
- "Email Alerts" section below profile settings
- Toggle: enable/disable email alerts
- Email address field (defaults to account email)
- Frequency selector: Instant / Daily Digest / Weekly Digest
- Minimum deal score threshold slider (default 70)
- Price drop alert threshold (default 5%)
- Notification types: New Deals ✓, Price Drops ✓, Score Changes ☐
- Save button that writes to `alert_preferences` table

**Alert Processing API** — `/api/alerts/process/route.ts`:
- POST endpoint (called by external cron or internal trigger)
- Fetches all saved searches with `alert_enabled = true`
- For each: calls the scanner Python backend to find current deals
- Compares with previously seen deals (in `deals` table)
- New deals → create alert records + queue email
- Price drops → detect if any existing deal's price decreased
- Returns summary: `{ processed: N, new_alerts: N, emails_queued: N }`
- This route should be protected with a simple API key check (env var `CRON_API_KEY`)

**Alert Email Sending** — `/api/alerts/send/route.ts`:
- POST endpoint to send pending alert emails
- Reads from `alerts` table where `sent_at` is null
- Groups by user and digest frequency
- Formats email HTML with deal cards (address, price, score, cash flow)
- Uses Resend API (env: `RESEND_API_KEY`) — build the full integration, but wrap the actual Resend call in a try/catch with a clear "RESEND_API_KEY not set" fallback log
- Mark alerts as sent

**Email Template** — Create `src/lib/alert-email.ts`:
- Function that generates HTML email for deal alerts
- Dark theme matching the app (inline CSS for email compatibility)
- Shows: deal card(s) with address, price, score, cash flow, HUD Payment Standard
- CTA button: "View Deal →" linking to the app
- Unsubscribe link at bottom
- Support both single-deal instant alerts AND digest summaries

### 3. Saved Search Auto-Scanner

**Cron Runner API** — `/api/cron/scan/route.ts`:
- POST endpoint protected by `CRON_API_KEY`
- Fetches all saved searches where `alert_enabled = true`
- For each saved search:
  1. Call the Python scanner backend (same endpoint the frontend uses)
  2. Compare results with `deals` table
  3. New deals → insert into `deals`, create `alerts` records
  4. Price changes → update `deals`, create price_drop alerts
  5. Update `saved_searches.last_run_at`
  6. Insert `scan_runs` record
- Rate limit: max 5 concurrent scans, 2s delay between
- This is designed to be called by an external cron (Vercel Cron or Mac mini crontab)

**Add `vercel.json` cron config:**
```json
{
  "crons": [
    {
      "path": "/api/cron/scan",
      "schedule": "0 */6 * * *"
    }
  ]
}
```
(Every 6 hours — adjustable)

### 4. PDF Deal Reports (Pro + Investor)

**Report Generation API** — `/api/reports/generate/route.ts`:
- POST endpoint
- Accepts: `{ type: 'single_deal' | 'market_summary' | 'portfolio_summary', deal_id?, saved_search_id? }`
- Generates report data (JSON) and stores in `deal_reports` table
- Returns the report data (PDF generation happens client-side or via a separate service)

**Report Types:**

**Single Deal Report:**
- Property overview: address, price, beds/baths/sqft, Zillow link
- Financial analysis: DSCR, cash flow, cash-on-cash, rent-to-price
- Expense breakdown: mortgage, taxes (real county rate!), insurance (real state rate!), management
- Neighborhood: crime grade, school score, walkability
- HUD Payment Standard vs market rent comparison
- FMR trend chart (3 years)
- Comparable deals in same zip (if available)
- Overall score with letter grade

**Market Summary Report:**
- Top deals found in a scan
- Market-level stats: avg price, avg rent, avg score, avg DSCR
- FMR trends for the market
- Best neighborhoods (by crime grade + deal score)
- Top 10 deals table

**Portfolio Summary Report:**
- All portfolio properties
- Total monthly income / expenses / cash flow
- Property-by-property breakdown
- Management cost analysis (PM vs self-manage savings)
- Year projection

**Reports Page** — `/reports/page.tsx`:
- List of generated reports
- "Generate Report" button with type selector
- Report detail view (rendered in browser, with "Download PDF" button)
- For PDF download: use `html2canvas` + `jsPDF` for client-side PDF generation (no server-side PDF library needed)

**Report Viewer Component** — `src/components/ReportViewer.tsx`:
- Renders a full report as a styled HTML page
- Includes Recharts for trend charts
- "Print / Download PDF" button using `window.print()` with `@media print` CSS
- Alternatively, use `html2canvas` + `jsPDF` for direct PDF download

### 5. FMR Trend Charts

**FMR History API** — `/api/fmr/[zipCode]/route.ts`:
- GET: Returns FMR history for a zip code from `fmr_history` table
- If no history exists: try to fetch from HUD API and seed (future enhancement)
- Response: `{ zip_code, history: [{ year, efficiency, one_bed, two_bed, three_bed, four_bed }] }`

**FMR Trend Component** — `src/components/FMRTrendChart.tsx`:
- Line chart (Recharts) showing FMR trends by bedroom count
- 3-5 year history
- Color-coded lines per bedroom count
- Annotations for year-over-year % change
- Used in: expanded deal cards, single deal reports, market summary

**Integrate into deal cards:**
- Add a "Rent Trends" expandable section in the deal card expanded view
- Shows FMR trend chart for that deal's zip code
- Shows: "FMR up X% YoY" or "FMR down X% YoY" badge

### 6. Enhanced Expense Modeling (Real Data)

**Expense Calculator** — `src/lib/expenses.ts`:
- `getRealExpenses(price, monthlyRent, state, county, zipCode)` function
- Fetches real tax rate from `county_tax_rates` (falls back to estimate if no data)
- Fetches real insurance from `insurance_estimates` (falls back to flat rate)
- Calculates: mortgage (DSCR loan), real taxes, real insurance, management fee
- Returns detailed expense breakdown with sources noted

**Tax/Insurance API** — `/api/expenses/[state]/route.ts`:
- GET: Returns county tax rates and insurance estimates for a state
- Used by the expense calculator and report generator

**Update Scanner Deal Cards:**
- In expanded deal view: show expense breakdown with REAL tax rate and insurance
- Label each line item with source: "Property Tax (Cuyahoga Co. 2.44%)" instead of generic
- Show comparison: "Estimated vs National Average" for tax and insurance

**Update Python Scorer** — Modify `~/Projects/section8-finder/scorer.py`:
- Add optional `tax_rate` and `insurance_monthly` parameters to `score_deal()`
- If provided, use real values instead of config defaults
- This allows the cron scanner to pass real rates per property

### 7. Dashboard Enhancements

**Update Dashboard** (`src/app/dashboard/page.tsx`):
- Add "Alert Activity" card: recent alerts (new deals, price drops)
- Add "Reports" quick link card
- Show FMR trend mini-chart for user's most-scanned market

### 8. Add Reports to Navbar

Update `src/components/Navbar.tsx`:
- Add "Reports" nav link (between Outreach and Pricing)
- Show lock icon if user is Free plan (Pro+ feature)

## New File Organization
```
src/
├── app/
│   ├── reports/page.tsx                    # Reports dashboard (NEW)
│   └── api/
│       ├── alerts/
│       │   ├── process/route.ts            # Process alerts from saved searches (NEW)
│       │   └── send/route.ts               # Send pending alert emails (NEW)
│       ├── cron/
│       │   └── scan/route.ts               # Cron-triggered auto-scanner (NEW)
│       ├── reports/
│       │   └── generate/route.ts           # Generate deal/market/portfolio reports (NEW)
│       ├── fmr/
│       │   └── [zipCode]/route.ts          # FMR history by zip (NEW)
│       └── expenses/
│           └── [state]/route.ts            # Real tax + insurance data (NEW)
├── components/
│   ├── FMRTrendChart.tsx                   # Recharts FMR trend line chart (NEW)
│   ├── ReportViewer.tsx                    # Render + print/download reports (NEW)
│   └── ExpenseBreakdown.tsx               # Detailed expense breakdown component (NEW)
└── lib/
    ├── alert-email.ts                      # HTML email template for alerts (NEW)
    └── expenses.ts                         # Real expense calculator (NEW)
```

## Dependencies to Add
- `jspdf` — Client-side PDF generation
- `html2canvas` — Capture HTML as image for PDF
- (Both are lightweight, well-maintained)

## Constraints
- MUST keep Phase 1 + 2 working perfectly
- Same dark design system — no new colors or fonts
- Mobile responsive
- TypeScript strict — no `any`
- Reports gated to Pro+ tier
- Alert processing gated to Pro+ tier
- Free users can see FMR trends but can't set up alerts
- Email sending: build complete Resend integration with proper error handling when API key is missing
- Cron: build the API endpoint; external scheduling (Vercel cron or crontab) configures when it runs
- Don't break the existing scanner page, dashboard, portfolio, outreach, or settings
