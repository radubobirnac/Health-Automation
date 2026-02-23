# HealthRoster Automation End-to-End Project Plan

## 1) Objective and Success Metrics

Build an end-to-end staffing automation platform that progresses from the current scheduling workspace to reliable Allocate booking execution with auditable reporting.

Primary success metrics:

- Booking execution reliability: >= 98% successful booking actions for valid, eligible targets during pilot.
- Operational latency: median booking attempt latency <= 2 seconds from candidate selection to submit action in worker runtime.
- Reporting completeness: 100% of booking attempts logged with required fields.
- Uptime target for core API and worker scheduler: >= 99.5% in pilot window.
- Onboarding readiness: new engineer can stand up local environment within 60 minutes using `README.md`.

## 2) Scope

### In Scope

- Stabilize and document current app as the control plane:
  - Auth and role model.
  - Sheet and schedule data management.
  - Admin account provisioning.
  - Trust configuration management (portal URLs, throttle profiles, selector versions).
  - Booking policy and nurse eligibility inputs that drive the worker.
- Build separate automation worker service for Allocate booking.
- Define booking decision pipeline with deterministic tie-break rules and pre-flight conflict checks.
- Implement portal DOM parsing and unfilled queue extraction strategy.
- Define browser lifecycle, multi-tenancy, and resource management model for the worker.
- Implement per-booking logging and exception reporting to Google Sheets with failure buffering.
- Establish production operating model for DigitalOcean-hosted workloads.

### Out of Scope (Initial Release)

- Multi-portal support beyond Allocate.
- Autonomous captcha bypassing techniques.
- Multi-region deployment outside UK-hosted infrastructure.
- Full BI dashboarding beyond required operational logs and exceptions.

## 3) Discovery-Derived Constraints (Allocate Checklist)

The following constraints directly shape implementation:

- Login model is username/password; MFA is not currently expected.
- Captcha is present for some trusts.
- Some trusts enforce UK/London location constraints for infrastructure.
- Booking queue focus is Bank and Agency Unfilled.
- Request ID is unique and should be the reporting primary key.
- Tie-breaker for competing candidates is earliest created request.
- Booking interaction is right-click driven and speed-sensitive.
- Race conditions are expected; very fast booking is required.
- Retries are not allowed after failed booking attempts.
- Refresh/action frequency must be rate-limited to avoid protections.
- Reporting target is Google Sheets with per-booking granularity.
- Allowed external data includes nurse names and Request ID.
- UK-only hosting preference for performance and operational policy.
- Training/test environment is available and should gate production changes.

## 4) Target Architecture (Chosen Direction)

Design principle: keep existing app as the control plane that issues booking instructions, and add a separate worker service for execution. The control plane is authoritative — the schedule workspace drives what the worker books.

### 4.1) Product Relationship: Control Plane Drives the Worker

The schedule workspace is not a passive reference tool. It is the source of booking intent. The operational flow is:

1. Client or operator populates the schedule workspace with nurse assignments against shift slots.
2. The control plane exposes these assignments as booking tasks — "book Nurse X into Request Y for Shift Z."
3. The worker consumes these tasks and executes them against the Allocate portal.
4. Outcomes flow back to the control plane and to Google Sheets reporting.

This means the control plane owns the "what to book" decision. The worker owns the "how to book it" execution. The worker never independently decides which nurse to book into which shift — it acts on instructions from the control plane.

### 4.2) Components

- **Control Plane Web App** (existing repo, extended):
  - UI for client/admin operations and schedule management.
  - API and persistence for schedules, user configuration, trust configuration, and booking policy.
  - Booking task generation: translates schedule assignments into worker-consumable tasks.
  - Worker status visibility: surfaces task outcomes, blocked states, and exception counts.

- **Booking Worker Service** (new service):
  - Receives booking tasks from the control plane (see Section 4.5 for trigger model).
  - Manages browser sessions against Allocate portals.
  - Parses portal DOM to extract unfilled queue state (see Section 4.4).
  - Executes booking interaction sequence.
  - Emits structured results and exceptions back to Firestore.
  - Writes reporting rows to Google Sheets (with local buffer for failure resilience).

