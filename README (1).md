# HealthRoster Automation

## Purpose and Product Overview

HealthRoster Automation is a web application for NHS staffing workflows. It provides:

- A public-facing site for demo/contact intake.
- Client and admin authentication.
- A sheet-based scheduling workspace for nurses, shifts, and logs.
- Admin tools to create isolated client accounts and manage trust configurations.
- A booking worker service that automates shift booking against the Allocate BankStaff portal.

The scheduling workspace is the control plane: clients populate nurse-to-shift assignments, and the system generates booking tasks that the worker executes against the Allocate portal. Outcomes are reported back to the control plane and to Google Sheets for operational visibility.

## Current Status

### Implemented Today (Control Plane) -V1 

- React + Vite frontend with routing for marketing, auth, dashboard, and admin pages.
- Node HTTP server (`server.js`) for production serving and API handling.
- Firestore-backed API layer in `scripts/api.js`.
- JWT authentication with `admin` and `client` role handling.
- Contact form email delivery via SMTP (`/contact` in Node server; Netlify function available).
- Multi-sheet schedule management (create, duplicate, rename, delete with logs protection).
- Nurse row CRUD and shift cell updates over date ranges.

### Planned / Not Yet Implemented - V2 (this will be implemented once the onboarding of the client is complete)

- Trust configuration management (admin CRUD for portal URLs, credentials, rate limits, selector versions).
- Booking task generation from schedule workspace assignments.
- Booking worker service (separate Node.js process with Playwright browser automation).
- Portal DOM parsing with versioned selector sets for unfilled queue extraction.
- Browser lifecycle management with per-trust context isolation.
- Pre-flight conflict checks and deterministic booking execution.
- Captcha detection, operator alerting, and manual resolution workflow.
- Google Sheets reporting with write-ahead log and buffered batch sync.
- Reconciliation pipeline between booking logs and portal state.

## Architecture Overview

The system consists of two services and two data stores:

```
┌──────────────────────────┐       ┌──────────────────────────┐
│     CONTROL PLANE        │       │     BOOKING WORKER       │
│  (existing web app)      │       │  (new Node.js service)   │
│                          │       │                          │
│  React UI + Node API     │       │  Playwright browser      │
│  Schedule workspace      │       │  Portal DOM parser       │
│  Trust config mgmt       │       │  Booking executor        │
│  Task generation         │       │  Rate limiter            │
│  Admin / client auth     │       │  Captcha handler         │
│                          │       │  Sheets reporter         │
└────────────┬─────────────┘       └────────────┬─────────────┘
             │                                  │
             │        ┌──────────────┐          │
             └───────►│  Firestore   │◄─────────┘
                      │              │
                      │  - auth      │
                      │  - schedules │
                      │  - trusts    │
                      │  - tasks     │
                      │  - selectors │
                      └──────────────┘
                             │
                      ┌──────▼───────┐
                      │Google Sheets │
                      │  (reporting)
                           or
                           our Portal │
                      └──────────────┘
```

### Control Plane (This Repository)

**Frontend:**
- Stack: React 18, React Router, Vite.
- Entrypoints: `src/main.jsx`, `src/App.jsx`.
- Pages:
  - Public: `Home`, `About`, `Contact`.
  - Auth: `Login`, `AdminLogin`.
  - Workspace: `Dashboard` (schedule management and booking task generation).
  - Admin: `AdminCreateUser`, trust configuration management (planned).

**API and Runtime:**
- Production runtime: Node server in `server.js`.
- API logic: centralized in `scripts/api.js`.
- Dev runtime: Vite middleware mounts API routes from `scripts/api.js` (`vite.config.js` plugin `local-api`).
- Netlify compatibility: `netlify/functions/api.js` reuses `scripts/api.js`; `netlify/functions/contact.js` handles contact email.

**Data Layer:**
- Primary backend data store: Firestore via `scripts/firebase-admin.js`.
- Collections:
  - `auth_users`: credential docs and roles.
  - `users`: per-user sheet/nurse/shift state.
  - `trusts`: trust configuration documents (planned).
  - `booking_tasks`: worker task queue (planned).
  - `selector_sets`: versioned DOM selector configurations (planned).

**Auth and Session Model:**
- Login endpoint issues JWT signed by `AUTH_JWT_SECRET`.
- Frontend stores token in `localStorage` (`hr_token`) and sends `Authorization: Bearer <token>`.
- Admin-only endpoints enforce role checks on decoded JWT payload.

### Booking Worker (Separate Service — Planned)

The worker is a standalone Node.js process that runs Playwright to automate Allocate portal interactions. It is deployed separately from the control plane.

