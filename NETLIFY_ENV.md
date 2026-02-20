# DigitalOcean App Platform Environment Variables

Set these variables in the DigitalOcean App Platform dashboard:

## Firebase (single JSON env var)

- `FIREBASE_SERVICE_ACCOUNT_JSON`
  - Paste the full Firebase service-account JSON as a single string.
  - Keep `\n` line breaks in `private_key` (do not paste raw multi-line PEM).

## API auth + admin bootstrap

- `AUTH_JWT_SECRET`
- `ADMIN_SETUP_TOKEN`
- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

## Email (contact form)

- `SMTP_HOST` (example: `smtp.gmail.com`)
- `SMTP_PORT` (example: `465` for SSL, `587` for TLS)
- `SMTP_USER` (SMTP username/email)
- `SMTP_PASS` (app password or SMTP password)
- `SMTP_FROM` (optional, defaults to `SMTP_USER`)
- `SMTP_SECURE` (optional, `true` for 465, otherwise `false`)

Local development:

- Copy `.env.example` to `.env` and set values.
- Do not commit `.env`.

See `DEPLOYMENT_WORKFLOW.md` for the full end-to-end process.
