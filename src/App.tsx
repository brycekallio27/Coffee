import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/* =============================== IMPORTANT ===============================
This update adds a Contact Details page with per-meeting notes (mini folders by date).

To persist meetings/notes in Supabase, create this table (recommended):

-- 1) Table
create table if not exists public.contact_meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  meeting_date date not null,
  title text null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_meetings_contact_id on public.contact_meetings(contact_id);
create index if not exists idx_contact_meetings_owner_id on public.contact_meetings(owner_id);

-- 2) RLS (typical)
alter table public.contact_meetings enable row level security;

create policy "meetings_select_own"
on public.contact_meetings for select
using (auth.uid() = owner_id);

create policy "meetings_insert_own"
on public.contact_meetings for insert
with check (auth.uid() = owner_id);

create policy "meetings_update_own"
on public.contact_meetings for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "meetings_delete_own"
on public.contact_meetings for delete
using (auth.uid() = owner_id);

-- 3) Applications Table
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  link text,
  date_applied date,
  status text not null default 'Applied',
  created_at timestamptz not null default now()
);

create index if not exists idx_applications_owner_id on public.applications(owner_id);

alter table public.applications enable row level security;

create policy "applications_select_own" on public.applications for select using (auth.uid() = owner_id);
create policy "applications_insert_own" on public.applications for insert with check (auth.uid() = owner_id);
create policy "applications_update_own" on public.applications for update using (auth.uid() = owner_id);
create policy "applications_delete_own" on public.applications for delete using (auth.uid() = owner_id);

-- 4) Link Applications to Contacts
alter table public.applications add column if not exists contact_id uuid references public.contacts(id) on delete set null;
create index if not exists idx_applications_contact_id on public.applications(contact_id);
========================================================================= */

/* =============================== Types =============================== */

type Contact = {
  id: string;
  owner_id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null; // shown as "Job Title"
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  status: string; // kept for DB compatibility; no longer shown in UI
  created_at: string;
};

type ContactMeeting = {
  id: string;
  owner_id: string;
  contact_id: string;
  meeting_date: string; // YYYY-MM-DD
  title: string | null;
  notes: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  my_linkedin_url: string | null;
  resume_url: string | null;
  avatar_url: string | null;
};

type Application = {
  id: string;
  owner_id: string;
  company: string;
  link: string | null;
  date_applied: string | null; // YYYY-MM-DD
  status: string;
  contact_id: string | null;
  created_at: string;
};

type Page = "contacts" | "settings" | "contact_details" | "applications";

/* =============================== UI Helpers =============================== */

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0b1420]/95 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AuthIllustration() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#050b14]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.35),transparent_44%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.25),transparent_50%),radial-gradient(circle_at_25%_85%,rgba(168,85,247,0.28),transparent_50%),radial-gradient(circle_at_85%_85%,rgba(16,185,129,0.18),transparent_45%)]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.95]"
        viewBox="0 0 1400 820"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mugGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(34,211,238,0.35)" />
            <stop offset="0.55" stopColor="rgba(99,102,241,0.30)" />
            <stop offset="1" stopColor="rgba(168,85,247,0.22)" />
          </linearGradient>

          <linearGradient id="suitGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(30,58,138,0.95)" />
            <stop offset="1" stopColor="rgba(15,23,42,0.95)" />
          </linearGradient>

          <linearGradient id="tieGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(56,189,248,0.95)" />
            <stop offset="1" stopColor="rgba(34,211,238,0.70)" />
          </linearGradient>

          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.65 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="950" cy="735" rx="520" ry="85" fill="rgba(255,255,255,0.06)" />
        <ellipse cx="950" cy="740" rx="420" ry="55" fill="rgba(34,211,238,0.06)" />

        <g filter="url(#softGlow)">
          <path
            d="M840 190
               C840 150 875 120 915 120
               L1125 120
               C1165 120 1200 150 1200 190
               L1200 600
               C1200 660 1155 705 1095 705
               L945 705
               C885 705 840 660 840 600
               Z"
            fill="url(#mugGrad)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />

          <path
            d="M860 175
               C860 150 882 130 910 130
               L1130 130
               C1158 130 1180 150 1180 175
               L1180 205
               C1180 230 1158 250 1130 250
               L910 250
               C882 250 860 230 860 205
               Z"
            fill="rgba(255,255,255,0.07)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />

          <path
            d="M1200 270
               C1290 270 1335 335 1335 410
               C1335 485 1290 550 1200 550"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M1200 305
               C1265 305 1300 350 1300 410
               C1300 470 1265 515 1200 515"
            fill="none"
            stroke="rgba(5,11,20,0.55)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          <text
            x="1020"
            y="355"
            textAnchor="middle"
            fontFamily="ui-sans-serif, system-ui, -apple-system"
            fontSize="64"
            fontWeight="800"
            fill="rgba(255,255,255,0.88)"
          >
            Coffee?
          </text>

          <path
            d="M980 705
               L980 585
               C980 560 1000 540 1025 540
               C1050 540 1070 560 1070 585
               L1070 705"
            fill="rgba(5,11,20,0.55)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />
          <circle cx="1060" cy="625" r="5" fill="rgba(56,189,248,0.9)" />
        </g>

        <g transform="translate(560,470)" filter="url(#softGlow)">
          <ellipse cx="140" cy="250" rx="110" ry="22" fill="rgba(0,0,0,0.35)" />

          <path
            d="M120 160 C85 205 80 235 95 260 C115 292 150 290 165 258 C178 230 165 195 150 175 Z"
            fill="rgba(15,23,42,0.9)"
          />
          <path
            d="M185 165 C210 210 225 240 210 265 C192 295 160 295 150 268 C140 240 150 205 165 180 Z"
            fill="rgba(15,23,42,0.85)"
          />

          <path d="M85 262 C70 275 80 292 105 292 C128 292 133 276 120 265 Z" fill="rgba(2,6,23,0.95)" />
          <path d="M195 268 C180 280 190 297 216 297 C238 297 244 281 230 271 Z" fill="rgba(2,6,23,0.95)" />

          <path
            d="M105 85
               C110 55 135 40 165 40
               C195 40 220 55 225 85
               L245 170
               C250 195 230 210 205 210
               L125 210
               C100 210 80 195 85 170
               Z"
            fill="url(#suitGrad)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />

          <path
            d="M138 78
               C145 62 155 55 165 55
               C175 55 185 62 192 78
               L188 150
               L165 168
               L142 150
               Z"
            fill="rgba(255,255,255,0.85)"
            opacity="0.9"
          />

          <path d="M165 75 L183 110 L165 205 L147 110 Z" fill="url(#tieGrad)" />

          <path
            d="M100 100 C70 120 55 145 62 165 C70 187 95 184 110 165 C120 150 118 125 125 112 Z"
            fill="url(#suitGrad)"
          />
          <path
            d="M230 105 C260 120 285 150 276 175 C266 202 240 190 225 170 C212 152 214 130 205 114 Z"
            fill="url(#suitGrad)"
          />

          <circle cx="165" cy="28" r="32" fill="rgba(255,224,189,0.95)" />

          <path
            d="M133 30
               C130 5 146 -10 165 -10
               C184 -10 200 5 197 30
               C192 18 183 10 165 10
               C147 10 138 18 133 30 Z"
            fill="rgba(92,52,35,0.95)"
          />
          <path
            d="M133 30
               C140 20 150 15 165 15
               C180 15 190 20 197 30
               C195 45 186 50 175 50
               C172 42 169 38 165 38
               C161 38 158 42 155 50
               C144 50 135 45 133 30 Z"
            fill="rgba(92,52,35,0.95)"
            opacity="0.95"
          />

          <circle cx="154" cy="26" r="3" fill="rgba(15,23,42,0.8)" />
          <circle cx="176" cy="26" r="3" fill="rgba(15,23,42,0.8)" />
          <path
            d="M152 38 C158 46 172 46 178 38"
            fill="none"
            stroke="rgba(15,23,42,0.65)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        <rect x="0" y="0" width="1400" height="820" fill="rgba(5,11,20,0.20)" />
      </svg>
    </div>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* =============================== CSV Import Helpers =============================== */

