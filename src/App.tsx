import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase, supabaseMisconfigured } from "./lib/supabase";
import type { Contact, ContactMeeting, Profile, Application, Page, FieldMap } from "./types";
import Modal from "./components/ui/Modal";
import { initialsFromName, todayISODate, formatDateLabel } from "./lib/utils";
import { parseCsv, inferFieldMap, splitName, isEmail, cleanLinkedIn, cleanPhone } from "./lib/csvHelper";
import AuthPage from "./pages/AuthPage";
import PasswordRecoveryPage from "./pages/PasswordRecoveryPage";
import ContactsPage from "./pages/ContactsPage";
import ContactDetailsPage from "./pages/ContactDetailsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import SettingsPage from "./pages/SettingsPage";
import OnboardingPage from "./pages/OnboardingPage";
import WatchlistPage from "./pages/WatchlistPage";
import OutreachEmailsPage from "./pages/OutreachEmailsPage";

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

/* =============================== App =============================== */

export default function App() {
  if (supabaseMisconfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050b14] text-white p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Configuration Error</h1>
          <p className="text-white/70">
            Required environment variables are missing. Set the following in your{" "}
            <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm">.env.local</code> file:
          </p>
          <ul className="text-left text-sm bg-white/5 rounded-xl p-4 space-y-1 font-mono">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
          <p className="text-white/50 text-sm">
            Copy <code className="bg-white/10 px-1 py-0.5 rounded">.env.example</code> to{" "}
            <code className="bg-white/10 px-1 py-0.5 rounded">.env.local</code> and fill in the values.
          </p>
        </div>
      </div>
    );
  }

  const [session, setSession] = useState<any>(null);

  const [authEmail, setAuthEmail] = useState("");
  const [password, setPassword] = useState("");

  const [page, setPage] = useState<Page>("contacts");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dueOutreachCount, setDueOutreachCount] = useState(0);

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
  const [, setImportHeaders] = useState<string[]>([]);
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
    if (error) { toast.error(error.message); return; }
    else toast.success("Signed up. If email confirmation is enabled, confirm your email, then sign in.");
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (error) toast.error(error.message);
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
      toast.error("Enter your email first, then click Forgot my password.");
      return;
    }
    if (!isEmail(email)) {
      toast.error("Enter a valid email address (example: name@gmail.com).");
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
      toast.info("Password reset email sent. Check your inbox (and spam).");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send password reset email.");
    } finally {
      setResettingPw(false);
    }
  }

  async function completePasswordRecovery() {
    const pw = recoveryNewPassword.trim();
    if (pw.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setRecoverySaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      setRecoveryMode(false);
      setRecoveryNewPassword("");
      toast.success("Password updated. You're signed in.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update password.");
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
      setPage("onboarding");
      return;
    }

    setProfile(data as Profile);
    setDisplayName((data as any)?.full_name ?? "");
    setMyLinkedInUrl((data as any)?.my_linkedin_url ?? "");
    setNewEmail(session?.user?.email ?? "");

    // Redirect to onboarding if profile is incomplete
    if (!(data as any)?.full_name?.trim()) {
      setPage("onboarding");
    }
  }

  async function checkDueOutreach() {
    const { data } = await supabase
      .from("scheduled_outreach")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());
    setDueOutreachCount(data?.length ?? 0);
  }

  useEffect(() => {
    if (session) {
      loadProfile();
      loadContacts();
      checkDueOutreach();
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
        toast.info("Email update requested. Supabase may require email confirmation.");
      }

      if (newPassword.trim().length >= 6) {
        const { error: pErr } = await supabase.auth.updateUser({ password: newPassword.trim() });
        if (pErr) throw pErr;
        setNewPassword("");
        toast.success("Password updated.");
      }

      await loadProfile();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save profile.");
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
      toast.success("Resume uploaded.");
    } catch (e: any) {
      toast.error(
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
      toast.error("Company name is required.");
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
      toast.error(e?.message ?? "Failed to save application. Did you create the table?");
    } finally {
      setSavingApp(false);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Delete this application?")) return;
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) toast.error(error.message);
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
      toast.error(error.message);
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
      toast.error(error.message);
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
    if (error) toast.error(error.message);
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
      toast.error(error.message);
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
      toast.error(e?.message ?? "Failed to load meetings. Did you create the contact_meetings table?");
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
      toast.error("Meeting date must be in YYYY-MM-DD format.");
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
      toast.error(e?.message ?? "Failed to add meeting.");
    }
  }

  async function saveMeeting(meetingId: string) {
    if (!session?.user?.id) return;
    if (!meetingId) return;

    const draft = meetingEdits[meetingId];
    if (!draft) return;

    const date = (draft.meeting_date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Meeting date must be in YYYY-MM-DD format.");
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
      toast.error(e?.message ?? "Failed to save meeting notes.");
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
      toast.error(e?.message ?? "Failed to delete meeting.");
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
        toast.error("No valid rows found to import.");
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
      toast.success("Import complete.");
      setPage("contacts");
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed.");
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
      <PasswordRecoveryPage
        recoveryNewPassword={recoveryNewPassword}
        setRecoveryNewPassword={setRecoveryNewPassword}
        recoverySaving={recoverySaving}
        completePasswordRecovery={completePasswordRecovery}
        signOut={signOut}
        inputCls={inputCls}
      />
    );
  }

  /* =============================== Auth Screen =============================== */

  if (!session) {
    return (
      <AuthPage
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        password={password}
        setPassword={setPassword}
        resetSent={resetSent}
        setResetSent={setResetSent}
        resettingPw={resettingPw}
        signIn={signIn}
        signUp={signUp}
        requestPasswordReset={requestPasswordReset}
        inputCls={inputCls}
      />
    );
  }

  /* =============================== App Shell =============================== */

  const profileLabel = profile?.full_name?.trim() || session?.user?.email?.split("@")?.[0] || "User";
  const avatarText = initialsFromName(profileLabel);

  const navLinkCls = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"}`;

  return (
    <div className="min-h-screen text-white">
      <div className="fixed inset-0 -z-10 bg-[#050b14]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.28),transparent_45%),radial-gradient(circle_at_70%_0%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(circle_at_25%_90%,rgba(168,85,247,0.22),transparent_55%),radial-gradient(circle_at_88%_85%,rgba(16,185,129,0.16),transparent_45%)]" />

      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1420]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => { setPage("contacts"); setSelectedContactId(""); }}
              className="mr-2 flex items-center gap-2 md:mr-4"
            >
              <svg className="h-8 w-8 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <path d="M6 1v3" /><path d="M10 1v3" /><path d="M14 1v3" />
              </svg>
              <span className="hidden text-base font-bold md:inline">Coffee?</span>
            </button>

            {/* Desktop nav links */}
            <div className="hidden items-center gap-1 md:flex">
              {/* Your Profile dropdown (Network + Watchlist) */}
              <div className="relative">
                <button
                  onClick={() => setNetworkDropdownOpen((v) => !v)}
                  className={navLinkCls(page === "contacts" || page === "contact_details" || page === "network_watchlist")}
                >
                  Network <span className="ml-0.5 text-white/50">▾</span>
                </button>
                {networkDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNetworkDropdownOpen(false)} />
                    <div className="absolute left-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0b1420]/95 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                      <button
                        onClick={() => { setPage("contacts"); setSelectedContactId(""); setNetworkDropdownOpen(false); }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5"
                      >
                        Network
                      </button>
                      <button
                        onClick={() => { setPage("network_watchlist"); setSelectedContactId(""); setNetworkDropdownOpen(false); }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5"
                      >
                        Watchlist
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => { setPage("outreach_emails"); setSelectedContactId(""); }}
                className={`${navLinkCls(page === "outreach_emails")} relative`}
              >
                Outreach
                {dueOutreachCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                    {dueOutreachCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setPage("applications"); setSelectedContactId(""); }}
                className={navLinkCls(page === "applications")}
              >
                Applications
              </button>

              <button
                onClick={() => { setPage("settings"); setSelectedContactId(""); }}
                className={navLinkCls(page === "settings")}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Right: Profile + Mobile hamburger */}
          <div className="flex items-center gap-2">
            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 hover:bg-white/10 md:gap-3 md:px-3 md:py-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-500 text-xs font-bold text-white shadow-[0_0_25px_rgba(34,211,238,0.18)]">
                  {avatarText}
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-sm font-semibold">{profileLabel}</div>
                  <div className="text-xs text-white/60">{session?.user?.email}</div>
                </div>
                <span className="text-white/50">▾</span>
              </button>

              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0b1420]/95 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                    <button
                      onClick={() => { setPage("settings"); setSelectedContactId(""); setProfileMenuOpen(false); }}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => { setProfileMenuOpen(false); signOut(); }}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10 md:hidden"
              aria-label="Open menu"
            >
              <div className="grid gap-1">
                <span className="h-0.5 w-4 rounded bg-white/80" />
                <span className="h-0.5 w-4 rounded bg-white/80" />
                <span className="h-0.5 w-4 rounded bg-white/80" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
            <button onClick={() => { setPage("contacts"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "contacts" || page === "contact_details")} mb-1 block w-full text-left`}>Network</button>
            <button onClick={() => { setPage("network_watchlist"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "network_watchlist")} mb-1 block w-full text-left`}>Watchlist</button>
            <button onClick={() => { setPage("outreach_emails"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "outreach_emails")} mb-1 block w-full text-left relative`}>Outreach{dueOutreachCount > 0 && <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">{dueOutreachCount}</span>}</button>
            <button onClick={() => { setPage("applications"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "applications")} mb-1 block w-full text-left`}>Applications</button>
            <button onClick={() => { setPage("settings"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "settings")} mb-1 block w-full text-left`}>Settings</button>
          </div>
        )}
      </nav>

      <div>

        {/* APPLICATIONS PAGE */}
        {page === "applications" ? (
          <ApplicationsPage
            applications={applications}
            loadingApps={loadingApps}
            loadApplications={loadApplications}
            contacts={contacts}
            appCompany={appCompany}
            setAppCompany={setAppCompany}
            appLink={appLink}
            setAppLink={setAppLink}
            appDate={appDate}
            setAppDate={setAppDate}
            appStatus={appStatus}
            setAppStatus={setAppStatus}
            appContactId={appContactId}
            setAppContactId={setAppContactId}
            savingApp={savingApp}
            editingAppId={editingAppId}
            saveApplication={saveApplication}
            cancelEditApp={cancelEditApp}
            startEditApp={startEditApp}
            deleteApplication={deleteApplication}
            inputCls={inputCls}
            selectCls={selectCls}
          />
        ) : null}

        {/* NETWORK PAGE */}
        {page === "contacts" ? (
          <ContactsPage
            contacts={filtered}
            loadingContacts={loadingContacts}
            loadContacts={loadContacts}
            search={search}
            setSearch={setSearch}
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            company={company}
            setCompany={setCompany}
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            contactEmail={contactEmail}
            setContactEmail={setContactEmail}
            phone={phone}
            setPhone={setPhone}
            linkedinUrl={linkedinUrl}
            setLinkedinUrl={setLinkedinUrl}
            addContact={addContact}
            openDetails={openDetails}
            openEdit={openEdit}
            deleteContact={deleteContact}
            inputCls={inputCls}
          />
        ) : null}

        {/* DETAILS PAGE */}
        {page === "contact_details" ? (
          <ContactDetailsPage
            selectedContact={selectedContact}
            meetings={meetings}
            loadingMeetings={loadingMeetings}
            meetingEdits={meetingEdits}
            meetingDirty={meetingDirty}
            meetingSavingId={meetingSavingId}
            meetingDeletingId={meetingDeletingId}
            meetingDraftDate={meetingDraftDate}
            setMeetingDraftDate={setMeetingDraftDate}
            meetingDraftTitle={meetingDraftTitle}
            setMeetingDraftTitle={setMeetingDraftTitle}
            addMeeting={addMeeting}
            saveMeeting={saveMeeting}
            deleteMeeting={deleteMeeting}
            setMeetingField={setMeetingField}
            loadMeetings={loadMeetings}
            openEdit={openEdit}
            deleteContact={deleteContact}
            setPage={setPage}
            setSelectedContactId={setSelectedContactId}
            inputCls={inputCls}
            formatDateLabel={formatDateLabel}
          />
        ) : null}



        {/* OUTREACH EMAILS PAGE */}
        {page === "outreach_emails" ? (
          <OutreachEmailsPage
            contacts={contacts}
            inputCls={inputCls}
            selectCls={selectCls}
          />
        ) : null}

        {/* NETWORK WATCHLIST PAGE */}
        {page === "network_watchlist" ? (
          <WatchlistPage inputCls={inputCls} selectCls={selectCls} />
        ) : null}

        {/* ONBOARDING PAGE */}
        {page === "onboarding" ? (
          <OnboardingPage
            displayName={displayName}
            setDisplayName={setDisplayName}
            myLinkedInUrl={myLinkedInUrl}
            setMyLinkedInUrl={setMyLinkedInUrl}
            saveProfile={saveProfile}
            uploadResume={uploadResume}
            savingProfile={savingProfile}
            setPage={setPage}
            inputCls={inputCls}
          />
        ) : null}

        {/* SETTINGS PAGE */}
        {page === "settings" ? (
          <SettingsPage
            displayName={displayName}
            setDisplayName={setDisplayName}
            myLinkedInUrl={myLinkedInUrl}
            setMyLinkedInUrl={setMyLinkedInUrl}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            profile={profile}
            savingProfile={savingProfile}
            saveProfile={saveProfile}
            uploadResume={uploadResume}
            importFileName={importFileName}
            importRows={importRows}
            importMap={importMap}
            importing={importing}
            onPickCsv={onPickCsv}
            importIntoSupabase={importIntoSupabase}
            inputCls={inputCls}
          />
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
