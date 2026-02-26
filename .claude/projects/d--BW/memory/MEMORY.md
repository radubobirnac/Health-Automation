# Project Memory — Health Roster Automation (d:\BW)

## Project Type
React + Vite SPA. NHS shift booking automation portal for UK nurses.
Backend: Node.js (server.js). Auth via JWT stored in localStorage as `hr_token`.

## Key File Paths
- Entry: `src/main.jsx` → `src/App.jsx`
- Layout (header/footer/nav): `src/components/Layout.jsx`
- Pages: `src/pages/` — Home, About, Contact, Security, Login, Signup, Dashboard, TrustsData, AdminLogin, AdminCreateUser, NotFound
- Styles: `src/styles.css` (single flat CSS file, ~1750 lines)
- Content data: `src/content/socialProof.js`, `src/content/securityTrust.js`
- Auth utility: `src/utils/api.js` (authedFetch)
- Dashboard components: `src/components/SchedulerGrid.jsx`, `SheetGrid.jsx`, `CalendarView.jsx`

## Rules (from instruction.md)
- DO NOT change client workspace functionality (Dashboard logic, SchedulerGrid, SheetGrid)
- CAN change UI/design freely
- Motto: more user-friendly, good design output

## Design System (styles.css variables)
- `--blue-900 / --blue-700 / --blue-500` — primary palette
- `--green-500 / --green-100` — accent/secondary
- `--gray-100 / --gray-300 / --gray-600 / --gray-700` — neutrals
- `--shadow` / `--shadow-sm` — box shadows
- Dark theme: `[data-theme="dark"]` on `:root`, stored in `localStorage` as `hr_theme`

## Defects Document
See `defects.md` in project root — 22 defects catalogued with severity.

## Changes Made (2026-02-26)
- Created `defects.md` with 22 documented defects (DEF-001 to DEF-022)
- Fixed DEF-001: Active nav link highlighting via `nav-active` CSS class + `useLocation()`
- Fixed DEF-002: Replaced literal "v" scroll cue with chevron SVG
- Fixed DEF-004: Removed empty `<p>` tag in Contact.jsx
- Fixed DEF-005: Added `form-status is-success/is-error` classes to Contact form status
- Fixed DEF-008: Proof strip now renders both `stat.value` and `stat.label`
- Fixed DEF-009: Hero padding increased from 12px to 72px top
- Fixed DEF-010: Video placeholders now have play icon + descriptive label
- Fixed DEF-016: Security FAQ questions changed from `<h2>` to `<h3>`
- Fixed DEF-018: Defined `--gray-700` in both light and dark `:root`
- Fixed DEF-019: Added skip-to-content link + `id="main-content"` on `<main>`
- Fixed DEF-020: Created `NotFound.jsx` + added `<Route path="*">` in App.jsx
- Improved footer: dark background, improved typography, responsive 3-col grid
- Added `form-status` styled success/error feedback classes
- Added `--shadow-sm`, `--radius-*` design tokens
- Added `video-placeholder-inner`, `video-play-btn`, `video-placeholder-label` for video sections
- Added `not-found-section`, `not-found-code`, `not-found-actions` for 404 page

## Known Remaining Defects (not yet fixed)
- DEF-003: No mobile hamburger menu
- DEF-006: Personal Gmail in contact details
- DEF-007: US phone number for UK service
- DEF-011: Generic log column names ("Column A"…)
- DEF-012: Hardcoded inline style on Delete Sheet tab
- DEF-013: No loading skeleton in Dashboard
- DEF-014: No pagination on TrustsData table
- DEF-015: `white-space: nowrap` on all trusts table cells
- DEF-017: No accordion on Security FAQ
- DEF-021: Signup route not linked in nav
- DEF-022: Dark mode contrast on form cards
