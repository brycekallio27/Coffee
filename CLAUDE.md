# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint (flat config, ESLint 9+)
npm run preview    # Preview production build locally
```

No test framework is configured.

## Architecture

**Stack:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + Supabase (auth, PostgreSQL, storage)

**The entire app lives in `src/App.tsx` (~2500 lines).** This single monolithic component contains all types, state, handlers, utilities, and UI rendering. There is no component library or page-level splitting.

### Routing

Client-side routing via a `page` state variable (not a router library). Pages: `"contacts"`, `"contact_details"`, `"applications"`, `"settings"`.

### Data Layer

- Direct Supabase client calls (`src/lib/supabase.ts`) from component event handlers
- All state managed via `useState` hooks (no Redux/Zustand/Context)
- Row-Level Security (RLS) on all tables scoped to `auth.uid() = owner_id`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public keys, security via RLS)

### Data Models (all in App.tsx)

- **Contact** — first_name, last_name, company, title, email, phone, linkedin_url, status
- **ContactMeeting** — contact_id, meeting_date, title, notes
- **Application** — company, link, date_applied, status (Applied/Interviewing/Accepted/Rejected), optional contact_id FK
- **Profile** — full_name, my_linkedin_url, resume_url, avatar_url (PK = auth user id)

### CSV Import System (App.tsx ~lines 413-690)

Custom CSV parser with smart field inference: auto-detects headers, normalizes column names, infers field mapping via regex (email, phone, LinkedIn URL) and keyword heuristics (company/title hints). Deduplicates by email/LinkedIn/name+company. Batch inserts in 200-row chunks.

### Supabase Tables

SQL creation scripts are documented in App.tsx comments (lines ~10-65). Tables: `contacts`, `contact_meetings`, `applications`, `profiles`. Storage bucket `resumes` (public) for resume uploads.

## Styling

Forced dark theme. Background `#050b14`, cards `#0b1420`, accent gradient `from-cyan-300 via-sky-500 to-indigo-500`. Glassmorphism with `backdrop-blur-xl` and `bg-white/[0.06]`. Responsive with `lg:` breakpoints; 288px sidebar on desktop, hamburger menu on mobile.

## Path Alias

`@` maps to `./src` (configured in both `vite.config.ts` and `tsconfig.app.json`).