type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") continue;
      row.push(cell.trim());
      cell = "";

      if (ch === "\n" || ch === "\r") {
        const nonEmpty = row.some((c) => String(c ?? "").trim() !== "");
        if (nonEmpty) rows.push(row);
        row = [];
      }
      continue;
    }
    cell += ch;
  }

  row.push(cell.trim());
  if (row.some((c) => String(c ?? "").trim() !== "")) rows.push(row);

  if (rows.length === 0) return { headers: [], rows: [] };

  const first = rows[0];
  const firstJoined = first.join(" | ").toLowerCase();

  const looksLikeHeader =
    !firstJoined.includes("@") &&
    !/linkedin\.com\/(in|company|pub)\//.test(firstJoined) &&
    !/(\+?1[\s\-\.]?)?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/.test(firstJoined) &&
    first.filter(Boolean).length >= Math.max(2, Math.floor(first.length * 0.5));

  const headers = looksLikeHeader
    ? first.map((h, idx) => (String(h ?? "").trim() ? String(h).trim() : `_${idx + 1}`))
    : first.map((_h, idx) => `_${idx + 1}`);

  const dataRows = looksLikeHeader ? rows.slice(1) : rows;

  const objRows: Record<string, string>[] = dataRows.map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, idx) => {
      o[h] = String(r[idx] ?? "").trim();
    });
    return o;
  });

  return { headers, rows: objRows };
}

function normHeader(h: string) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(/[\s\-_]+/g, "_")
    .replaceAll(/[^\w]/g, "");
}

