# Netlify Environment Variables

Add the following environment variables in Netlify:

- SMTP_HOST (e.g., smtp.gmail.com)
- SMTP_PORT (e.g., 465 for SSL, 587 for TLS)
- SMTP_USER (your SMTP username or email)
- SMTP_PASS (app password or SMTP password)
- SMTP_FROM (optional, defaults to SMTP_USER)
- SMTP_SECURE (true for port 465, otherwise false)

Local development:
- Copy .env.example to .env and fill in the values.
- Do not commit .env.

# Netlify Deploy Settings

Use these settings when creating the site on Netlify:

- Team: bobirnacrs team
- Deploy user: radubobirnac
- Branch to deploy: main
- Base directory: (leave empty)
- Build command: npm run build
- Publish directory: dist
- Functions directory: netlify/functions

Site details:
- Project name: healthroaster-automation
- Site URL: https://healthroaster-automation.netlify.app

Note: If the project name is not available, choose a unique variant and update the site URL accordingly.