Key design decisions:
- One headless Chromium browser instance per worker process.
- One Playwright `BrowserContext` per active trust (session and cookie isolation).
- Event-driven task pickup via Firestore real-time listener, with polling fallback.
- Versioned selector sets loaded from Firestore config (not hardcoded).
- Trust-scoped rate limiting governed by trust configuration profiles.
- Local write-ahead log for Google Sheets reporting (decoupled from booking outcome).
- Captcha detection triggers operator alert and session hold with configurable timeout.

See `PROJECT_PLAN.md` Section 4 for full architectural detail.

## Request and Data Flow

### Current Flow (Schedule Management)

1. User logs in through `/auth/login`.
2. JWT token is persisted in browser local storage.
3. Frontend calls protected endpoints via `authedFetch`.
4. API reads/writes Firestore user state (sheets, nurses, shifts).
5. Dashboard updates UI optimistically and syncs cell-level changes.
6. Contact form sends SMTP notification to configured recipients.

### Target Flow (Booking Automation)

1. Client populates schedule workspace with nurse-to-shift assignments.
2. Client triggers booking task generation (or tasks are generated on schedule save).
3. Control plane runs pre-flight conflict checks and writes `pending` tasks to Firestore `booking_tasks` collection.
4. Worker picks up pending tasks via Firestore listener.
5. Worker validates pre-flight conditions (rate budget, session health, trust not blocked).
6. Worker navigates browser context to trust portal, parses unfilled queue via versioned selectors.
7. Worker locates target request by Request ID and executes right-click → book → staff search → confirm.
8. Worker detects outcome and writes result to Firestore task record.
9. Worker appends booking log row to local write-ahead log.
10. Reporting sync loop batch-appends WAL rows to Google Sheets within API rate limits.
11. Control plane UI reflects task outcomes from Firestore.

## API Endpoint Map

### Existing Endpoints

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | No | Username/password login, returns JWT and role |
| GET | `/auth/me` | Yes | Returns current token identity payload |
| GET | `/admin-api/status` | Yes | Indicates admin role status |
| POST | `/admin-api/bootstrap` | No (setup token) | One-time admin bootstrap flow |
| POST | `/admin-api/create-user` | Admin | Create client user with seeded workspace |
| GET | `/sheets` | Yes | List user sheets |
| POST | `/sheets/create` | Yes | Create a sheet |
| POST | `/sheets/duplicate` | Yes | Duplicate an existing sheet |
| POST | `/sheets/rename` | Yes | Rename sheet |
| POST | `/sheets/delete` | Yes | Delete sheet (logs protected) |
| GET | `/schedule` | Yes | Fetch sheet + nurses + shifts for date range |
| POST | `/schedule/update` | Yes | Upsert/delete single shift cell |
| POST | `/nurses/upsert` | Yes | Upsert one or many nurse rows |
| POST | `/nurses/delete` | Yes | Delete selected nurse rows and linked shifts |
| POST | `/contact` | No | Send contact/demo request email |

