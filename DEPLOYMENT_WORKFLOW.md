# Health-Automation Deployment Workflow

This project deploys with this sequence:

1. Local changes in `C:\Users\radub\Documents\HealthAutomation`
2. Push commits to GitHub `main`
3. DigitalOcean App Platform auto-deploys from GitHub `main`

## 1) One-time setup

### GitHub Personal Access Token (PAT)

1. Open GitHub -> `Settings` -> `Developer settings` -> `Personal access tokens`.
2. Create a fine-grained token with access to `radubobirnac/Health-Automation`.
3. Grant `Contents: Read and write`.
4. Save the token securely.

### DigitalOcean App Platform connection

1. DigitalOcean -> `Apps` -> `Create App` -> `GitHub`.
2. Select repo: `radubobirnac/Health-Automation`.
3. Use the `do-app.yaml` in the repo, or set manually:
   - Build command: `npm run build`
   - Run command: `npm start`
   - HTTP port: `8080`
   - Branch: `main`

### DigitalOcean environment variables

Add these in the App Platform dashboard:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `AUTH_JWT_SECRET`
- `ADMIN_SETUP_TOKEN`
- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- Optional: `SMTP_FROM`
- Optional: `SMTP_SECURE`

Use `.env.example` as the template for local values.

## 2) Daily workflow

### Verify repo wiring

```powershell
Set-Location "C:\Users\radub\Documents\HealthAutomation"
powershell -ExecutionPolicy Bypass -File .\scripts\check-workflow.ps1
```

### Commit + push

```powershell
Set-Location "C:\Users\radub\Documents\HealthAutomation"
powershell -ExecutionPolicy Bypass -File .\scripts\push-main.ps1 -Message "Describe your change"
```

Preview commands without changing git history:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\push-main.ps1 -Message "Dry run" -DryRun
```

When prompted by Git:

- Username: your GitHub username
- Password: your GitHub PAT

## 3) Verify deployment

1. Confirm commit is visible on GitHub `main`.
2. Check DigitalOcean App Platform Deployments for a successful build.
3. Open live site and confirm your change is present.
4. Submit the contact form once after SMTP vars are configured.

## Notes

- Run PowerShell commands on separate lines. Do not rely on `&&`.
- Keep this repo as the single source of truth:
  `C:\Users\radub\Documents\HealthAutomation`