- **Data Stores**:
  - Firestore for configuration, trust configs, credential references, task states, booking task queue, and audit metadata.
  - Google Sheets for operational reporting outputs required by stakeholders.

- **Notification and Ops**:
  - Alerting hooks for failures, blocked booking conditions, and captcha escalation.
  - Health check endpoints on both control plane and worker.

### 4.3) Trust Configuration Model

Each trust the system operates against has distinct characteristics. The trust configuration schema must be defined, stored in Firestore, and managed via the admin UI.

Required trust configuration fields:

| Field | Type | Description |
| --- | --- | --- |
| `trust_id` | string | Unique identifier for the trust |
| `trust_name` | string | Display name |
| `portal_url` | string | Allocate portal URL (training and production) |
| `portal_env` | enum | `training` or `production` |
| `credentials_ref` | string | Reference to credential store (not inline) |
| `captcha_expected` | boolean | Whether captcha is known to be present |
| `geo_restriction` | string/null | Required IP region (e.g., `uk-london`) |
| `rate_limit_profile` | object | Max refresh frequency, max actions per minute, cooldown between bookings |
| `selector_version` | string | Which selector set version to use for DOM parsing |
| `ward_list` | array | Canonical ward names for this trust |
| `shift_patterns` | array | Configured shift types and time ranges |
| `session_timeout_minutes` | number | Expected session idle timeout |
| `enabled` | boolean | Whether the worker should process tasks for this trust |
| `notes` | string | Operator notes (e.g., known quirks) |

Trust configs are the multi-tenancy primitive. Every worker operation is scoped to a trust. Trust isolation is enforced at the browser session level (see Section 4.6).

### 4.4) Portal DOM Parsing and Unfilled Queue Extraction

The worker must read the Allocate portal to find bookable requests. This is the most fragile subsystem and requires explicit design.

**Parsing strategy:**

1. Worker navigates to the saved "RN Future" (or equivalent) view for the trust.
2. Worker extracts table/grid rows from the unfilled queue by walking the DOM.
3. Each row is parsed into a structured object with fields: `request_id`, `ward`, `shift_date`, `shift_start`, `shift_end`, `created_timestamp` (if visible), `status`.
4. Parsed rows are validated: rows missing a Request ID or with unrecognized ward names are flagged as parse errors and logged.
5. Valid rows are matched against the incoming booking task (from the control plane) to confirm the target request exists and is still unfilled.

**Selector management:**

- All CSS/XPath selectors used for DOM parsing are stored in versioned selector sets, not hardcoded in the worker logic.
- Selector sets are keyed by `selector_version` from the trust config.
- Selector sets are stored as JSON documents in Firestore (or as config files in the worker repo, deployable independently).
- When the Allocate portal UI changes, a new selector version is created and tested in the training environment. The trust config is updated to point to the new version only after validation.
- Selector set fields include: unfilled queue table container, row selector, Request ID cell, ward cell, shift date cell, shift time cells, status cell, right-click target element, popup container, staff search input, book button.

**Failure modes:**

- If the unfilled queue page structure doesn't match the expected selector set, the worker emits a `selector_mismatch` error and halts processing for that trust.
- If a specific row can't be parsed, it's skipped and logged. The worker continues with remaining rows.
- Stale data (request already filled by the time we act) is an expected race condition, not an error. The worker handles this gracefully via the no-retry policy.

### 4.5) Task Trigger and Scheduling Model

**Chosen model: event-driven push with polling fallback.**

