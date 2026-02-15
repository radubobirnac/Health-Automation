# Netlify Environment Variables

Set these variables in Netlify site settings:

- `SMTP_HOST` (example: `smtp.gmail.com`)
- `SMTP_PORT` (example: `465` for SSL, `587` for TLS)
- `SMTP_USER` (SMTP username/email)
- `SMTP_PASS` (app password or SMTP password)
- `SMTP_FROM` (optional, defaults to `SMTP_USER`)
- `SMTP_SECURE` (optional, `true` for 465, otherwise `false`)

Local development:

- Copy `.env.example` to `.env` and set values.
- Do not commit `.env`.

# Netlify Deploy Settings

Use these settings when creating/importing the site on Netlify:

- Repo: `radubobirnac/Health-Automation`
- Branch to deploy: `main`
- Base directory: leave empty
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

If the preferred site name is unavailable, choose a unique variant.

See `DEPLOYMENT_WORKFLOW.md` for the full end-to-end process.
