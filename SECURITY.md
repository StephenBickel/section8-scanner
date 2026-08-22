# Security policy

Please report suspected vulnerabilities privately through GitHub's security
advisory feature. Do not include secrets, personal information, or exploit data
in a public issue.

## Deployment rules

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `SCANNER_API_KEY`, Stripe secrets, and email
  provider keys server-side. Never use the `NEXT_PUBLIC_` prefix for them.
- Apply the SQL schemas for a fresh project or the migration in `migrations/`
  for an existing project before accepting users.
- Use a long random `SCANNER_API_KEY` whenever live scanning is enabled.
- Keep `SCANNER_MODE=demo` when publishing a showcase without a protected live
  scanner backend.
- Configure production HTTPS and a narrow `ALLOWED_ORIGINS` list.

This project processes seller contact information. Deployers are responsible
for applicable privacy, marketing, fair-housing, scraping, and data-retention
requirements in their jurisdiction.
