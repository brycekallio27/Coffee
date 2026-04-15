# Coffee — Tasks

_Networking + job search app. React 19 / TypeScript / Supabase / Tailwind._
_For full project context, read CLAUDE.md in this folder before executing any task._

---

## Active

---

## Waiting On

- [ ] **LinkedIn data enrichment** - Blocked on access to LinkedIn API or a scraping-safe alternative. Research options (Proxycurl, PhantomBuster, RapidAPI) and document trade-offs in `docs/linkedin-enrichment.md`. No code until approach is decided.

---

## Someday

- [ ] **Email open tracking** - Track when outreach emails are opened using a 1x1 pixel tracker routed through a Supabase Edge Function. Update `scheduled_outreach.status` on open.
- [ ] **Browser extension** - Chrome extension that adds a "Save to Coffee" button on LinkedIn profiles, pre-filling a new contact form.
- [ ] **AI job description scorer** - Paste a JD, get a match score against the resume stored in `profiles.resume_text` along with keyword gap analysis.
- [ ] **Calendar integration** - Connect Google Calendar so scheduled outreach and follow-ups appear as calendar events.

---

## Done

- [x] ~~**Analytics Dashboard page**~~ - Built new `/analytics` page showing: applications by status (bar chart), contacts added over time (line chart), outreach by channel (progress bars), and top 10 companies applied to. Uses Recharts charts with Bioluminescent Depth design system. Upgraded recharts to 2.15.0 for React 19 compatibility. Wired into App.tsx routing and nav. (2026-03-12)

- [x] ~~**Application Kanban view**~~ - Added view toggle on ApplicationsPage to switch between table and Kanban board. Kanban columns: Bookmarked → Applied → Interview → Offer → Rejected. Click-to-move pattern with status dropdown on each card. Updates via Supabase with toast notifications. (2026-03-12)

- [x] ~~**AI contact summary card**~~ - Added collapsible "AI Summary" section to ContactDetailsPage. On expand, calls Supabase Edge Function `summarize-contact` with contact data and meeting notes. Function uses Anthropic API (Claude 3.5 Sonnet) to generate 2-3 sentence summary. Displays in depth-2 card with cyan left border. Includes loading spinner and error handling. (2026-03-12)

- [x] ~~**Pin requirements and audit dependencies**~~ - Run `npm audit` in the project root. Update `package.json` to pin all `dependencies` to their current exact versions. Document any high/critical vulnerabilities in a `docs/security.md` file. (2026-03-12)

- [x] ~~**Mobile PWA support**~~ - Add `manifest.json` (app name: Coffee, theme color: `#00E5FF`, background: `#081418`) and a minimal service worker for offline caching of the app shell. Register in `main.tsx`. Goal: installable from mobile browser. (2026-03-12)

- [x] ~~**Stale contact follow-up alerts**~~ - On the ContactsPage, highlight any contact whose last `contact_meeting` date is 30+ days ago with a subtle badge. Add a "Follow Up" quick-action button that pre-fills an OutreachEmail draft. Use the existing `ContactMeeting` data model and `todayISODate` util. (2026-03-12)