### Planned Endpoints (M1)

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/trusts` | Admin | List trust configurations |
| POST | `/trusts/upsert` | Admin | Create or update trust config |
| POST | `/trusts/delete` | Admin | Delete trust config |
| GET | `/booking-tasks` | Yes | List booking tasks (filterable by trust, status) |
| POST | `/booking-tasks/create` | Yes | Generate booking tasks from schedule selections |
| POST | `/booking-tasks/cancel` | Yes | Cancel pending tasks |
| POST | `/booking-tasks/clear-blocked` | Admin | Clear blocked state for a trust |
| GET | `/worker/status` | Admin | Proxy to worker health endpoint |

## Local Setup

### Prerequisites

- Node.js 18+ (Node.js 20 LTS recommended).
- npm 9+.
- Firestore project credentials.
- SMTP credentials for contact flow testing.

For worker development (when applicable):
- Playwright dependencies (`npx playwright install --with-deps chromium`).
- Google Sheets API service account credentials.

### Install

```bash
npm install
```

### Environment Configuration

Create `.env` in repo root and set values. Never commit this file.

**Required core vars:**

- `PORT` (optional; defaults to `8080` in `server.js`).
- `AUTH_JWT_SECRET`
- `ADMIN_SETUP_TOKEN`
- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

**Firebase (choose one strategy):**

- `FIREBASE_SERVICE_ACCOUNT_JSON` as full JSON string (preferred for cloud runtime), or
- `FIREBASE_SERVICE_ACCOUNT_PATH` to a local JSON file, or
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

**Email (required for contact endpoint):**

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (optional; defaults to `SMTP_USER`)
- `SMTP_SECURE` (optional; `true` for SSL/465)

**Optional frontend Firebase values (for `src/firebase.js`):**

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Worker-specific vars (planned, for worker service `.env`):**

- `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` — Sheets API credentials.
- `GOOGLE_SHEETS_SPREADSHEET_ID` — Target reporting spreadsheet.
- `WORKER_ID` — Unique identifier for this worker instance.
- `WORKER_MAX_CONTEXTS` — Max concurrent browser contexts (default: 4).
- `CAPTCHA_TIMEOUT_SECONDS` — How long to hold session for captcha resolution (default: 300).
- `WAL_PATH` — Path to write-ahead log file (default: `./data/wal.jsonl`).

### Run Modes

Development mode (frontend + API middleware):
```bash
npm run dev
```

Production-like mode (serves built app and full Node routes including `/contact`):
```bash
npm run build
npm start
```

Note: Vite middleware currently mounts `/auth`, `/admin-api`, `/sheets`, `/schedule`, and `/nurses`. Contact testing is most reliable through `npm start`.

## Deployment Notes

### Primary: DigitalOcean App Platform

**Control Plane:**
- Canonical deployment path is defined in `do-app.yaml`, `DEPLOYMENT_WORKFLOW.md`.
- App build command: `npm run build`.
- App run command: `npm start`.
- Runtime port: `8080`.

**Booking Worker (planned):**
- Separate DigitalOcean droplet or App Platform worker component.
- Must be UK-hosted (London region) to meet trust geo-restriction requirements.
- Requires sufficient resources for headless Chromium: minimum 4GB RAM / 2 vCPU recommended for up to 4-6 concurrent trust contexts.
- No public HTTP port required (communicates via Firestore only); health check endpoint exposed on internal port for monitoring.

### Secondary: Netlify

- Netlify is configured for build publish and function routing for API routes in `netlify.toml`.
- API function reuses shared handler logic through `netlify/functions/api.js`.
- Contact function exists at `netlify/functions/contact.js`.
- Netlify is only applicable to the control plane. The worker cannot run on Netlify.

## Repository Structure and Key Files

```
├── src/                          # React frontend pages/components
├── scripts/
│   ├── api.js                    # Central backend route logic and Firestore persistence
│   └── firebase-admin.js         # Firebase Admin initialization and credential fallback
├── server.js                     # Production HTTP server, static serving, API dispatch, contact
├── netlify/functions/            # Netlify adapters for API and contact
├── do-app.yaml                   # DigitalOcean App Platform spec
├── DEPLOYMENT_WORKFLOW.md        # GitHub to DigitalOcean release workflow
├── NETLIFY_ENV.md                # Environment variable reference
├── PROJECT_PLAN.md               # End-to-end implementation roadmap
└── README.md                     # This file
```

**Planned additions:**

```
├── worker/                       # Booking worker service (separate process)
│   ├── index.js                  # Worker entrypoint
│   ├── browser-manager.js        # Playwright browser and context lifecycle
│   ├── dom-parser.js             # Portal DOM extraction using versioned selectors
│   ├── booking-executor.js       # Right-click → book → confirm interaction sequence
│   ├── task-consumer.js          # Firestore task listener and polling fallback
│   ├── rate-limiter.js           # Per-trust action budget enforcement
│   ├── captcha-handler.js        # Detection, alerting, session hold logic
│   ├── sheets-reporter.js        # WAL writer and batch Sheets sync loop
│   ├── preflight.js              # Pre-flight check sequence
│   └── health.js                 # Health check endpoint
├── worker/selectors/             # Selector set JSON files (or loaded from Firestore)
└── worker/data/                  # Local WAL storage directory
```

## Current State vs Target State Summary

| Capability                          | Current                         | Target                                                  | Version |
|-------------------------------------|---------------------------------|---------------------------------------------------------|---------|
| Schedule management                 | Operational                     | Operational (extended with task generation)             | V1      |
| Auth and admin provisioning         | Operational                     | Operational (extended with trust config CRUD)           | V1      |
| Contact intake                      | Operational                     | Operational                                             | V1      |
| Trust configuration                 | Not implemented                 | Admin UI and API for per-trust settings                 | V2      |
| Booking task queue                  | Not implemented                 | Firestore-backed task generation and lifecycle          | V2      |
| Browser automation                  | Not implemented                 | Playwright worker with per-trust context isolation      | V2      |
| Portal DOM parsing                  | Not implemented                 | Versioned selector sets and unfilled queue extraction   | V2      |
| Booking execution                   | Not implemented                 | Right-click booking workflow with pre-flight checks     | V2      |
| Captcha handling                    | Not implemented                 | Detection → alert → operator resolution workflow        | V2      |
| Google Sheets reporting             | Not implemented                 | WAL-buffered batch sync with rate limit resilience      | V2      |
| Operational monitoring              | Not implemented                 | Health checks, structured logs, alerting                | V2      |
| Automation performance optimization | Basic automation (V2)           | Improved latency, smarter scheduling, reduced race loss | V3      |
Analytics and dashboards              | Basic analytics (V1)            | Advanced reporting and anomaly detection                | V3      |
