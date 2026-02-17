import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase, supabaseMisconfigured } from "./lib/supabase";
import type { Contact, ContactMeeting, Profile, Application, Page, FieldMap } from "./types";
import Modal from "./components/ui/Modal";
import { initialsFromName, todayISODate, formatDateLabel } from "./lib/utils";
import { parseCsv, inferFieldMap, splitName, isEmail, cleanLinkedIn, cleanPhone } from "./lib/csvHelper";
import { parsePdfToText, parsePdfFromUrl } from "./lib/resumeUtils";
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
      <div className="flex min-h-screen items-center justify-center bg-depth-0 p-8 text-white">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-danger">Configuration Error</h1>
          <p className="text-white/50">
            Required environment variables are missing. Set the following in your{" "}
            <code className="rounded-badge bg-white/[0.06] px-1.5 py-0.5 text-sm text-glow">.env.local</code> file:
          </p>
          <ul className="space-y-1 rounded-input bg-depth-1 p-4 text-left text-sm font-mono text-glow">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
          <p className="text-sm text-white/30">
            Copy <code className="rounded-badge bg-white/[0.06] px-1 py-0.5">.env.example</code> to{" "}
            <code className="rounded-badge bg-white/[0.06] px-1 py-0.5">.env.local</code> and fill in the values.
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
    "w-full rounded-input bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200 border border-white/[0.06] focus:border-glow/30 focus:bg-white/[0.06] focus:ring-1 focus:ring-glow/15";
  const selectCls =
    "w-full rounded-input bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-all duration-200 border border-white/[0.06] focus:border-glow/30 focus:ring-1 focus:ring-glow/15";

  /* ----------------------------- Auth session ----------------------------- */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
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
      .select("id, full_name, my_linkedin_url, resume_url, avatar_url, resume_text")
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
        resume_text: null,
      });
      setPage("onboarding");
      return;
    }

    setProfile(data as Profile);
    setDisplayName((data as any)?.full_name ?? "");
    setMyLinkedInUrl((data as any)?.my_linkedin_url ?? "");
    setNewEmail(session?.user?.email ?? "");

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

      const updatePayload: { resume_url: string; resume_text?: string } = { resume_url: publicUrl };

      if (ext === "pdf") {
        try {
          const text = await parsePdfToText(file);
          updatePayload.resume_text = text;
        } catch {
          toast.info("Resume uploaded, but text extraction failed. You can re-parse later.");
        }
      } else {
        toast.info("Non-PDF resume uploaded. Text extraction is only available for PDF files.");
      }

      const { error } = await supabase.from("profiles").update(updatePayload).eq("id", session.user.id);
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

  async function reparseResume() {
    if (!session?.user?.id || !profile?.resume_url) return;

    if (!profile.resume_url.toLowerCase().endsWith(".pdf")) {
      toast.error("Re-parse is only available for PDF resumes.");
      return;
    }

    setSavingProfile(true);
    try {
      const text = await parsePdfFromUrl(profile.resume_url);
      const { error } = await supabase
        .from("profiles")
        .update({ resume_text: text })
        .eq("id", session.user.id);
      if (error) throw error;
      await loadProfile();
      toast.success("Resume text re-parsed.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to re-parse resume.");
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
    `px-3 py-2 rounded-button text-sm font-medium cursor-pointer transition-all duration-200 ${
      active
        ? "bg-glow/10 text-glow"
        : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]"
    }`;

  return (
    <div className="min-h-screen text-white">
      {/* Living canvas background */}
      <div className="fixed inset-0 -z-10 bg-depth-0" />
      <div className="fixed inset-0 -z-10 living-canvas" />

      {/* Top Nav */}
      <nav className="sticky top-0 z-50 bg-depth-0/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => { setPage("contacts"); setSelectedContactId(""); }}
              className="mr-2 flex items-center gap-2 md:mr-4 cursor-pointer"
            >
              <svg className="h-7 w-7 text-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <path d="M6 1v3" /><path d="M10 1v3" /><path d="M14 1v3" />
              </svg>
              <span className="hidden text-base font-bold text-white md:inline">Coffee?</span>
            </button>

            {/* Desktop nav links */}
            <div className="hidden items-center gap-1 md:flex">
              <div className="relative">
                <button
                  onClick={() => setNetworkDropdownOpen((v) => !v)}
                  className={navLinkCls(page === "contacts" || page === "contact_details" || page === "network_watchlist")}
                >
                  Network
                  <svg className="ml-1 inline h-3 w-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {networkDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNetworkDropdownOpen(false)} />
                    <div className="absolute left-0 z-50 mt-2 w-48 overflow-hidden rounded-section bg-depth-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                      <button
                        onClick={() => { setPage("contacts"); setSelectedContactId(""); setNetworkDropdownOpen(false); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer"
                      >
                        <svg className="h-4 w-4 text-glow/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Network
                      </button>
                      <div className="mx-3 h-px bg-white/[0.06]" />
                      <button
                        onClick={() => { setPage("network_watchlist"); setSelectedContactId(""); setNetworkDropdownOpen(false); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer"
                      >
                        <svg className="h-4 w-4 text-glow/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
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
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-glow px-1 text-[10px] font-bold text-depth-0">
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
                className="flex items-center gap-2 rounded-button bg-white/[0.04] px-2 py-1.5 transition-colors hover:bg-white/[0.08] md:gap-3 md:px-3 md:py-2 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-button bg-glow/15 text-xs font-bold text-glow">
                  {avatarText}
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-sm font-medium text-white">{profileLabel}</div>
                  <div className="font-data text-white/30">{session?.user?.email}</div>
                </div>
                <svg className="h-3 w-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-section bg-depth-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                    <button
                      onClick={() => { setPage("settings"); setSelectedContactId(""); setProfileMenuOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer"
                    >
                      <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    <div className="mx-3 h-px bg-white/[0.06]" />
                    <button
                      onClick={() => { setProfileMenuOpen(false); signOut(); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer"
                    >
                      <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-button bg-white/[0.04] p-2 transition-colors hover:bg-white/[0.08] md:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <div className="grid gap-1">
                <span className="h-0.5 w-4 rounded bg-white/60" />
                <span className="h-0.5 w-4 rounded bg-white/60" />
                <span className="h-0.5 w-4 rounded bg-white/60" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/[0.06] px-4 pb-4 pt-2 md:hidden">
            <button onClick={() => { setPage("contacts"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "contacts" || page === "contact_details")} mb-1 block w-full text-left`}>Network</button>
            <button onClick={() => { setPage("network_watchlist"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "network_watchlist")} mb-1 block w-full text-left`}>Watchlist</button>
            <button onClick={() => { setPage("outreach_emails"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "outreach_emails")} mb-1 block w-full text-left relative`}>Outreach{dueOutreachCount > 0 && <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-glow px-1 text-[10px] font-bold text-depth-0">{dueOutreachCount}</span>}</button>
            <button onClick={() => { setPage("applications"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "applications")} mb-1 block w-full text-left`}>Applications</button>
            <button onClick={() => { setPage("settings"); setSelectedContactId(""); setMobileMenuOpen(false); }} className={`${navLinkCls(page === "settings")} mb-1 block w-full text-left`}>Settings</button>
          </div>
        )}
      </nav>

      <div className="page-enter">

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
            profile={profile}
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
            selectCls={selectCls}
            reparseResume={reparseResume}
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
                className="rounded-button border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="rounded-button bg-glow/90 px-4 py-2.5 text-sm font-semibold text-depth-0 shadow-[0_0_24px_rgba(0,229,255,0.2)] transition-all hover:bg-glow cursor-pointer"
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
