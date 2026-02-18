# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint (flat config, ESLint 9+)
npm run preview    # Preview production build locally
npm run verify     # Preflight env check + build
```

No test framework is configured.

## Architecture

**Stack:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + Supabase (auth, PostgreSQL, storage) + Sonner (toasts)

### Project Structure

```
src/
├── App.tsx                    # App shell (top nav, state, handlers, routing)
├── main.tsx                   # Entry point + Toaster
├── types.ts                   # Shared types (Contact, Application, Page, etc.)
├── components/ui/
│   ├── Card.tsx               # Reusable card wrapper
│   ├── Modal.tsx              # Overlay modal
│   └── AuthIllustration.tsx   # Immersive particle field + living canvas for auth
├── lib/
│   ├── supabase.ts            # Supabase client + env check
│   ├── csvHelper.ts           # CSV parsing + field inference
│   └── utils.ts               # initialsFromName, todayISODate, formatDateLabel
└── pages/
    ├── AuthPage.tsx            # Sign in / sign up
    ├── PasswordRecoveryPage.tsx
    ├── ContactsPage.tsx        # Network listing + add contact
    ├── ContactDetailsPage.tsx  # Contact detail + meeting notes
    ├── ApplicationsPage.tsx    # Job application tracker
    ├── SettingsPage.tsx        # Profile, account, CSV import
    ├── OnboardingPage.tsx      # Post-signup stepper
    ├── OutreachEmailsPage.tsx  # Email composer + templates
    └── WatchlistPage.tsx       # Network watchlist targets
```

### Key Patterns

- **App.tsx** holds all state and Supabase handlers. Page components are presentational and receive data/callbacks via props.
- **WatchlistPage** and **OutreachEmailsPage** are exceptions — they manage their own state internally (OutreachEmailsPage receives contacts via props but handles compose/templates locally).
- **Top nav** (no sidebar) with dropdown for Network/Watchlist, plus Outreach, Applications, Settings.
- **State-based routing** via a `page` variable in App.tsx (no router library).
- Use `toast.error()` / `toast.success()` / `toast.info()` from sonner — never `alert()`.

### Data Layer

- Direct Supabase client calls from components/handlers
- All state via `useState` hooks (no Redux/Zustand/Context)
- Row-Level Security (RLS) on all tables scoped to `auth.uid() = owner_id`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Missing env vars show an error UI (not a blank screen)

### Data Models (src/types.ts)

- **Contact** — first_name, last_name, company, title, email, phone, linkedin_url, status
- **ContactMeeting** — contact_id, meeting_date, title, notes
- **Application** — company, link, date_applied, status, optional contact_id FK
- **Profile** — full_name, my_linkedin_url, resume_url, avatar_url, resume_text, phone, career_interests
- **WatchlistTarget** — person_name, company, role, status, next_action_date, notes
- **ScheduledOutreach** — contact_id (FK), channel (sms/linkedin/email), subject, message, scheduled_at, status (scheduled/sent/skipped)

### Supabase Tables

Full schema in `docs/schema.sql` (safe to re-run). Tables: `contacts`, `contact_meetings`, `applications`, `profiles`, `watchlist_targets`, `scheduled_outreach`. Storage bucket `resumes` (public).

### CSV Import (src/lib/csvHelper.ts)

Custom CSV parser with smart field inference: auto-detects headers, normalizes column names, infers mapping via regex and keyword heuristics. Deduplicates by email/LinkedIn/name+company. Batch inserts in 200-row chunks.

## Styling

### Design System — "Bioluminescent Depth"

Forced dark theme with an opinionated, product-driven identity. Not generic dark SaaS — has a distinct point of view.

**Color tokens** (defined in `@theme` in `index.css`):
- Depth layers: `depth-0` (#081418) → `depth-1` (#0B1F2A) → `depth-2` (#0F2535) → `depth-3` (#132D40)
- Single accent: `glow` (#00E5FF) — the ONLY color used for attention/CTAs
- Supporting (decorative only): `glow-soft`, `glow-mint`, `glow-purple`, `glow-blue`
- Semantic: `danger` (#FF6B6B)

**Design rules:**
- **No traditional cards** — borderless depth sections via `bg-depth-1/60`, no borders, no `backdrop-blur`
- **Single accent system** — only cyan (`glow`) for primary actions and badges. No rainbow status indicators.
- **Solid cyan primary buttons** — `bg-glow/90 text-depth-0` with glow shadow. Never gradient buttons.
- **Ghost secondary buttons** — `bg-white/[0.04]` with hover to `bg-white/[0.08]`
- **Monospaced data** — use `.font-data` class on dates, emails, phone numbers, counts
- **Human empty states** — every empty state has a short, personality-driven line
- **Living canvas** — animated gradient mesh background (`living-canvas` class, 90s cycle)
- **Auth as "The Threshold"** — immersive particle field, no card container, centered form floating in space
- **Page transitions** — `page-enter` class wraps all routed content (fade + 6px vertical shift)
- **Keyboard whisper bar** — `.whisper-bar` class for subtle shortcut hints
- **Recency luminance** — recent items get slight `bg-white/[0.01]` highlight
- **`prefers-reduced-motion`** — all animations disabled when user prefers reduced motion

**Input styling:** `bg-white/[0.04] border-white/[0.06]` with `focus:border-glow/30 focus:ring-glow/15`

Responsive with `md:` / `lg:` breakpoints. Mobile hamburger menu in top nav. Forward-weighted layout (1/3 input + 2/3 results on `lg:grid-cols-3`).

## Deployment

Configured for Netlify via `netlify.toml`. SPA routing handled by catch-all redirect to `/index.html`.

## Path Alias

`@` maps to `./src` (configured in both `vite.config.ts` and `tsconfig.app.json`).

## Architectural Decisions

Notable architectural decisions:
- D-006: New features go in feature folders, not App.tsx
- D-009: Top nav only, no sidebar
- D-010: Mobile-friendly is required
- D-011: Contact-centric data model
- D-014: Outreach emails are AI draft + copy-to-clipboard (MVP)

## Completed Features

- **Resume Adjuster** — Paste a job description, get AI-powered keyword suggestions via Ollama (lives in SettingsPage). Resume text parsed from PDF and stored in `profiles.resume_text`.
- **Sign In / Sign Up Flow Separation** — Auth page has tab-based mode toggle. Sign-up collects name, phone, LinkedIn, career interests, and optional resume upfront. Pending data stored in `localStorage` key `coffee_pending_signup`, applied on first profile load, skipping onboarding when name is provided. Prerequisites: `profiles.phone` and `profiles.career_interests` columns.

## Planned Features
