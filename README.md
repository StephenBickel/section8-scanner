# Section 8 Scanner

A self-hostable real-estate analysis app for comparing listings with HUD Fair
Market Rents, ranking potential deals, saving searches, managing a portfolio,
and organizing seller outreach.

The repository starts in `demo` scanner mode, so anyone can run the UI without
scraping credentials or a Python provider. Live scans are opt-in and protected
by user authentication, bounded inputs, concurrency limits, and a server-only
API key.

## Stack

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- Supabase Auth and PostgreSQL with Row Level Security
- Server-Sent Events for progressive scan results
- Optional FastAPI service for a live Python scanner
- Optional Stripe and Resend integrations

## Quick start

Requirements: Node.js 20+ and a Supabase project.

```bash
git clone https://github.com/StephenBickel/section8-scanner.git
cd section8-scanner
npm install
cp .env.example .env.local
```

In your Supabase SQL editor, run these files in order for a new installation:

1. `schema.sql`
2. `schema_phase2.sql`
3. `schema_phase3.sql`
4. `schema_tenant_finder.sql`
5. `supabase/migrations/20260928023816_guided_property_analyses.sql`

Set your own project values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SCANNER_MODE=demo
```

Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The demo scanner is public,
small, and deterministic; it never starts a scraper subprocess.

## Guided property analysis

Open **Analyze** to enter a property manually, or choose **Analyze property**
from a scanner result. The worksheet uses one financial model for purchase
financing, cash repairs, closing/holding costs, initial reserves, vacancy,
operating expenses, and capital reserves. Percentages use 0–100 units; percentage
expenses use scheduled rent. Cash-on-cash includes all initial cash, and debt
coverage is NOI divided by debt service. Results are projections before income
taxes; defaults are explicitly unverified assumptions.

The worksheet includes a downside case (10% lower rent and up to five additional
vacancy percentage points), a five-item evidence checklist, decision notes,
and exact JSON/CSV exports. Editing a related assumption reopens its diligence
task while retaining the user's evidence notes. Source/demo labels remain in
the saved snapshot and export.

Signed-in users can save immutable snapshots and compare up to three on
**Saved**. Further edits create a new snapshot instead of overwriting earlier
work. Older browser bookmarks remain separately labeled and are not silently
imported into an account. Starting sign-in from the worksheet creates an explicit
browser-local draft handoff valid for 30 minutes, including across tabs. It is
removed after saving; expired handoffs are removed when accessed or when starting
another handoff.

Account saves require the additive `guided_property_analyses` migration above
and `SUPABASE_SERVICE_ROLE_KEY` on the server. Apply that migration to an existing
project after the older migrations described below. Do not rerun the base schema
on an existing project. The new table permits owner reads/deletes, with calculated
writes restricted to the server. Its atomic save function caps storage at 200
snapshots per account and makes identical save retries idempotent. This is a
storage bound, not a paid-plan definition. Without configuration, saving reports
an error and leaves the editable worksheet and exports available.

The shared domain code is in `src/lib/analysis/`; HTTP access is provided by
`/api/analyses`. This is the foundation for future agent tools. MCP/OAuth account
linking, live-provider recovery, and subscription checkout are still separate
work; this feature does not implement them.

## Scanner modes

`SCANNER_MODE` has three explicit values:

- `demo` (default): streams bundled sample results and needs no scanner backend.
- `local`: authenticated requests run `scanner.py` on the Next.js host.
- `remote`: authenticated requests proxy to the protected FastAPI service.

Live mode does not silently fall back to another mode. A bad or missing live
configuration returns an error, which avoids accidentally exposing a local
process or presenting sample data as a real scan.

### Local live scanner

The adapter in `scanner.py` expects a provider directory containing compatible
`zillow.py`, `hud.py`, `scorer.py`, and `config.py` modules. Configure its path
instead of editing source code:

```dotenv
SCANNER_MODE=local
SCANNER_PYTHON=/absolute/path/to/python
SCANNER_MODULE_PATH=/absolute/path/to/scanner-provider
HUD_API_TOKEN=your-token
```

The provider integration is optional and is not included in this repository.
Check the data source's terms and applicable law before enabling automated
collection.

### Remote live scanner

Install and start the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SCANNER_API_KEY="$(openssl rand -hex 32)"
export SCANNER_MODULE_PATH=/absolute/path/to/scanner-provider
uvicorn api_server:app --host 127.0.0.1 --port 8100
```

Configure the web app with the same key:

```dotenv
SCANNER_MODE=remote
SCANNER_API_URL=https://scanner.example.com
SCANNER_API_KEY=the-same-long-random-secret
```

For a temporary Cloudflare tunnel, install `cloudflared`, export the required
variables, and run `scripts/start-tunnel.sh`. The script prints the URL; it does
not read shell startup files or mutate a specific Vercel project.

## Existing Supabase projects

Apply the SQL files in `migrations/` in filename order before making an existing
deployment public. They remove the old global seller-contact policy, restrict
profile updates, add bounded saved-search criteria, and install the atomic scan
quota used by live scanner modes.

Legacy seller contacts cannot be assigned safely by an automated migration.
They remain hidden until an administrator sets each row's correct `user_id`.
After backfilling all rows, set `seller_contacts.user_id` to `NOT NULL`. The
migration does this automatically when no unowned legacy rows remain.

## Environment and secrets

Copy `.env.example` and replace placeholders with values from your own services.
Only the Supabase URL and anon key use `NEXT_PUBLIC_`; all other credentials are
server-only. Never commit `.env.local`, a Supabase service-role key, Stripe
secret, Resend key, cron key, or scanner API key.

If a real credential has ever been committed, deleting it from the latest file
is not enough: rotate or revoke it before publishing because Git history retains
old versions.

## Verification

```bash
npm test
npm run build
npm run lint
npm audit
```

The security regression tests cover redirect validation, scanner bounds and
authentication, contact ownership, profile column privileges, and repository
secret hygiene.

Analysis tests additionally cover an independently specified financial case,
cash purchases, zero-interest loans, repair financing, missing/invalid inputs,
downside scenarios, export provenance, and draft handoff expiry. Database tests
execute the new migration in isolated PostgreSQL via the development-only PGlite
dependency, checking owner isolation, write restrictions, immutable retries, and
the account storage cap. They do not connect to a live Supabase project.

## Responsible use

Seller contact data is personal information. Operators are responsible for
privacy, marketing, fair-housing, scraping, and retention rules that apply to
their deployment. This software provides analysis tooling, not legal,
investment, or housing advice.

## License

[MIT](LICENSE)
