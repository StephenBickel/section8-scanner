# Section 8 Scanner — Full Product Build Spec

## Architecture
- **Frontend:** Next.js 16 on Vercel (App Router, Tailwind CSS v4, TypeScript)
- **Backend:** FastAPI on Mac mini (Python + Scrapling for Zillow scraping)
- **Database:** Supabase (`heocvgxhgmludycstedj`)
- **Auth:** Supabase Auth (email/password + magic link)
- **Payments:** Stripe (Free / Pro $29/mo / Investor $79/mo)
- **Email:** Resend (alerts, reports)
- **Hosting:** Vercel (frontend) + Mac mini via Cloudflare Tunnel (scanner API)

## Supabase Details
- **Ref:** `heocvgxhgmludycstedj`
- **URL:** `https://heocvgxhgmludycstedj.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlb2N2Z3hoZ21sdWR5Y3N0ZWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMTg5NjUsImV4cCI6MjA4ODY5NDk2NX0.U33nbsyLudPHme0X5ZWeVoxu1UkgsJfpjUZmrOqKe2Q`
- **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlb2N2Z3hoZ21sdWR5Y3N0ZWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzExODk2NSwiZXhwIjoyMDg4Njk0OTY1fQ.ycS5Ag25Wu5LcZAw8W9LikNQ-jSnRIHyJ8MAY5wjOeg`

## Design System (MUST MATCH EXISTING)
- **Background:** `#0a0a0a` (bg), `#111` (surface), `#1a1a1a` (surface2)
- **Border:** `#222`
- **Accent:** `#00ff88` (neon green)
- **Text:** `#e0e0e0` (primary), `#777` (muted), `#555` (dim)
- **Red:** `#ff4444`, **Yellow:** `#ffcc00`, **Yellow-green:** `#aaff44`
- **Fonts:** Space Grotesk (headings/body), JetBrains Mono (numbers/data)
- **Style:** Dark terminal/fintech aesthetic. No rounded-3xl cards. Sharp, data-dense.

## Current File Structure
```
section8-app/
├── src/app/
│   ├── layout.tsx          # Root layout (fonts, dark theme)
│   ├── page.tsx            # Main scanner page (sidebar + results table)
│   ├── globals.css         # Tailwind + custom styles
│   └── api/scan/route.ts   # SSE scan endpoint (proxies to Mac mini or demo)
├── scanner.py              # Python scanner subprocess wrapper
├── api_server.py           # FastAPI server (Mac mini)
├── schema.sql              # Supabase schema (already deployed)
└── package.json            # Next.js 16, React 19
```

## What to Build

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js lucide-react recharts zustand
```

### 2. Supabase Client (`src/lib/supabase.ts`)
- Browser client with anon key
- Server client for API routes (service role)
- Middleware for auth session refresh

### 3. Auth Pages
- `/login` — email + password login, magic link option
- `/signup` — email + password registration with full_name
- `/auth/callback` — Supabase auth callback handler
- Auth state in a Zustand store or React context
- Protected route wrapper component

### 4. Navigation & Layout Overhaul
Transform from single-page to multi-page app:
- **Top navbar:** Logo, nav links (Scanner, Dashboard, Portfolio, Pricing), user menu
- **Scanner page** (`/`) — existing scanner (keep as-is but add "Save Search" button)
- **Dashboard** (`/dashboard`) — saved searches, recent scans, alert feed, quick stats
- **Portfolio** (`/portfolio`) — property list, add property, P&L summary
- **Pricing** (`/pricing`) — three-tier pricing cards
- **Settings** (`/settings`) — profile, plan management, alert preferences

### 5. Multi-Market City Selector
Replace the text input with a searchable dropdown:
- Top 50 Section 8 markets pre-loaded (Cleveland, Memphis, Detroit, Indianapolis, etc.)
- Autocomplete with city + state
- Show HUD FMR data next to each city when selected
- Allow custom city entry

### 6. Saved Searches + Alerts
- "Save This Search" button on scanner results
- Dashboard shows all saved searches with last scan results
- Toggle alerts on/off per search
- Alert frequency: instant, daily, weekly
- Email alerts via Resend when new deals match criteria

### 7. Enhanced Deal Cards
Current expanded row is good. Add:
- "Add to Portfolio" button
- "Generate Report" button (Pro+)
- Neighborhood data placeholder
- Price change indicator (if deal was seen before at different price)

### 8. Portfolio Tracker (`/portfolio`)
- Add property form (from deal or manual entry)
- Property cards showing: actual rent, projected rent, vacancy status, P&L
- Monthly/yearly cash flow chart (Recharts)
- Transaction log (rent received, maintenance, etc.)
- Portfolio summary: total properties, total monthly cash flow, avg CoC return

### 9. Stripe Integration
- **Products:**
  - Free: 3 scans/day, no alerts, no portfolio
  - Pro ($29/mo): unlimited scans, alerts, portfolio (up to 10 properties), PDF reports
  - Investor ($79/mo): everything + API access, bulk export, unlimited portfolio, multi-market dashboard
- Create Stripe checkout session from pricing page
- Webhook handler at `/api/webhooks/stripe`
- Plan enforcement in middleware

### 10. Pricing Page (`/pricing`)
Three cards with feature comparison. Dark theme matching existing design.
CTA buttons link to Stripe Checkout.
Free tier has "Current Plan" badge if logged in on free.

### 11. PDF Deal Report (Pro+)
- API route `/api/report/[dealId]` generates PDF
- Contains: property details, all financial metrics, FMR data, comp map placeholder
- Use @react-pdf/renderer or similar

### 12. API Enhancements
- `/api/scan` — add auth check, increment daily_scans_used, save deals to DB
- `/api/saved-searches` — CRUD for saved searches
- `/api/portfolio` — CRUD for portfolio properties + transactions
- `/api/webhooks/stripe` — handle subscription events
- `/api/report/[dealId]` — generate PDF report

## Constraints
- Keep the existing scanner page working exactly as-is (dark theme, SSE streaming, sidebar controls)
- All new pages must use the same dark fintech aesthetic
- Mobile responsive — the scanner table should collapse to cards on mobile
- No external CSS frameworks — Tailwind only
- TypeScript strict mode
- All Supabase queries use the anon key + RLS (never expose service role to client)

## Stripe Setup Notes
Stephen will need to create the Stripe products/prices. For now, build with placeholder price IDs and document what needs to be created.

## File Organization
```
src/
├── app/
│   ├── layout.tsx              # Add navbar
│   ├── page.tsx                # Scanner (existing, enhanced)
│   ├── globals.css             # Keep + extend
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── auth/callback/route.ts
│   ├── dashboard/page.tsx
│   ├── portfolio/page.tsx
│   ├── pricing/page.tsx
│   ├── settings/page.tsx
│   └── api/
│       ├── scan/route.ts       # Existing + auth + DB writes
│       ├── saved-searches/route.ts
│       ├── portfolio/route.ts
│       ├── webhooks/stripe/route.ts
│       └── report/[dealId]/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── AuthGuard.tsx
│   ├── CitySelector.tsx
│   ├── DealCard.tsx
│   ├── PortfolioCard.tsx
│   ├── PricingCard.tsx
│   ├── SaveSearchModal.tsx
│   └── CashFlowChart.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Auth middleware
│   ├── stripe.ts               # Stripe helpers
│   ├── cities.ts               # Pre-loaded city list
│   └── types.ts                # TypeScript types
└── stores/
    └── auth.ts                 # Auth state (zustand)
```
