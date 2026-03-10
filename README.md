# Section 8 Scanner

Web app for finding Section 8 real estate investment deals. Scans Zillow for properties, scores them against HUD Fair Market Rents, and streams results in real-time.

## Quick Start

```bash
# Set your HUD API token
export HUD_API_TOKEN="your-token"

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Access via Tailscale

If running on a Tailscale node, access at `http://<tailscale-hostname>:3000`.

## Architecture

- **Next.js 14** App Router + TypeScript + Tailwind CSS
- **SSE API route** (`/api/scan`) spawns `scanner.py` as a subprocess
- **scanner.py** uses modules from `~/Projects/section8-finder/` (zillow.py, hud.py, scorer.py)
- Python runtime: `~/Projects/section8-finder/venv/bin/python3` or `~/.local/pipx/venvs/scrapling/bin/python3`

## Requirements

- Node.js 18+
- Python 3.10+ with Scrapling installed
- `HUD_API_TOKEN` environment variable (register at https://www.huduser.gov/hudapi/public/register)