function isEmail(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isPhone(v: any) {
  const s = String(v ?? "").trim();
  return /(\+?1[\s\-\.]?)?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/.test(s);
}

function isLinkedInUrl(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return /linkedin\.com\/(in|company|pub)\//.test(s) || /^in\/[a-z0-9\-_%.]+/i.test(s);
}

function cleanLinkedIn(v: any): string | null {
  let s = String(v ?? "").trim();
  if (!s) return null;
  if (/^in\//i.test(s)) s = `https://www.linkedin.com/${s}`;
  if (!/^https?:\/\//i.test(s) && s.toLowerCase().includes("linkedin.com/")) s = `https://${s}`;
  return isLinkedInUrl(s) ? s : null;
}

function cleanPhone(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.replaceAll(/\s+/g, " ");
}

function looksLikeName(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  if (isEmail(s) || isPhone(s) || isLinkedInUrl(s)) return false;
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  if (s.length > 50) return false;
  const l = s.toLowerCase();
  if (/(llc|inc|corp|capital|partners|group|bank|university)/.test(l)) return false;
  return true;
}

const TITLE_HINTS = [
  "analyst",
  "associate",
  "intern",
  "partner",
  "principal",
  "vp",
  "vice president",
  "director",
  "manager",
  "founder",
  "cofounder",
  "ceo",
  "cfo",
  "cio",
  "cto",
  "engineer",
  "consultant",
  "recruiter",
  "advisor",
  "student",
  "wealth",
  "private banker",
  "investment",
  "portfolio",
];

function looksLikeTitle(v: any) {
  const s = String(v ?? "").trim();
  const l = s.toLowerCase();
  if (!s) return false;
  if (isEmail(s) || isPhone(s) || isLinkedInUrl(s)) return false;
  if (s.length > 80) return false;
  const words = s.split(/\s+/).filter(Boolean);
  const keyword = TITLE_HINTS.some((k) => l.includes(k));
  const plausibleWords = words.length >= 1 && words.length <= 6;
  return keyword || plausibleWords;
}

const COMPANY_HINTS = [
  "capital",
  "partners",
  "group",
  "holdings",
  "management",
  "advisors",
  "bank",
  "llc",
  "inc",
  "corp",
  "ltd",
  "co",
  "company",
  "university",
];

function looksLikeCompany(v: any) {
  const s = String(v ?? "").trim();
  const l = s.toLowerCase();
  if (!s) return false;
  if (isEmail(s) || isPhone(s) || isLinkedInUrl(s)) return false;
  if (looksLikeName(s)) return false;
  if (s.length > 90) return false;
  const words = s.split(/\s+/).filter(Boolean);
  const keyword = COMPANY_HINTS.some((k) => l.includes(k));
  return keyword || words.length >= 2;
}

function inferByHeader(headers: string[], candidates: string[]) {
  const normalized = headers.map((h) => ({ raw: h, n: normHeader(h) }));
  for (const cand of candidates) {
    const c = normHeader(cand);
    const found = normalized.find((h) => h.n === c || h.n.includes(c) || c.includes(h.n));
    if (found) return found.raw;
  }
  return null;
}

function inferByContent(headers: string[], rows: Record<string, string>[], predicate: (v: any) => boolean) {
  const scores: Record<string, number> = {};
  for (const h of headers) scores[h] = 0;

  const sample = rows.slice(0, Math.min(120, rows.length));
  for (const r of sample) {
    for (const h of headers) {
      if (predicate(r[h])) scores[h] += 1;
    }
  }

  let best: string | null = null;
  let bestScore = 0;
  for (const h of headers) {
    if (scores[h] > bestScore) {
      bestScore = scores[h];
      best = h;
    }
  }

  return bestScore >= Math.max(2, Math.floor(sample.length * 0.12)) ? best : null;
}

type FieldMap = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  company?: string;
  title?: string;
  status?: string;
};

function inferFieldMap(headers: string[], rows: Record<string, string>[]): FieldMap {
  const map: FieldMap = {};

  map.email = inferByHeader(headers, ["email", "email_address", "e_mail", "mail"]) ?? undefined;
  map.phone = inferByHeader(headers, ["phone", "phone_number", "mobile", "cell"]) ?? undefined;
  map.linkedin_url =
    inferByHeader(headers, ["linkedin", "linkedin_url", "linkedinprofile", "profile_url"]) ?? undefined;

  map.company = inferByHeader(headers, ["company", "employer", "organization", "org", "firm"]) ?? undefined;
  map.title = inferByHeader(headers, ["title", "job_title", "role", "position"]) ?? undefined;
  map.status = inferByHeader(headers, ["status", "stage"]) ?? undefined;

  map.first_name = inferByHeader(headers, ["first", "first_name", "fname"]) ?? undefined;
  map.last_name = inferByHeader(headers, ["last", "last_name", "lname"]) ?? undefined;
  map.full_name = inferByHeader(headers, ["name", "full_name", "contact"]) ?? undefined;

  if (!map.email) map.email = inferByContent(headers, rows, isEmail) ?? undefined;
  if (!map.phone) map.phone = inferByContent(headers, rows, isPhone) ?? undefined;
  if (!map.linkedin_url) map.linkedin_url = inferByContent(headers, rows, isLinkedInUrl) ?? undefined;

  if (!map.company) map.company = inferByContent(headers, rows, looksLikeCompany) ?? undefined;
  if (!map.title) map.title = inferByContent(headers, rows, looksLikeTitle) ?? undefined;

  if (!map.full_name && !map.first_name && !map.last_name) {
    map.full_name = inferByContent(headers, rows, looksLikeName) ?? undefined;
  }

  return map;
}

function splitName(full: string) {
  const s = String(full ?? "").trim();
  if (!s) return { first: "", last: "" };
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/* =============================== App =============================== */

export default function App() {
  const [session, setSession] = useState<any>(null);

  const [authEmail, setAuthEmail] = useState("");
  const [password, setPassword] = useState("");

  const [page, setPage] = useState<Page>("contacts");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [myLinkedInUrl, setMyLinkedInUrl] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const [search, setSearch] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLinkedIn, setEditLinkedIn] = useState("");

  const [importFileName, setImportFileName] = useState<string>("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importMap, setImportMap] = useState<FieldMap>({});
  const [importing, setImporting] = useState(false);

  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [meetings, setMeetings] = useState<ContactMeeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingDraftDate, setMeetingDraftDate] = useState<string>(todayISODate());
  const [meetingDraftTitle, setMeetingDraftTitle] = useState<string>("");
  const [meetingSavingId, setMeetingSavingId] = useState<string>("");
  const [meetingDeletingId, setMeetingDeletingId] = useState<string>("");
  const [meetingDirty, setMeetingDirty] = useState<Record<string, boolean>>({});
  const [meetingEdits, setMeetingEdits] = useState<
    Record<
      string,
      {
        meeting_date: string;
        title: string;
        notes: string;
      }
    >
  >({});

  /* ----------------------------- Applications State ----------------------------- */
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const [appCompany, setAppCompany] = useState("");
  const [appLink, setAppLink] = useState("");
  const [appDate, setAppDate] = useState(todayISODate());
  const [appStatus, setAppStatus] = useState("Applied");
  const [appContactId, setAppContactId] = useState("");

  const [savingApp, setSavingApp] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  // Forgot password / recovery
  const [resettingPw, setResettingPw] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoverySaving, setRecoverySaving] = useState(false);

  const inputCls =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:bg-white/10";
  const selectCls =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20 focus:bg-white/10";

  /* ----------------------------- Auth session ----------------------------- */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // When user clicks the reset-password email link, Supabase fires PASSWORD_RECOVERY
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setResetSent(false);
      }
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email: authEmail, password });
    if (error) alert(error.message);
    else alert("Signed up. If email confirmation is enabled, confirm your email, then sign in.");
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (error) alert(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setContacts([]);
    setProfile(null);
    setPage("contacts");
    setSelectedContactId("");
    setMeetings([]);
    setMeetingEdits({});
    setMeetingDirty({});
    setProfileMenuOpen(false);
    setSidebarOpen(false);

    // reset auth flow UI
    setResetSent(false);
    setResettingPw(false);
    setRecoveryMode(false);
    setRecoveryNewPassword("");
    setAuthEmail("");
    setPassword("");
  }

  async function requestPasswordReset() {
    const email = authEmail.trim().toLowerCase();

    if (!email) {
      alert("Enter your email first, then click Forgot my password.");
      return;
    }
    if (!isEmail(email)) {
      alert("Enter a valid email address (example: name@gmail.com).");
      return;
    }

    setResettingPw(true);
    try {
      // IMPORTANT: Supabase Auth settings must allow this redirect URL:
      // Auth -> URL Configuration -> Site URL / Additional Redirect URLs
      const redirectTo = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      setResetSent(true);
      alert("Password reset email sent. Check your inbox (and spam).");
    } catch (e: any) {
      alert(e?.message ?? "Failed to send password reset email.");
    } finally {
      setResettingPw(false);
    }
  }

  async function completePasswordRecovery() {
    const pw = recoveryNewPassword.trim();
    if (pw.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setRecoverySaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      setRecoveryMode(false);
      setRecoveryNewPassword("");
      alert("Password updated. You’re signed in.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to update password.");
    } finally {
      setRecoverySaving(false);
    }
  }

  /* ----------------------------- Profile load/save ----------------------------- */

  async function loadProfile() {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, my_linkedin_url, resume_url, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (!data) {
      const { error: insErr } = await supabase.from("profiles").insert({
        id: session.user.id,
        full_name: null,
        my_linkedin_url: null,
        resume_url: null,
        avatar_url: null,
      });
      if (insErr) console.error(insErr);
      setProfile({
        id: session.user.id,
        full_name: null,
        my_linkedin_url: null,
        resume_url: null,
        avatar_url: null,
      });
      return;
    }

    setProfile(data as Profile);
    setDisplayName((data as any)?.full_name ?? "");
    setMyLinkedInUrl((data as any)?.my_linkedin_url ?? "");
    setNewEmail(session?.user?.email ?? "");
  }

  useEffect(() => {
    if (session) {
      loadProfile();
      loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function saveProfile() {
    if (!session?.user?.id) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: displayName || null,
          my_linkedin_url: myLinkedInUrl || null,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      if (newEmail && newEmail !== session.user.email) {
        const { error: eErr } = await supabase.auth.updateUser({ email: newEmail });
        if (eErr) throw eErr;
        alert("Email update requested. Supabase may require email confirmation.");
      }

      if (newPassword.trim().length >= 6) {
        const { error: pErr } = await supabase.auth.updateUser({ password: newPassword.trim() });
        if (pErr) throw pErr;
        setNewPassword("");
        alert("Password updated.");
      }

      await loadProfile();
    } catch (e: any) {
      alert(e?.message ?? "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadResume(file: File) {
    if (!session?.user?.id) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${session.user.id}/resume.${ext}`;

    setSavingProfile(true);
    try {
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("resumes").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error } = await supabase.from("profiles").update({ resume_url: publicUrl }).eq("id", session.user.id);
      if (error) throw error;

      await loadProfile();
      alert("Resume uploaded.");
    } catch (e: any) {
      alert(
        e?.message ??
        "Resume upload failed. Make sure you created a Storage bucket named 'resumes' (public is easiest)."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  /* ----------------------------- Applications CRUD ----------------------------- */

  async function loadApplications() {
    if (!session?.user?.id) return;
    setLoadingApps(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("date_applied", { ascending: false })
      .order("created_at", { ascending: false });

    setLoadingApps(false);
    if (error) {
      // alert(error.message); // suppress if table not exists, or handle gracefully
      console.error(error);
      return;
    }
    setApplications((data ?? []) as Application[]);
  }

  async function saveApplication() {
    if (!session?.user?.id) return;
    if (!appCompany.trim()) {
      alert("Company name is required.");
      return;
    }

    setSavingApp(true);
    try {
      const payload = {
        owner_id: session.user.id,
        company: appCompany.trim(),
        link: appLink.trim() || null,
        date_applied: appDate || null,
        status: appStatus.trim() || "Applied",
        contact_id: appContactId || null,
      };

      if (editingAppId) {
        const { error } = await supabase
          .from("applications")
          .update(payload)
          .eq("id", editingAppId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("applications").insert(payload);
        if (error) throw error;
      }

      setAppCompany("");
      setAppLink("");
      setAppDate(todayISODate());
      setAppStatus("Applied");
      setEditingAppId(null);

      await loadApplications();
    } catch (e: any) {
      alert(e?.message ?? "Failed to save application. Did you create the table?");
    } finally {
      setSavingApp(false);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Delete this application?")) return;
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) alert(error.message);
    else loadApplications();
  }

  function startEditApp(a: Application) {
    setEditingAppId(a.id);
    setAppCompany(a.company);
    setAppLink(a.link ?? "");
    setAppDate(a.date_applied ?? "");
    setAppStatus(a.status);
    setAppContactId(a.contact_id ?? "");
  }

  function cancelEditApp() {
    setEditingAppId(null);
    setAppCompany("");
    setAppLink("");
    setAppDate(todayISODate());
    setAppStatus("Applied");
    setAppContactId("");
  }

  /* ----------------------------- Contacts CRUD ----------------------------- */

  async function loadContacts() {
    setLoadingContacts(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("id, owner_id, first_name, last_name, company, title, email, phone, linkedin_url, status, created_at")
      .order("created_at", { ascending: false });

    setLoadingContacts(false);

    if (error) {
      alert(error.message);
      return;
    }
    setContacts((data ?? []) as Contact[]);
  }

  async function addContact() {
    if (!session?.user?.id) return;

    const { error } = await supabase.from("contacts").insert({
      owner_id: session.user.id,
      first_name: firstName || null,
      last_name: lastName || null,
      company: company || null,
      title: jobTitle || null,
      email: contactEmail || null,
      phone: phone || null,
      linkedin_url: linkedinUrl || null,
      status: "to_contact",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setFirstName("");
    setLastName("");
    setCompany("");
    setJobTitle("");
    setContactEmail("");
    setPhone("");
    setLinkedinUrl("");

    loadContacts();
  }

  async function deleteContact(contactId: string) {
    const ok = window.confirm("Delete this person from your Network? This cannot be undone.");
    if (!ok) return;
    const { error } = await supabase.from("contacts").delete().eq("id", contactId);
    if (error) alert(error.message);
    else {
      if (selectedContactId === contactId) {
        setSelectedContactId("");
        setMeetings([]);
        setMeetingEdits({});
        setMeetingDirty({});
        setPage("contacts");
      }
      loadContacts();
    }
  }

  function openEdit(c: Contact) {
    setEditContact(c);
    setEditFirst(c.first_name ?? "");
    setEditLast(c.last_name ?? "");
    setEditCompany(c.company ?? "");
    setEditTitle(c.title ?? "");
    setEditEmail(c.email ?? "");
    setEditPhone(c.phone ?? "");
    setEditLinkedIn(c.linkedin_url ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editContact?.id) return;

    const { error } = await supabase
      .from("contacts")
      .update({
        first_name: editFirst || null,
        last_name: editLast || null,
        company: editCompany || null,
        title: editTitle || null,
        email: editEmail || null,
        phone: editPhone || null,
        linkedin_url: editLinkedIn || null,
      })
      .eq("id", editContact.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditOpen(false);
    setEditContact(null);
    loadContacts();
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!s) return true;
      return [c.first_name, c.last_name, c.company, c.title, c.email, c.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [contacts, search]);

  /* ----------------------------- Contact Details (meetings/notes) ----------------------------- */

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) ?? null;
  }, [contacts, selectedContactId]);

  async function loadMeetings(contactId: string) {
    if (!session?.user?.id) return;
    if (!contactId) return;

    setLoadingMeetings(true);
    try {
      const { data, error } = await supabase
        .from("contact_meetings")
        .select("id, owner_id, contact_id, meeting_date, title, notes, created_at")
        .eq("contact_id", contactId)
        .order("meeting_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as ContactMeeting[];
      setMeetings(rows);

      const edits: typeof meetingEdits = {};
      const dirty: typeof meetingDirty = {};
      for (const m of rows) {
        edits[m.id] = {
          meeting_date: (m.meeting_date ?? "").slice(0, 10),
          title: m.title ?? "",
          notes: m.notes ?? "",
        };
        dirty[m.id] = false;
      }
      setMeetingEdits(edits);
      setMeetingDirty(dirty);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load meetings. Did you create the contact_meetings table?");
      setMeetings([]);
      setMeetingEdits({});
      setMeetingDirty({});
    } finally {
      setLoadingMeetings(false);
    }
  }

  async function openDetails(contactId: string) {
    setSelectedContactId(contactId);
    setPage("contact_details");
  }

  useEffect(() => {
    if (page === "contact_details" && selectedContactId) {
      loadMeetings(selectedContactId);
    }
    if (page === "applications") {
      loadApplications();
      if (contacts.length === 0) loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedContactId]);

  async function addMeeting() {
    if (!session?.user?.id) return;
    if (!selectedContactId) return;

    const date = (meetingDraftDate || "").trim() || todayISODate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert("Meeting date must be in YYYY-MM-DD format.");
      return;
    }

    try {
      const { error } = await supabase.from("contact_meetings").insert({
        owner_id: session.user.id,
        contact_id: selectedContactId,
        meeting_date: date,
        title: meetingDraftTitle.trim() || null,
        notes: null,
      });
      if (error) throw error;

      setMeetingDraftTitle("");
      await loadMeetings(selectedContactId);
    } catch (e: any) {
      alert(e?.message ?? "Failed to add meeting.");
    }
  }

  async function saveMeeting(meetingId: string) {
    if (!session?.user?.id) return;
    if (!meetingId) return;

    const draft = meetingEdits[meetingId];
    if (!draft) return;

    const date = (draft.meeting_date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert("Meeting date must be in YYYY-MM-DD format.");
      return;
    }

    setMeetingSavingId(meetingId);
    try {
      const { error } = await supabase
        .from("contact_meetings")
        .update({
          meeting_date: date,
          title: draft.title.trim() || null,
          notes: draft.notes ?? null,
        })
        .eq("id", meetingId);

      if (error) throw error;

      setMeetingDirty((prev) => ({ ...prev, [meetingId]: false }));
      await loadMeetings(selectedContactId);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save meeting notes.");
    } finally {
      setMeetingSavingId("");
    }
  }

  async function deleteMeeting(meetingId: string) {
    if (!meetingId) return;
    const ok = window.confirm("Delete this meeting note folder? This cannot be undone.");
    if (!ok) return;

    setMeetingDeletingId(meetingId);
    try {
      const { error } = await supabase.from("contact_meetings").delete().eq("id", meetingId);
      if (error) throw error;
      await loadMeetings(selectedContactId);
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete meeting.");
    } finally {
      setMeetingDeletingId("");
    }
  }

  function setMeetingField(meetingId: string, key: "meeting_date" | "title" | "notes", value: string) {
    setMeetingEdits((prev) => ({
      ...prev,
      [meetingId]: {
        meeting_date: prev[meetingId]?.meeting_date ?? "",
        title: prev[meetingId]?.title ?? "",
        notes: prev[meetingId]?.notes ?? "",
        [key]: value,
      },
    }));
    setMeetingDirty((prev) => ({ ...prev, [meetingId]: true }));
  }

  /* ----------------------------- Import page handlers ----------------------------- */

  async function onPickCsv(file: File) {
    setImportFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);

    setImportHeaders(parsed.headers);
    setImportRows(parsed.rows);

    const mapping = inferFieldMap(parsed.headers, parsed.rows);
    setImportMap(mapping);
  }

  async function importIntoSupabase() {
    if (!session?.user?.id) return;
    if (importRows.length === 0) return;

    setImporting(true);

    try {
      const rows = importRows;
      const map = importMap;
      const owner_id = session.user.id;

      const seen = new Set<string>();
      const inserts: any[] = [];

      for (const r of rows) {
        const emailRaw = map.email ? r[map.email] : "";
        const phoneRaw = map.phone ? r[map.phone] : "";
        const liRaw = map.linkedin_url ? r[map.linkedin_url] : "";
        const companyRaw = map.company ? r[map.company] : "";
        const titleRaw = map.title ? r[map.title] : "";
        const statusRaw = map.status ? r[map.status] : "";

        let first = "";
        let last = "";

        if (map.first_name || map.last_name) {
          first = map.first_name ? r[map.first_name] : "";
          last = map.last_name ? r[map.last_name] : "";
        } else if (map.full_name) {
          const sn = splitName(r[map.full_name]);
          first = sn.first;
          last = sn.last;
        }

        const email = isEmail(emailRaw) ? emailRaw.trim() : "";
        const phone = cleanPhone(phoneRaw) ?? "";
        const linkedin = cleanLinkedIn(liRaw) ?? "";

        const dedupeKey =
          (email || "").toLowerCase() ||
          (linkedin || "").toLowerCase() ||
          `${first.toLowerCase()}|${last.toLowerCase()}|${(companyRaw || "").toLowerCase()}`;

        if (!dedupeKey.trim()) continue;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        let status = "to_contact";
        const sr = String(statusRaw ?? "").trim().toLowerCase().replaceAll(" ", "_");
        if (sr) status = sr;

        inserts.push({
          owner_id,
          first_name: first || null,
          last_name: last || null,
          company: companyRaw?.trim() ? companyRaw.trim() : null,
          title: titleRaw?.trim() ? titleRaw.trim() : null,
          email: email || null,
          phone: phone || null,
          linkedin_url: linkedin || null,
          status,
        });
      }

      if (inserts.length === 0) {
        alert("No valid rows found to import.");
        return;
      }

      const CHUNK = 200;
      for (let i = 0; i < inserts.length; i += CHUNK) {
        const chunk = inserts.slice(i, i + CHUNK);
        const { error } = await supabase.from("contacts").insert(chunk);
        if (error) throw error;
      }

      setImportFileName("");
      setImportHeaders([]);
      setImportRows([]);
      setImportMap({});
      await loadContacts();
      alert("Import complete.");
      setPage("contacts");
    } catch (e: any) {
      alert(e?.message ?? "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  /* =============================== Password Recovery Screen =============================== */

  // If user clicked the recovery email link, force password update UI before app shell.
  // NOTE: This intentionally does NOT require `session` to be non-null, because Supabase can briefly report null
  // while processing the recovery token.
  if (recoveryMode) {
    return (
      <div className="relative min-h-screen text-white">
        <AuthIllustration />
        <div className="relative mx-auto max-w-6xl px-6 py-14">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-1 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <Card title="Set a new password" subtitle="You’re in recovery mode. Choose a new password to finish.">
                <div className="grid gap-3">
                  <input
                    className={inputCls}
                    placeholder="New password (min 6 chars)"
                    type="password"
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                  />

                  <button
                    onClick={completePasswordRecovery}
                    disabled={recoverySaving}
                    className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.28)] hover:brightness-110 disabled:opacity-50"
                  >
                    {recoverySaving ? "Saving…" : "Update Password"}
                  </button>

                  <button
                    onClick={signOut}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Cancel (Sign Out)
                  </button>

                  <p className="text-xs text-white/55">
                    If this doesn’t work, confirm your Supabase Auth redirect URLs include your site origin.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =============================== Auth Screen =============================== */

  if (!session) {
    return (
      <div className="relative min-h-screen text-white">
        <AuthIllustration />

        <div className="relative mx-auto max-w-6xl px-6 py-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="hidden lg:block">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                Coffee?
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight">Turn networking into a repeatable system.</h1>
              <p className="mt-3 max-w-lg text-sm text-white/70">
                Track your network, log coffee chats by date, and keep your relationship context where it belongs—next to
                the person.
              </p>
            </div>

            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 text-center lg:hidden">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
                  <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                  Coffee?
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight">Coffee?</h1>
                <p className="mt-2 text-sm text-white/70">A colorful networking dashboard that actually gets used.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-1 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <Card title="Sign in" subtitle="Use any email + password you control.">
                  <div className="grid gap-3">
                    <input
                      className={inputCls}
                      placeholder="Email"
                      value={authEmail}
                      onChange={(e) => {
                        setAuthEmail(e.target.value);
                        if (resetSent) setResetSent(false);
                      }}
                    />
                    <input
                      className={inputCls}
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (resetSent) setResetSent(false);
                      }}
                    />

                    <button
                      onClick={signIn}
                      className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.28)] hover:brightness-110"
                    >
                      Sign In
                    </button>

                    <button
                      onClick={signUp}
                      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Sign Up
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={requestPasswordReset}
                        disabled={resettingPw}
                        className="text-left text-xs font-semibold text-cyan-200 hover:underline disabled:opacity-60"
                      >
                        {resettingPw ? "Sending reset email…" : "Forgot my password"}
                      </button>

                      {resetSent ? <span className="text-xs text-white/60">Reset email sent.</span> : null}
                    </div>

                    <p className="text-xs text-white/55">
                      Note: If you don’t receive the email, check spam. Also ensure Supabase Auth redirect URLs include
                      this site.
                    </p>
                  </div>
                </Card>
              </div>

              <p className="mt-4 text-center text-xs text-white/55">
                By signing in, you’ll land directly in your Network dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =============================== App Shell =============================== */

  const profileLabel = profile?.full_name?.trim() || session?.user?.email?.split("@")?.[0] || "User";
  const avatarText = initialsFromName(profileLabel);

  const topBadge =
    page === "contacts" ? "Network" : page === "settings" ? "Settings" : "Details";

  const selectedContactName = selectedContact
    ? ([selectedContact.first_name, selectedContact.last_name].filter(Boolean).join(" ") || "Connection")
    : "Connection";
  return (
    <div className="min-h-screen text-white">
      <div className="fixed inset-0 -z-10 bg-[#050b14]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.28),transparent_45%),radial-gradient(circle_at_70%_0%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(circle_at_25%_90%,rgba(168,85,247,0.22),transparent_55%),radial-gradient(circle_at_88%_85%,rgba(16,185,129,0.16),transparent_45%)]" />

      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 border-r border-white/10 bg-[#0b1420]/90 backdrop-blur-xl transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <svg
              className="h-12 w-12 text-cyan-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <path d="M6 1v3" />
              <path d="M10 1v3" />
              <path d="M14 1v3" />
              <path d="M8 11a2 2 0 0 1 4 0c0 1.5-2 1.5-2 3" />
              <path d="M10 17h.01" />
            </svg>
          </div>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            Close
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={() => {
              setPage("contacts");
              setSelectedContactId("");
              setSidebarOpen(false);
            }}
            className={`mb-2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${page === "contacts" ? "bg-white/10" : "hover:bg-white/5"
              }`}
          >
            Network
          </button>

          <button
            onClick={() => {
              setPage("applications");
              setSelectedContactId("");
              setSidebarOpen(false);
            }}
            className={`mb-2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${page === "applications" ? "bg-white/10" : "hover:bg-white/5"
              }`}
          >
            Applications
          </button>



          <button
            onClick={() => {
              setPage("settings");
              setSelectedContactId("");
              setSidebarOpen(false);
            }}
            className={`mb-2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${page === "settings" ? "bg-white/10" : "hover:bg-white/5"
              }`}
          >
            Settings
          </button>

          {page === "contact_details" && selectedContactId ? (
            <button
              onClick={() => {
                setPage("contacts");
                setSidebarOpen(false);
              }}
              className="mb-2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold hover:bg-white/5"
            >
              ← Back to Network
            </button>
          ) : null}
        </div>

        <div className="mt-auto px-5 pb-5 pt-6">
          <button
            onClick={signOut}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Sign Out
          </button>
          <p className="mt-3 text-xs text-white/50">
            Tip: Google Sheets exports don’t include hidden hyperlink URLs. Import, then add LinkedIn via Edit.
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-30 border-b border-white/10 bg-white/[0.04] backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 lg:hidden"
                aria-label="Open menu"
              >
                <div className="grid gap-1">
                  <span className="h-0.5 w-5 rounded bg-white/80" />
                  <span className="h-0.5 w-5 rounded bg-white/80" />
                  <span className="h-0.5 w-5 rounded bg-white/80" />
                </div>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">
                    Coffee?{page === "contact_details" ? ` • ${selectedContactName}` : ""}
                  </h1>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">
                    {topBadge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  {page === "contact_details" ? "Log meetings and keep notes by date." : "Build relationships like a system."}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-500 text-sm font-bold text-white shadow-[0_0_25px_rgba(34,211,238,0.18)]">
                  {avatarText}
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-sm font-semibold">{profileLabel}</div>
                  <div className="text-xs text-white/60">{session?.user?.email}</div>
                </div>
                <span className="text-white/70">▾</span>
              </button>

              {profileMenuOpen ? (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1420]/95 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <button
                    onClick={() => {
                      setPage("settings");
                      setSelectedContactId("");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Sign Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* APPLICATIONS PAGE */}
        {page === "applications" ? (
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <Card title={editingAppId ? "Edit Application" : "Track Application"} subtitle="Keep tabs on where you’ve applied.">
                <div className="grid gap-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-white/70">Company Name</div>
                    <input className={inputCls} placeholder="e.g. Acme Corp" value={appCompany} onChange={(e) => setAppCompany(e.target.value)} />
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-white/70">Application Link (optional)</div>
                    <input className={inputCls} placeholder="https://..." value={appLink} onChange={(e) => setAppLink(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 text-xs font-semibold text-white/70">Date Applied</div>
                      <input className={inputCls} type="date" value={appDate} onChange={(e) => setAppDate(e.target.value)} />
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold text-white/70">Status</div>
                      <select
                        className={selectCls}
                        value={appStatus}
                        onChange={(e) => setAppStatus(e.target.value)}
                      >
                        <option value="Applied">Applied</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-white/70">Linked Contact (optional)</div>
                    <select
                      className={selectCls}
                      value={appContactId}
                      onChange={(e) => setAppContactId(e.target.value)}
                    >
                      <option value="">None</option>
                      {contacts.map((c) => {
                        const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
                        return (
                          <option key={c.id} value={c.id}>
                            {name} {c.company ? `— ${c.company}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveApplication}
                      disabled={savingApp}
                      className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.25)] hover:brightness-110 disabled:opacity-50"
                    >
                      {savingApp ? "Saving..." : editingAppId ? "Update" : "Add App"}
                    </button>
                    {editingAppId && (
                      <button
                        onClick={cancelEditApp}
                        className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card
                title="My Applications"
                subtitle={loadingApps ? "Loading..." : `${applications.length} application(s)`}
                right={
                  <button
                    onClick={loadApplications}
                    className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Refresh
                  </button>
                }
              >
                <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_0.8fr] items-center gap-3 px-4 py-3 text-xs uppercase tracking-wide text-white/60">
                    <div>Company</div>
                    <div>Link</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div>Action</div>
                  </div>
                  <div className="h-px w-full bg-white/10" />

                  {loadingApps ? (
                    <div className="px-4 py-4 text-sm text-white/70">Loading...</div>
                  ) : applications.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-white/70">No applications tracked yet.</div>
                  ) : (
                    applications.map(app => (
                      <div key={app.id}>
                        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_0.8fr] items-center gap-3 px-4 py-3 hover:bg-white/[0.04]">
                          <div className="font-semibold text-white">{app.company}</div>
                          <div className="min-w-0 truncate text-sm">
                            {app.link ? (
                              <a href={app.link} target="_blank" rel="noreferrer" className="text-cyan-200 hover:underline">
                                View Link
                              </a>
                            ) : <span className="text-white/40">—</span>}
                          </div>
                          <div className="text-sm text-white/80">{app.date_applied || "—"}</div>
                          <div className="text-sm">
                            <span className="inline-block rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white/90">
                              {app.status}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditApp(app)}
                              className="text-xs font-semibold text-white/70 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteApplication(app.id)}
                              className="text-xs font-semibold text-rose-300/70 hover:text-rose-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="h-px w-full bg-white/10" />
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {/* NETWORK PAGE */}
        {page === "contacts" ? (
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <Card title="Add Contact" subtitle="Add someone once. Track the relationship forever.">
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inputCls} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    <input className={inputCls} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>

                  <input className={inputCls} placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
                  <input className={inputCls} placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                  <input className={inputCls} placeholder="Email (recommended)" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  <input className={inputCls} placeholder="Phone (recommended)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <input className={inputCls} placeholder="LinkedIn URL" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />

                  <button
                    onClick={addContact}
                    className="mt-1 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.25)] hover:brightness-110"
                  >
                    Save Contact
                  </button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card
                title="Your Network"
                subtitle={loadingContacts ? "Loading…" : `${filtered.length} connection(s)`}
                right={
                  <button
                    onClick={loadContacts}
                    className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Refresh
                  </button>
                }
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <input
                    className={inputCls}
                    placeholder="Search name, company, job title, email, phone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="grid grid-cols-[2.2fr_1.4fr_1.2fr_1.1fr_1.0fr_1.0fr] items-center gap-3 px-4 py-3 text-xs uppercase tracking-wide text-white/60">
                    <div>Name</div>
                    <div>Company</div>
                    <div>Job Title</div>
                    <div>Details</div>
                    <div>Edit</div>
                    <div>Delete</div>
                  </div>

                  <div className="h-px w-full bg-white/10" />

                  {loadingContacts ? (
                    <div className="px-4 py-4 text-sm text-white/70">Loading…</div>
                  ) : filtered.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-white/70">No connections found.</div>
                  ) : (
                    filtered.map((c) => {
                      const displayName = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
                      const li = c.linkedin_url ?? "";

                      return (
                        <div key={c.id} className="px-4">
                          <div className="grid grid-cols-[2.2fr_1.4fr_1.2fr_1.1fr_1.0fr_1.0fr] items-center gap-3 py-3 hover:bg-white/[0.04]">
                            <div className="min-w-0">
                              {li ? (
                                <a
                                  href={li}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block truncate font-semibold text-white hover:underline"
                                  title="Open LinkedIn"
                                >
                                  {displayName}
                                </a>
                              ) : (
                                <div className="truncate font-semibold text-white" title={displayName}>
                                  {displayName}
                                </div>
                              )}
                              <div className="mt-0.5 truncate text-xs text-white/60">
                                {[c.email, c.phone].filter(Boolean).join(" • ")}
                              </div>
                            </div>

                            <div className="truncate text-sm text-white/85" title={c.company ?? ""}>
                              {c.company ?? "—"}
                            </div>

                            <div className="truncate text-sm text-white/85" title={c.title ?? ""}>
                              {c.title ?? "—"}
                            </div>

                            <button
                              onClick={() => openDetails(c.id)}
                              className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                            >
                              Details
                            </button>

                            <button
                              onClick={() => openEdit(c)}
                              className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteContact(c.id)}
                              className="w-full rounded-2xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/20"
                            >
                              Delete
                            </button>
                          </div>

                          <div className="h-px w-full bg-white/10" />
                        </div>
                      );
                    })
                  )}

                  <div className="px-4 py-3 text-xs text-white/60">
                    Tip: Click a name to open LinkedIn (if a LinkedIn URL is saved). Use Details to log meetings and notes by date.
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {/* DETAILS PAGE */}
        {page === "contact_details" ? (
          <div className="mx-auto max-w-7xl px-6 py-6">
            {!selectedContact ? (
              <Card
                title="Connection not found"
                subtitle="This can happen if the person was deleted or hasn’t loaded yet."
                right={
                  <button
                    onClick={() => {
                      setPage("contacts");
                      setSelectedContactId("");
                    }}
                    className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Back
                  </button>
                }
              >
                <div className="text-sm text-white/70">Return to Network and try again.</div>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <Card
                    title="Connection details"
                    subtitle="Everything about them (and your relationship notes)."
                    right={
                      <button
                        onClick={() => setPage("contacts")}
                        className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        ← Back
                      </button>
                    }
                  >
                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-sm font-semibold text-white">
                          {[selectedContact.first_name, selectedContact.last_name].filter(Boolean).join(" ") || "—"}
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          {[selectedContact.company, selectedContact.title].filter(Boolean).join(" • ") || "—"}
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-white/60">Email</div>
                          <div className="mt-1 text-white/85">{selectedContact.email ?? "—"}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-white/60">Phone</div>
                          <div className="mt-1 text-white/85">{selectedContact.phone ?? "—"}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-white/60">LinkedIn</div>
                          <div className="mt-1">
                            {selectedContact.linkedin_url ? (
                              <a
                                className="text-sm font-semibold text-cyan-200 hover:underline"
                                href={selectedContact.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open profile
                              </a>
                            ) : (
                              <span className="text-white/85">—</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => openEdit(selectedContact)}
                          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                        >
                          Edit Contact
                        </button>
                        <button
                          onClick={() => deleteContact(selectedContact.id)}
                          className="w-full rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card
                    title="Meeting notes"
                    subtitle="Each meeting is a mini folder labeled by date. Add as many as you want."
                    right={
                      <button
                        onClick={() => loadMeetings(selectedContact.id)}
                        className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        Refresh
                      </button>
                    }
                  >
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="grid gap-3 md:grid-cols-3 md:items-end">
                        <div>
                          <div className="mb-1 text-xs font-semibold text-white/70">Meeting date</div>
                          <input className={inputCls} type="date" value={meetingDraftDate} onChange={(e) => setMeetingDraftDate(e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                          <div className="mb-1 text-xs font-semibold text-white/70">Label (optional)</div>
                          <input
                            className={inputCls}
                            placeholder='Example: "Coffee chat" or "Follow-up call"'
                            value={meetingDraftTitle}
                            onChange={(e) => setMeetingDraftTitle(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={addMeeting}
                          className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.22)] hover:brightness-110"
                        >
                          Add meeting
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                      {loadingMeetings ? (
                        <div className="px-4 py-4 text-sm text-white/70">Loading…</div>
                      ) : meetings.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-white/70">
                          No meetings yet. Click <span className="font-semibold text-white">Add meeting</span> to create the first folder.
                        </div>
                      ) : (
                        <div className="divide-y divide-white/10">
                          {meetings.map((m) => {
                            const draft = meetingEdits[m.id] ?? {
                              meeting_date: (m.meeting_date ?? "").slice(0, 10),
                              title: m.title ?? "",
                              notes: m.notes ?? "",
                            };
                            const isDirty = !!meetingDirty[m.id];
                            const saving = meetingSavingId === m.id;
                            const deleting = meetingDeletingId === m.id;

                            return (
                              <div key={m.id} className="p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
                                  <div className="flex flex-1 flex-col gap-2 md:min-w-0 md:flex-row md:items-center">
                                    <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85">
                                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.55)]" />
                                      {formatDateLabel(draft.meeting_date || m.meeting_date)}
                                    </div>

                                    <input
                                      className={`${inputCls} w-full md:w-auto md:flex-1`}
                                      placeholder="Optional label"
                                      value={draft.title}
                                      onChange={(e) => setMeetingField(m.id, "title", e.target.value)}
                                    />
                                  </div>

                                  <div className="flex shrink-0 items-center gap-2">
                                    <input
                                      className={`${inputCls} w-36`}
                                      type="date"
                                      value={draft.meeting_date}
                                      onChange={(e) => setMeetingField(m.id, "meeting_date", e.target.value)}
                                      title="Meeting date"
                                    />

                                    <button
                                      onClick={() => saveMeeting(m.id)}
                                      disabled={!isDirty || saving}
                                      className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                                    >
                                      {saving ? "Saving…" : isDirty ? "Save" : "Saved"}
                                    </button>

                                    <button
                                      onClick={() => deleteMeeting(m.id)}
                                      disabled={deleting}
                                      className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
                                    >
                                      {deleting ? "Deleting…" : "Delete"}
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <textarea
                                    className="min-h-[160px] w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:bg-white/10"
                                    placeholder="Call notes… what you discussed, next steps, reminders, personal details, follow-ups."
                                    value={draft.notes}
                                    onChange={(e) => setMeetingField(m.id, "notes", e.target.value)}
                                  />
                                  <div className="mt-2 text-xs text-white/55">Tip: keep the first line as a summary. Save when done.</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        ) : null}



        {/* SETTINGS PAGE */}
        {page === "settings" ? (
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card title="Profile" subtitle="This info will power personalization (emails, cover letters, etc.).">
                  <div className="grid gap-3">
                    <input className={inputCls} placeholder="Display name (username)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

                    <input className={inputCls} placeholder="Your LinkedIn URL" value={myLinkedInUrl} onChange={(e) => setMyLinkedInUrl(e.target.value)} />

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">Resume upload</div>
                      <div className="mt-1 text-xs text-white/60">
                        Upload PDF/DOC/DOCX to Supabase Storage bucket <span className="font-semibold">resumes</span>.
                      </div>

                      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf"
                          className="block w-full text-sm text-white/80 file:mr-4 file:rounded-2xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadResume(f);
                          }}
                        />
                        {profile?.resume_url ? (
                          <a
                            href={profile.resume_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                          >
                            View resume
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.22)] hover:brightness-110 disabled:opacity-50"
                      >
                        {savingProfile ? "Saving…" : "Save profile"}
                      </button>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card title="Account" subtitle="Optional: update email and password.">
                  <div className="grid gap-3">
                    <input className={inputCls} placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    <input
                      className={inputCls}
                      placeholder="New password (min 6 chars)"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                    >
                      {savingProfile ? "Saving…" : "Update account"}
                    </button>

                    <p className="text-xs text-white/60">Supabase may require confirmation when changing email.</p>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-3">
                <Card title="Import Network (CSV)" subtitle="Smart Import detects columns automatically (email, phone, name, company, job title).">
                  <div className="grid gap-4">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="block w-full text-sm text-white/80 file:mr-4 file:rounded-2xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        onPickCsv(f);
                      }}
                    />

                    {importFileName ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-sm font-semibold text-white">Loaded: {importFileName}</div>
                        <div className="mt-1 text-xs text-white/60">
                          Detected mapping:{" "}
                          {Object.entries(importMap)
                            .filter(([, v]) => !!v)
                            .map(([k, v]) => `${k} ← ${v}`)
                            .join(" • ") || "none"}
                        </div>

                        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                          <div className="bg-white/[0.04] px-4 py-2 text-xs text-white/60">Preview: {importRows.length} row(s)</div>

                          <div className="grid grid-cols-5 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-white/60">
                            <div>Name</div>
                            <div>Company</div>
                            <div>Job Title</div>
                            <div>Email</div>
                            <div>Phone</div>
                          </div>

                          <div className="h-px w-full bg-white/10" />

                          {importRows.slice(0, 10).map((r, idx) => {
                            const map = importMap;

                            const name =
                              (map.full_name && r[map.full_name]) ||
                              [map.first_name ? r[map.first_name] : "", map.last_name ? r[map.last_name] : ""]
                                .filter(Boolean)
                                .join(" ");

                            const company = map.company ? r[map.company] : "";
                            const title = map.title ? r[map.title] : "";
                            const email = map.email ? r[map.email] : "";
                            const phone = map.phone ? r[map.phone] : "";

                            return (
                              <div key={idx} className="grid grid-cols-5 gap-2 px-4 py-2 text-sm text-white/85">
                                <div className="truncate" title={name}>
                                  {name || "—"}
                                </div>
                                <div className="truncate" title={company}>
                                  {company || "—"}
                                </div>
                                <div className="truncate" title={title}>
                                  {title || "—"}
                                </div>
                                <div className="truncate" title={email}>
                                  {email || "—"}
                                </div>
                                <div className="truncate" title={phone}>
                                  {phone || "—"}
                                </div>
                                <div className="col-span-5 h-px w-full bg-white/10" />
                              </div>
                            );
                          })}

                          <div className="px-4 py-2 text-xs text-white/60">Showing first 10 rows. All rows will import.</div>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2">
                          <button
                            disabled={importing || importRows.length === 0}
                            onClick={importIntoSupabase}
                            className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.22)] hover:brightness-110 disabled:opacity-50"
                          >
                            {importing ? "Importing…" : "Import into Coffee?"}
                          </button>
                        </div>

                        <p className="mt-3 text-xs text-white/60">
                          If LinkedIn doesn’t import: Sheets often exports only visible hyperlink text, not the URL. Import, then add LinkedIn via Edit.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : null}

        {/* Edit Contact Modal */}
        <Modal
          title={`Edit Contact${editContact ? `: ${[editContact.first_name, editContact.last_name].filter(Boolean).join(" ")}` : ""}`}
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditContact(null);
          }}
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="First name" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
              <input className={inputCls} placeholder="Last name" value={editLast} onChange={(e) => setEditLast(e.target.value)} />
            </div>

            <input className={inputCls} placeholder="Company" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
            <input className={inputCls} placeholder="Job Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <input className={inputCls} placeholder="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <input className={inputCls} placeholder="Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            <input
              className={inputCls}
              placeholder="LinkedIn URL (paste full URL text)"
              value={editLinkedIn}
              onChange={(e) => setEditLinkedIn(e.target.value)}
            />

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditContact(null);
                }}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.22)] hover:brightness-110"
              >
                Save changes
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}