Primary flow (event-driven):
1. When a client finalizes shift assignments in the schedule workspace, the control plane writes booking task documents to a `booking_tasks` Firestore collection with status `pending`.
2. The worker subscribes to Firestore real-time updates on the `booking_tasks` collection (filtered by `status == pending` and `trust_id` matching the worker's assigned trusts).
3. On receiving a new task, the worker validates it, transitions it to `running`, and begins execution.

Fallback flow (polling):
- Every 30 seconds (configurable per trust), the worker polls `booking_tasks` for any `pending` tasks that may have been missed by the real-time listener (e.g., after a worker restart).
- Polling interval is governed by the trust's `rate_limit_profile` to avoid exceeding action budgets.

**Why not pure cron/batch:**
- The race condition constraint ("very fast booking is required") means batch scheduling at fixed intervals would introduce unacceptable latency. The system needs to react to new tasks within seconds, not minutes.
- However, the worker does run a periodic scan (separate from task processing) to refresh its view of the unfilled queue and detect newly appeared requests that the control plane may want to act on.

### 4.6) Browser Lifecycle and Multi-Tenancy Model

**Isolation model: one browser context per trust, one worker process handles multiple trusts.**

Architecture:
- The worker runs as a single Node.js process with Playwright (chosen over Puppeteer for better cross-browser support and context isolation).
- Each active trust gets its own Playwright `BrowserContext`. Contexts are isolated — cookies, sessions, and local storage do not leak between trusts.
- A shared `Browser` instance is launched once per worker process. Contexts are created and destroyed per trust as needed.

**Browser lifecycle:**

| Event | Action |
| --- | --- |
| Worker starts | Launch headless Chromium browser instance |
| Trust becomes active (has pending tasks) | Create `BrowserContext` for that trust, navigate to portal, authenticate |
| Session timeout approaching | Refresh session (navigate to keep-alive page or re-authenticate) |
| Captcha detected | Pause context, emit `blocked` status, hold session open for operator intervention (max 5 min configurable timeout, then abandon) |
| Browser crash | Detect via Playwright crash event, restart browser instance, recreate active contexts |
| Trust has no tasks for > N minutes | Close context to free resources |
| Worker shutdown | Graceful close of all contexts and browser |

**Resource budget (per DigitalOcean droplet):**
- Estimated: 1 headless Chromium instance supports 4-6 concurrent `BrowserContext` instances on a 4GB RAM / 2 vCPU droplet.
- If trust count exceeds capacity, deploy additional worker instances with non-overlapping trust assignments.
- Worker self-reports resource utilization via health check endpoint.

### 4.7) Nurse-to-Request Matching and Pre-Flight Checks

The worker must know which nurse to book for a given request. This data comes from the control plane.

**Data flow:**

1. Booking tasks written to Firestore include the full matching context: `request_id`, `trust_id`, `ward`, `shift_date`, `shift_time`, `nurse_name`, `nurse_first_name`, `nurse_surname`, `nurse_id`.
2. The worker does not independently decide nurse assignments. It executes the assignment the control plane has specified.
3. Before attempting a booking, the worker runs pre-flight checks:

**Pre-flight check sequence:**

| Check | Source | Failure action |
| --- | --- | --- |
| Request still exists in unfilled queue | Portal DOM parse | Mark task `failed`, reason: `request_not_found` |
| Nurse is not already booked for overlapping shift | Control plane schedule data (cached at task creation) | Mark task `failed`, reason: `nurse_conflict` |
| Trust is not in `blocked` state (e.g., captcha active) | Worker internal state | Requeue task as `pending`, do not count as attempt |
| Rate limit budget allows another action | Worker rate limiter | Delay execution, do not count as attempt |
| Browser context is healthy and authenticated | Worker session state | Re-authenticate or mark trust `blocked` |

The conflict check against the nurse's existing schedule is performed at task creation time by the control plane (which has the authoritative schedule data) and included as a `conflicts_checked_at` timestamp on the task. If the task sits in `pending` for more than a configurable window (e.g., 5 minutes), the worker requests a re-validation from the control plane before executing.

### 4.8) Captcha Handling Workflow

Captcha is not bypassed. It is handled as an operational interruption with a defined state machine.

**Captcha state machine per trust:**

```
NORMAL → CAPTCHA_DETECTED → OPERATOR_NOTIFIED → [OPERATOR_RESOLVES | TIMEOUT]
                                                        ↓                ↓
                                                     NORMAL          TRUST_BLOCKED
```

**Detailed flow:**

1. Worker detects captcha during login or mid-session (via DOM element check for known captcha selectors).
2. Worker transitions trust state to `captcha_detected`.
3. Worker takes a screenshot of the current page and stores it (local filesystem or cloud storage).
4. Worker emits an alert via configured notification channel (webhook, email, or Slack).
5. Worker holds the browser context open with the captcha page visible. A configurable timeout starts (default: 5 minutes).
6. If an operator resolves the captcha within the timeout (via a remote browser session or VNC to the worker machine — see operational tooling), the worker detects page change, verifies session is authenticated, and transitions back to `NORMAL`.
7. If the timeout expires without resolution, the worker closes the context and marks all pending tasks for that trust as `blocked` with reason `captcha_timeout`.
8. Blocked trusts are not retried automatically. An operator must manually clear the blocked state via the admin UI or API.

**Operational tooling for captcha resolution:**
- Worker exposes a debug endpoint that streams a screenshot of the current browser page (or consider running a lightweight VNC/noVNC server for direct browser interaction).
- Alternative: worker can forward the captcha image to a designated Slack channel or web dashboard where an operator submits the solution, which the worker types into the browser.
- The specific mechanism will be finalized during M2 based on operator workflow preferences.

### 4.9) Google Sheets Reporting: Failure Resilience and Rate Limiting

**Rate limit reality:**
- Google Sheets API allows approximately 60 write requests per minute per project and 300 requests per minute for reads.
- During peak booking periods across multiple trusts, per-booking writes could exceed this.

**Buffered write strategy:**

1. Worker writes every booking outcome to a local write-ahead log (WAL) first — a JSON-lines file on the worker's filesystem.
2. A separate reporting sync loop reads the WAL and batch-appends rows to Google Sheets at a governed rate (max 50 rows per append, max 1 append per 2 seconds).
3. If the Sheets API returns a rate limit error (429), the sync loop backs off exponentially and retries.
4. If the Sheets API is unreachable for more than 10 minutes, the worker emits an alert but continues booking. The WAL accumulates and will be drained when Sheets becomes available.
5. On worker restart, the WAL is scanned for rows not yet confirmed written to Sheets, and the sync resumes.

**Booking outcome independence:**
- A booking is considered `succeeded` or `failed` based on the portal interaction, not on whether the Sheets write succeeded. Reporting failure is a P3 incident, not a booking failure.

**Schema:**
- See Section 9 for the required booking log fields.
- The Google Sheet is append-only. The worker never edits or deletes existing rows.
- A separate `_exceptions` sheet tab receives rows for `failed` and `blocked` outcomes with extended error detail.

### 4.10) Selector Versioning and Management

Portal UI changes are the primary long-term maintenance cost. The selector management strategy must minimize the blast radius of changes and allow updates without redeploying the worker.

**Selector set structure:**

```json
{
  "version": "allocate-v1.2",
  "created_at": "2026-01-15T00:00:00Z",
  "tested_in_training": true,
  "selectors": {
    "login_username_input": "#username",
    "login_password_input": "#password",
    "login_submit_button": "#loginBtn",
    "captcha_container": ".captcha-wrapper",
    "unfilled_queue_table": "#gridView .data-table",
    "unfilled_row": ".data-table tr.request-row",
    "cell_request_id": "td[data-col='requestId']",
    "cell_ward": "td[data-col='ward']",
    "cell_shift_date": "td[data-col='shiftDate']",
    "cell_shift_time": "td[data-col='shiftTime']",
    "cell_created": "td[data-col='created']",
    "right_click_target": "td[data-col='requestId']",
    "context_menu_book": ".context-menu .book-action",
    "popup_container": ".booking-popup",
    "staff_search_input": ".booking-popup input[name='staffSearch']",
    "staff_dropdown_item": ".autocomplete-list li",
    "book_confirm_button": ".booking-popup .btn-book",
    "success_indicator": ".booking-confirmed",
    "error_indicator": ".booking-error"
  }
}
```

Note: The selectors above are illustrative placeholders. Actual selectors will be determined during M3 by inspecting the training environment portal DOM.

**Update workflow:**

1. When a portal UI change is detected (via smoke test failure or client notification), create a new selector version in the training environment.
2. Run the worker's smoke test suite against training with the new selector version.
3. Once passing, store the new version in Firestore.
4. Update the trust config to reference the new `selector_version`.
5. The worker picks up the config change on its next poll cycle — no redeployment needed.

## 5) High-Level Data Flow (Updated)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONTROL PLANE                                │
│                                                                     │
│  Client populates schedule workspace                                │
│       ↓                                                             │
│  Control plane generates booking tasks (nurse + request + shift)    │
│       ↓                                                             │
│  Tasks written to Firestore `booking_tasks` collection              │
│       ↓                                                             │
│  Trust config provides portal URL, credentials ref, selectors,      │
│  rate limits                                                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    Firestore real-time listener
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                        BOOKING WORKER                               │
│                                                                     │
│  1. Receive pending task                                            │
│  2. Run pre-flight checks (conflicts, rate budget, session health)  │
│  3. Navigate browser context to trust portal                        │
│  4. Parse unfilled queue DOM via versioned selectors                │
│  5. Locate target request by Request ID                             │
│  6. Execute right-click → book → staff search → confirm             │
│  7. Detect outcome (success / failed / blocked)                     │
│  8. Write outcome to Firestore task record                          │
│  9. Append to local WAL for Sheets reporting                        │
│                                                                     │
│  Reporting sync loop:                                               │
│    WAL → batch append → Google Sheets (rate-governed)               │
│                                                                     │
│  Captcha detected:                                                  │
│    Pause → screenshot → alert operator → hold / timeout → blocked   │
└─────────────────────────────────────────────────────────────────────┘
```

## 6) Milestones and Acceptance Criteria

### M0: Documentation and Baseline Hardening

Goals:
- Land project docs and normalize setup/deploy instructions.
- Remove ambiguity between current vs target scope.
- Define the control-plane-drives-worker product relationship.

Acceptance criteria:
- `README.md` and `PROJECT_PLAN.md` are merged and reviewed.
- Local setup succeeds from clean machine following docs only.
- Sensitive values are scrubbed from docs and repository guidance.
- Trust configuration schema is documented and reviewed by stakeholders.

### M1: Control Plane Stabilization

Goals:
- Confirm API behavior, auth boundaries, and sheet state model are stable for worker integration.
- Add explicit config model for booking policy inputs.
- Implement trust configuration CRUD in admin UI and API.
- Add booking task generation from schedule workspace.

Acceptance criteria:
- Endpoint behavior documented and validated against runtime.
- Admin and client role boundaries pass integration tests.
- Control plane stores required booking policy fields per client/trust.
- Trust config CRUD endpoints exist and are validated.
- Booking task documents can be generated from schedule assignments and written to Firestore.
- Pre-flight conflict check runs at task creation time.

New endpoints (planned):

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

### M2: Worker Service Foundation

Goals:
- Create separate worker service runtime (DigitalOcean-aligned, UK-hosted).
- Implement browser lifecycle management with Playwright.
- Implement secure credential retrieval strategy and job orchestration skeleton.
- Implement trust-scoped browser context isolation.
- Implement rate limiter per trust.

Acceptance criteria:
- Worker can run in training environment with non-production credentials.
- Browser launches, creates contexts, authenticates against training portal.
- Job queue model is defined and implemented (pending, running, succeeded, failed, blocked).
- Worker respects rate limit profiles from trust config.
- Observability baseline exists: structured logs, health checks, failure counters, resource utilization reporting.
- Captcha detection fires and transitions trust to blocked state (alert delivery can be stubbed).

### M3: Allocate Interaction Engine

Goals:
- Implement portal DOM parsing with versioned selector sets.
- Implement booking mechanics according to verified workflow.
- Enforce deterministic selection and no-retry policy.
- Implement pre-flight check sequence.

Acceptance criteria:
- Worker can parse the unfilled queue and extract structured request data in training environment.
- Worker can execute end-to-end booking in training environment.
- Request selection follows earliest-created tie-break rule.
- Pre-flight checks (conflict, rate budget, session health) run before every booking attempt.
- No automatic retry occurs on explicit failed booking outcome.
- Captcha and portal blockers emit blocked status with actionable diagnostics.
- Selector sets are externalized and the worker loads them from config (not hardcoded).
- Selector smoke test suite exists and passes against training environment.

### M4: Reporting and Reconciliation

Goals:
- Deliver per-booking Google Sheets logging and exception reporting.
- Implement write-ahead log and buffered batch sync.
- Establish reconciliation process against portal outcomes.

Acceptance criteria:
- Every booking attempt writes to the local WAL immediately.
- Reporting sync loop batch-appends rows to Google Sheets within rate limits.
- Sheets write failures do not affect booking outcome classification.
- WAL drain resumes correctly after worker restart.
- Required fields present: Request ID, ward, date, shift time, nurse name/ID, actor, timestamp, outcome.
- Exception sheet tab includes failed and blocked outcomes with reason codes.
- Reconciliation process documented: how to compare Sheets log against portal filled list.

### M5: Pilot and Go-Live Operations

Goals:
- Run pilot on limited trust/ward scope.
- Finalize runbook, support model, and change-management workflow.
- Validate captcha handling workflow end-to-end with operators.
- Validate selector update workflow end-to-end.

Acceptance criteria:
- Pilot completion report meets agreed reliability and latency thresholds.
- Runbook includes on-call actions, incident classes, rollback procedure, captcha escalation SOP, and selector update SOP.
- Client sign-off received for production expansion gate.
- Operator training completed for captcha resolution and manual fallback.

## 7) Test Strategy

### Unit Tests

- Booking rule evaluator (request priority, eligibility gates, no-retry enforcement).
- API auth guards and role checks.
- Data transformation and reporting payload builders.
- DOM parser against static HTML fixtures representing known portal states.
- Pre-flight check logic (conflict detection, rate budget, session validation).
- Selector set loader and validation.
- WAL write and read logic.

### Integration Tests

- Control plane API with Firestore test project.
- Trust config CRUD and booking task generation.
- Worker job state transitions and failure handling.
- Google Sheets write path with service account test credentials (including rate limit simulation).
- Browser context creation and teardown lifecycle.
- Credential retrieval from secure store.

### End-to-End Tests

- Training environment flow from schedule assignment → task generation → worker execution → Sheets reporting row.
- Negative scenarios:
  - Captcha encountered → blocked state → operator alert.
  - Stale request already filled → graceful failure, no retry.
  - Permission denied.
  - Rate-limit response → backoff and delay.
  - Selector mismatch → trust halted, alert fired.
  - Nurse conflict detected at pre-flight → task failed before portal interaction.
  - Google Sheets API unavailable → WAL accumulates, bookings continue.

### Operational Readiness Tests

- Health check endpoints and synthetic task execution.
- Alert triggering and incident notification verification.
- Disaster recovery drill for worker restart and queue resumption (WAL drain verification).
- Selector update drill: simulate portal change, deploy new selectors, verify worker picks them up without redeployment.
- Captcha resolution drill: simulate captcha, verify operator notification, verify session hold and resume.

## 8) Risk Register and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Captcha appears unpredictably | Worker cannot complete booking for trust | Classify as blocked, alert operator, hold session for manual resolution with timeout, maintain manual fallback SOP |
| Portal UI changes every 6-12 months | Selector breakage and failed actions | Versioned selector sets loaded from config, smoke tests in training environment, selector update SOP, change calendar with client |
| Race windows are very tight | Lost booking opportunities | Optimize worker latency path, pre-flight checks minimize wasted attempts, event-driven task trigger for fastest response |
| Retry prohibition | Lower recovery flexibility | Pre-flight validation catches predictable failures before portal interaction, immediate operator alerts for unexpected failures |
| Rate-limit protections | Temporary lockout or throttling | Trust-scoped rate limiter with configurable profiles, cooldown enforcement, budget tracking per action type |
| Permissions drift | Booking attempts fail post-release | Pre-flight permission checks, periodic credential validation, alert on auth failures |
| Data location requirements | Compliance/performance issues | Keep runtime and storage in UK-compliant infrastructure, validate geo-restriction compliance per trust config |
| Google Sheets rate limits exceeded | Reporting delay | Write-ahead log buffers locally, batch sync with exponential backoff, reporting delay does not affect booking operations |
| Browser memory pressure | Worker instability under multiple trusts | Resource budgeting per droplet, max concurrent contexts limit, idle context teardown, horizontal scaling to additional workers |
| Stale nurse schedule data | Worker attempts booking with conflicted nurse | Conflict check at task creation, re-validation if task age exceeds threshold, immediate failure if portal rejects |
| Worker crash mid-booking | Orphaned task in running state | Heartbeat/timeout mechanism: tasks in `running` state without heartbeat update for > 60 seconds are reset to `pending` by a sweeper process |

## 9) Interfaces and Data Contracts

No code changes in this document; these are planned interfaces to guide implementation.

### Booking Task Document (Firestore `booking_tasks` collection)

```json
{
  "task_id": "uuid",
  "trust_id": "trust_abc",
  "request_id": "REQ-12345",
  "ward": "Ward 7A",
  "shift_date": "2026-03-15",
  "shift_start": "07:00",
  "shift_end": "15:00",
  "nurse_name": "Smith, Jane",
  "nurse_first_name": "Jane",
  "nurse_surname": "Smith",
  "nurse_id": "NS-001",
  "status": "pending",
  "created_at": "2026-03-14T18:00:00Z",
  "conflicts_checked_at": "2026-03-14T18:00:00Z",
  "started_at": null,
  "completed_at": null,
  "outcome": null,
  "error_code": null,
  "error_message": null,
  "worker_id": null,
  "attempt_count": 0
}
```

### Required Booking Log Fields (Google Sheets)

- `request_id`
- `trust_id`
- `ward`
- `shift_date`
- `shift_time`
- `nurse_name`
- `nurse_id`
- `booked_by`
- `timestamp_utc`
- `outcome` (`success`, `failed`, `blocked`)
- `error_code` (nullable)
- `error_message` (nullable)

### Worker Task States

- `pending` — task created, awaiting worker pickup.
- `running` — worker has claimed the task and is executing.
- `succeeded` — booking confirmed in portal.
- `failed` — booking attempted but rejected (no retry).
- `blocked` — booking could not be attempted (captcha, trust blocked, selector mismatch).
- `cancelled` — task cancelled by operator before execution.

### Trust Configuration Schema

See Section 4.3 for the full field listing.

### Selector Set Schema

See Section 4.10 for the full structure.

## 10) Dependencies and Decision Defaults

- Audience: mixed technical and operational stakeholders.
- Documentation location: repo root for immediate visibility.
- Production hosting baseline: DigitalOcean App Platform and UK-aligned runtime choices.
- Netlify remains secondary compatibility path for the control plane only (worker is not Netlify-compatible).
- Worker implementation is a separate Node.js service from the current web process.
- Worker uses Playwright for browser automation (headless Chromium).
- Existing API routes remain unchanged during documentation phase:
  - `/auth/*`
  - `/admin-api/*`
  - `/sheets/*`
  - `/nurses/*`
  - `/schedule/*`
  - `/contact`
- New routes for trust config, booking tasks, and worker status will be added in M1.
- Google Sheets integration uses a service account with Sheets API v4.
- Credential storage for Allocate portal logins uses Firestore with field-level encryption (or a secret manager if available on DigitalOcean). Credentials are never logged or included in task documents.

## 11) Open Questions Requiring Client Input

These items are referenced in the discovery checklist as "client will confirm" and must be resolved before the relevant milestone.

| Question | Needed by | Impact if unresolved |
| --- | --- | --- |
| Full list of required views beyond RN Future | M3 | Worker may miss bookable requests in alternative views |
| Confirmed shift patterns and exact times per trust | M1 | Cannot generate accurate booking tasks |
| VPN/network access requirements per trust | M2 | Worker may not be able to reach portal |
| Named accounts vs shared credentials per trust | M2 | Affects credential management and audit trail |
| Competency/skill gates per ward | M3 | Worker may attempt bookings that will be rejected |
| Rest-period rules enforced by portal | M3 | Pre-flight checks may be incomplete |
| Approval workflow presence per trust | M3 | Booking may not be immediate; state machine may need `pending_approval` state |
| Operator preference for captcha resolution mechanism | M2 | Affects whether to build VNC, screenshot-to-Slack, or web dashboard approach |
| Reconciliation export format from Allocate | M4 | Cannot automate reconciliation without knowing the export structure |
