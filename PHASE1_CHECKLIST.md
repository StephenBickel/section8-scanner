# Phase 1 Completion Checklist

## ✅ What's Built
- Full auth system (signup, login, magic link via Supabase)
- Multi-market scanner with saved searches
- Dashboard (view saved searches, recent scans, stats)
- Portfolio tracker (add properties, track cash flow)
- Settings (profile, plan, alert preferences)
- Pricing page (3 tiers: Free/Pro $29/Investor $79)
- Stripe webhook handler (subscription lifecycle)
- Dark fintech design locked in

## 🔧 Next: Stripe Setup (REQUIRED before deploy)

### 1. Create Stripe Products
Go to dashboard.stripe.com → Products → Create product

**Free Plan (optional in Stripe, but document the limits)**
- No recurring charges
- Document in app: "3 scans/day, no alerts, no portfolio"

**Pro Plan**
- Name: `Section 8 Scanner Pro`
- Price: $2,900 per month (in cents: 2900)
- Billing period: Monthly
- Get the Price ID (looks like `price_1234...`)

**Investor Plan**
- Name: `Section 8 Scanner Investor`
- Price: $7,900 per month
- Billing period: Monthly
- Get the Price ID

### 2. Get Stripe API Keys
- Go to Settings → API Keys
- Copy:
  - **Publishable Key** (pk_live_...)
  - **Secret Key** (sk_live_...)

### 3. Set Environment Variables
Create or update `.env.local`:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # You'll get this after setting up webhook
```

### 4. Create Stripe Webhook
- Go to Developers → Webhooks → Add endpoint
- Endpoint URL: `https://section8-app.vercel.app/api/webhooks/stripe` (after deploy)
- For now during local testing: Use Stripe CLI tunnel
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```
- Copy the webhook signing secret and add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 5. Update src/lib/stripe.ts
Replace the placeholder IDs:
```typescript
export const STRIPE_PRICE_IDS = {
  pro: "price_1234...",      // Your Pro Price ID
  investor: "price_5678...",  // Your Investor Price ID
};
```

## 🧪 Local Testing

### 1. Start the app
```bash
cd ~/Projects/section8-app
npm run dev
# App runs on http://localhost:3000
```

### 2. Test flow
- Sign up → should create profile in Supabase
- Go to /pricing → click checkout (will use Stripe test cards)
- Use test card: `4242 4242 4242 4242` (any future expiry, any CVC)
- Check Supabase: profiles.plan should update to "pro" or "investor"
- Go to /dashboard → should see empty saved searches
- Go back to / (scanner) → save a search → check /dashboard

### 3. Check logs
- Vercel logs: `vercel logs` (once deployed)
- Supabase logs: Database → View in SQL
- Stripe logs: https://dashboard.stripe.com/logs

## 📦 Deploy to Vercel

```bash
cd ~/Projects/section8-app
git push origin main
vercel deploy
```

Before deploying, set Vercel environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://heocvgxhgmludycstedj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

## 🐛 Known Limitations (Phase 1)
- Alerts are set up in the DB but not yet sent (Phase 2)
- Portfolio transactions log is created but no UI to add them yet
- PDF reports not yet implemented (Phase 2)
- FMR data is only via HUD API (no historical trends yet)
- No neighborhood data/comp analysis (Phase 3+)

## 📝 Notes for Phase 2
- Implement `src/lib/resend.ts` for email alerts
- Set up cron job to periodically re-scan saved_searches table
- When deal is new: fetch user email, send alert via Resend
- Add transaction UI to portfolio (rent received, maintenance, etc.)

## ❓ Questions?
Check:
- `src/app/api/webhooks/stripe/route.ts` for how subscriptions are handled
- `src/components/Navbar.tsx` for auth state flow
- `middleware.ts` for session refresh logic
