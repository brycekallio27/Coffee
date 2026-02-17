/*
  Supabase table used by this page:

  create table if not exists public.scheduled_outreach (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete set null,
    channel text not null,
    subject text,
    message text not null,
    scheduled_at timestamptz not null,
    status text not null default 'scheduled',
    created_at timestamptz not null default now()
  );

  alter table public.scheduled_outreach enable row level security;

  create policy "Users can manage their own scheduled outreach"
    on public.scheduled_outreach for all
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);
*/

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Contact, Profile, ScheduledOutreach, WatchlistTarget } from "../types";
import Card from "../components/ui/Card";
import { toast } from "sonner";
import {
  checkOllamaAvailable,
  getOllamaModels,
  fetchLinkedInPreview,
  personalizeOutreachWithOllama,
} from "../lib/resumeUtils";

interface OutreachEmailsPageProps {
  contacts: Contact[];
  profile: Profile | null;
  inputCls: string;
  selectCls: string;
}

/* ── Templates ────────────────────────────────────────── */

const TEMPLATES: {
  key: string;
  title: string;
  description: string;
  subject: string;
  message: string;
}[] = [
  {
    key: "introduction",
    title: "Introduction",
    description: "Cold outreach introducing yourself and your background.",
    subject: "Introduction \u2014 {name}, nice to connect!",
    message:
      "Hi {name},\n\nMy name is [Your Name] and I came across your profile at {company}. I'm very interested in the work your team is doing and would love to learn more about your experience there.\n\nWould you be open to a brief conversation? I'd really appreciate any insights you might share.\n\nBest regards,\n[Your Name]",
  },
  {
    key: "coffee_chat",
    title: "Coffee Chat Request",
    description: "Ask a contact to meet for coffee or a virtual chat.",
    subject: "Coffee chat? \u2014 would love to hear about {company}",
    message:
      "Hi {name},\n\nI hope this message finds you well! I've been exploring opportunities in the {company} space and would love to pick your brain over a quick coffee (virtual or in-person).\n\nWould you have 20-30 minutes sometime this week or next? I'm happy to work around your schedule.\n\nThanks so much,\n[Your Name]",
  },
  {
    key: "follow_up",
    title: "Follow Up",
    description: "Follow up after an initial meeting or conversation.",
    subject: "Great chatting \u2014 following up, {name}",
    message:
      "Hi {name},\n\nIt was great speaking with you recently. I really enjoyed learning more about your role at {company} and the insights you shared.\n\nI wanted to follow up on a few points from our conversation and see if there are any next steps I can take. Please let me know if there's anything I can do on my end.\n\nLooking forward to staying in touch!\n\nBest,\n[Your Name]",
  },
  {
    key: "thank_you",
    title: "Thank You",
    description: "Say thanks after a meeting, call, or referral.",
    subject: "Thank you, {name}!",
    message:
      "Hi {name},\n\nThank you so much for taking the time to chat with me. I really appreciate the advice and perspective you shared about {company} and the industry.\n\nYour guidance has been incredibly helpful, and I'll be sure to keep you posted on how things progress.\n\nWarmly,\n[Your Name]",
  },
];

const AUTO_SEND_CHANNELS = [
  { value: "email", label: "Email", description: "Auto-sends via Mail.app" },
  { value: "sms", label: "iMessage", description: "Auto-sends via Messages" },
] as const;

const MANUAL_CHANNELS = [
  { value: "linkedin", label: "LinkedIn", description: "Opens chat, you paste" },
] as const;

const isAutoSendChannel = (ch: string) => AUTO_SEND_CHANNELS.some(c => c.value === ch);

/* ── Deep link helpers ────────────────────────────────── */

function openOutreach(
  channel: string,
  contact: Contact | null,
  subject: string,
  message: string,
) {
  if (channel === "email") {
    const mailto = `mailto:${contact?.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailto, "_self");
  } else if (channel === "sms") {
    const sms = `sms:${contact?.phone ?? ""}&body=${encodeURIComponent(message)}`;
    window.open(sms, "_self");
  } else if (channel === "linkedin") {
    navigator.clipboard.writeText(message);
    const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || "contact";
    toast.success(`Message copied! Opening ${contactName}'s profile \u2014 click Message and paste.`);
    if (contact?.linkedin_url) {
      window.open(contact.linkedin_url, "_blank");
    } else {
      toast.error("No LinkedIn URL for this contact. Opening LinkedIn messaging.");
      window.open("https://www.linkedin.com/messaging/", "_blank");
    }
  }
}

/* ── Component ────────────────────────────────────────── */

export default function OutreachEmailsPage({
  contacts,
  profile,
  inputCls,
  selectCls,
}: OutreachEmailsPageProps) {
  /* ── compose state ──────────────────────────────────── */
  const [selectedContactId, setSelectedContactId] = useState("");
  const [channel, setChannel] = useState<string>("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  /* ── CRUD state ─────────────────────────────────────── */
  const [items, setItems] = useState<ScheduledOutreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ── templates toggle ───────────────────────────────── */
  const [showTemplates, setShowTemplates] = useState(false);

  /* ── AI personalization ─────────────────────────────── */
  const [personalizing, setPersonalizing] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  /* ── watchlist targets ─────────────────────────────── */
  const [watchlistTargets, setWatchlistTargets] = useState<WatchlistTarget[]>([]);

  const isWatchlistSelection = selectedContactId.startsWith("w:");
  const selectedContact = isWatchlistSelection
    ? null
    : contacts.find((c) => c.id === selectedContactId) ?? null;
  const selectedWatchlistTarget = isWatchlistSelection
    ? watchlistTargets.find((t) => t.id === selectedContactId.slice(2)) ?? null
    : null;

  /* ── helpers ────────────────────────────────────────── */

  const contactDisplayName = (c: Contact) => {
    const name =
      [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed";
    return c.company ? `${name} \u2014 ${c.company}` : name;
  };

  const contactNameById = (id: string | null) => {
    if (!id) return "Unknown";
    const c = contacts.find((x) => x.id === id);
    if (c) return [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed";
    const t = watchlistTargets.find((x) => x.id === id);
    if (t) return t.person_name;
    return "Unknown";
  };

  const resolvePlaceholders = (text: string) => {
    const name = selectedWatchlistTarget
      ? selectedWatchlistTarget.person_name
      : [selectedContact?.first_name, selectedContact?.last_name]
          .filter(Boolean)
          .join(" ") || "{name}";
    const company =
      selectedWatchlistTarget?.company || selectedContact?.company || "{company}";
    const background = profile?.resume_text
      ? profile.resume_text.slice(0, 200).trim()
      : "{background}";
    return text
      .replace(/\{name\}/g, name)
      .replace(/\{company\}/g, company)
      .replace(/\{background\}/g, background);
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setSubject(resolvePlaceholders(tpl.subject));
    setMessage(resolvePlaceholders(tpl.message));
    setShowTemplates(false);
  };

  const resetForm = () => {
    setSelectedContactId("");
    setChannel("email");
    setSubject("");
    setMessage("");
    setScheduledAt("");
    setEditingId(null);
  };

  const isDue = (item: ScheduledOutreach) =>
    item.status === "scheduled" && new Date(item.scheduled_at) <= new Date();

  /* ── CRUD ───────────────────────────────────────────── */

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_outreach")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (error) {
      if (!error.message.includes("does not exist")) {
        toast.error("Failed to load outreach: " + error.message);
      }
      setItems([]);
    } else {
      setItems(data as ScheduledOutreach[]);

      const dueCount = (data as ScheduledOutreach[]).filter(
        (i) => i.status === "scheduled" && new Date(i.scheduled_at) <= new Date(),
      ).length;
      if (dueCount > 0) {
        toast.info(`You have ${dueCount} outreach message${dueCount > 1 ? "s" : ""} due now.`);
      }
    }
    setLoading(false);
  }, []);

  const saveItem = async () => {
    if (!message.trim()) {
      toast.error("Message is required.");
      return;
    }
    if (!scheduledAt) {
      toast.error("Pick a date and time to schedule.");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in.");
      setSaving(false);
      return;
    }

    const payload = {
      owner_id: user.id,
      contact_id: isWatchlistSelection ? null : selectedContactId || null,
      channel,
      subject: channel === "email" ? subject.trim() || null : null,
      message: message.trim(),
      scheduled_at: new Date(scheduledAt).toISOString(),
      status: "scheduled",
    };

    if (editingId) {
      const { error } = await supabase
        .from("scheduled_outreach")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        toast.error("Failed to update: " + error.message);
      } else {
        toast.success("Outreach updated!");
        resetForm();
        await loadItems();
      }
    } else {
      const { error } = await supabase
        .from("scheduled_outreach")
        .insert(payload);
      if (error) {
        toast.error("Failed to schedule: " + error.message);
      } else {
        toast.success("Outreach scheduled!");
        resetForm();
        await loadItems();
      }
    }
    setSaving(false);
  };

  const markStatus = async (id: string, status: "sent" | "skipped") => {
    const { error } = await supabase
      .from("scheduled_outreach")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status: " + error.message);
    } else {
      await loadItems();
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm("Delete this scheduled outreach?")) return;
    const { error } = await supabase
      .from("scheduled_outreach")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Deleted.");
      if (editingId === id) resetForm();
      await loadItems();
    }
  };

  const startEdit = (item: ScheduledOutreach) => {
    setEditingId(item.id);
    setSelectedContactId(item.contact_id ?? "");
    setChannel(item.channel);
    setSubject(item.subject ?? "");
    setMessage(item.message);
    const d = new Date(item.scheduled_at);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledAt(local);
  };

  const handleSendNow = () => {
    if (!message.trim()) {
      toast.error("Write a message first.");
      return;
    }
    openOutreach(channel, selectedContact, subject, message);
  };

  const handleSendItem = async (item: ScheduledOutreach) => {
    const contact =
      contacts.find((c) => c.id === item.contact_id) ?? null;
    openOutreach(item.channel, contact, item.subject ?? "", item.message);
    await markStatus(item.id, "sent");
  };

  const loadWatchlistTargets = useCallback(async () => {
    const { data } = await supabase
      .from("watchlist_targets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setWatchlistTargets(data as WatchlistTarget[]);
  }, []);

  /* ── load on mount ──────────────────────────────────── */

  useEffect(() => {
    loadItems();
    loadWatchlistTargets();
    checkOllamaAvailable().then((ok) => {
      setOllamaAvailable(ok);
      if (ok) getOllamaModels().then(setOllamaModels);
    });
  }, [loadItems, loadWatchlistTargets]);

  async function handlePersonalize() {
    if (!message.trim()) {
      toast.error("Write or apply a template message first.");
      return;
    }
    if (!ollamaAvailable) {
      toast.error("Ollama is not running. Start it with: ollama serve");
      return;
    }
    const model = ollamaModels[0];
    if (!model) {
      toast.error("No Ollama model found. Run: ollama pull llama3.2");
      return;
    }

    setPersonalizing(true);
    try {
      // Build contact info string
      let contactInfo = "";
      if (selectedContact) {
        const name = [selectedContact.first_name, selectedContact.last_name]
          .filter(Boolean)
          .join(" ");
        contactInfo = [
          name && `Name: ${name}`,
          selectedContact.company && `Company: ${selectedContact.company}`,
          selectedContact.title && `Title: ${selectedContact.title}`,
        ]
          .filter(Boolean)
          .join("\n");
      } else if (selectedWatchlistTarget) {
        contactInfo = [
          `Name: ${selectedWatchlistTarget.person_name}`,
          `Company: ${selectedWatchlistTarget.company}`,
          selectedWatchlistTarget.role && `Role: ${selectedWatchlistTarget.role}`,
        ]
          .filter(Boolean)
          .join("\n");
      }

      // Try to fetch LinkedIn preview
      const linkedInUrl =
        selectedContact?.linkedin_url || null;
      let linkedInPreview: string | null = null;
      if (linkedInUrl) {
        linkedInPreview = await fetchLinkedInPreview(linkedInUrl);
      }

      const result = await personalizeOutreachWithOllama(
        profile?.resume_text ?? null,
        contactInfo || "No contact selected",
        linkedInPreview,
        message,
        model
      );
      setMessage(result);
      if (linkedInPreview) {
        toast.success("Message personalized using your resume and their LinkedIn profile.");
      } else if (linkedInUrl) {
        toast.success("Message personalized. LinkedIn preview couldn't be fetched — used contact info instead.");
      } else {
        toast.success("Message personalized using your resume and contact info.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Personalization failed.");
    } finally {
      setPersonalizing(false);
    }
  }

  /* ── derived ────────────────────────────────────────── */

  const scheduledItems = items.filter((i) => i.status === "scheduled");
  const completedItems = items.filter(
    (i) => i.status === "sent" || i.status === "skipped",
  );

  /* ── Channel icon SVGs ──────────────────────────────── */

  const channelIcon = (ch: string) => {
    if (ch === "email") return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
    if (ch === "sms") return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    );
  };

  /* ── render ─────────────────────────────────────────── */

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-3">
      {/* Compose — 1/3 */}
      <div className="lg:col-span-1 space-y-6">
        <Card
          title={editingId ? "Edit Outreach" : "Compose"}
          subtitle="Draft and schedule outreach messages."
        >
          <div className="grid gap-3">
            {/* Contact */}
            <div>
              <div className="mb-1 text-xs font-medium text-white/35">Contact</div>
              <select
                className={selectCls}
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
              >
                <option value="">Select a contact...</option>
                {contacts.length > 0 && (
                  <optgroup label="Network">
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {contactDisplayName(c)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {watchlistTargets.length > 0 && (
                  <optgroup label="Watchlist">
                    {watchlistTargets.map((t) => (
                      <option key={`w:${t.id}`} value={`w:${t.id}`}>
                        {t.person_name}{t.company ? ` \u2014 ${t.company}` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Channel - Auto-send */}
            <div>
              <div className="mb-1 text-xs font-medium text-white/35">Auto-Send Channels</div>
              <div className="flex gap-2">
                {AUTO_SEND_CHANNELS.map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => setChannel(ch.value)}
                    className={`flex-1 rounded-input border px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                      channel === ch.value
                        ? "border-glow/30 bg-glow/[0.08] text-glow"
                        : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">{channelIcon(ch.value)} {ch.label}</div>
                    <div className="mt-0.5 text-[10px] font-normal text-white/25">{ch.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Channel - Manual (LinkedIn) */}
            <div>
              <div className="mb-1 text-xs font-medium text-white/35">Manual Channels</div>
              <div className="flex gap-2">
                {MANUAL_CHANNELS.map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => setChannel(ch.value)}
                    className={`flex-1 rounded-input border px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                      channel === ch.value
                        ? "border-glow/30 bg-glow/[0.08] text-glow"
                        : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">{channelIcon(ch.value)} {ch.label}</div>
                    <div className="mt-0.5 text-[10px] font-normal text-white/25">{ch.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject (email only) */}
            {channel === "email" && (
              <div>
                <div className="mb-1 text-xs font-medium text-white/35">Subject</div>
                <input
                  className={inputCls}
                  placeholder="Email subject line"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            {/* Message */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-white/35">Message</span>
                {ollamaAvailable && (
                  <button
                    onClick={handlePersonalize}
                    disabled={personalizing || !message.trim()}
                    className="flex items-center gap-1.5 rounded-button bg-glow/[0.08] px-2.5 py-1 text-xs font-medium text-glow transition-colors hover:bg-glow/15 disabled:opacity-40 cursor-pointer"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    {personalizing ? "Personalizing..." : "AI Personalize"}
                  </button>
                )}
              </div>
              <textarea
                className={inputCls + " min-h-[140px] resize-y"}
                placeholder="Write your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Schedule date/time */}
            {isAutoSendChannel(channel) && (
              <div>
                <div className="mb-1 text-xs font-medium text-white/35">Schedule for</div>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}

            {/* LinkedIn info banner */}
            {channel === "linkedin" && (
              <div className="rounded-input bg-glow/[0.04] px-3 py-2 text-xs text-white/40">
                LinkedIn doesn't support auto-sending. We'll open the chat and copy your message to clipboard \u2014 just paste and send.
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-2 flex gap-2">
              {isAutoSendChannel(channel) ? (
                <>
                  <button
                    onClick={saveItem}
                    disabled={saving}
                    className="flex-1 rounded-button bg-glow/90 px-4 py-2.5 text-sm font-semibold text-depth-0 shadow-[0_0_24px_rgba(0,229,255,0.2)] transition-all hover:bg-glow disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving..." : editingId ? "Update" : "Schedule"}
                  </button>
                  <button
                    onClick={handleSendNow}
                    className="rounded-button bg-glow/[0.08] px-3 py-2 text-sm font-medium text-glow transition-colors hover:bg-glow/15 cursor-pointer"
                  >
                    Send Now
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSendNow}
                  className="flex-1 rounded-button bg-glow/90 px-4 py-2.5 text-sm font-semibold text-depth-0 shadow-[0_0_24px_rgba(0,229,255,0.2)] transition-all hover:bg-glow cursor-pointer"
                >
                  Open LinkedIn Chat
                </button>
              )}
              <button
                onClick={resetForm}
                className="rounded-button bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </Card>

        {/* Templates */}
        <Card
          title="Templates"
          subtitle="Click to auto-fill compose form."
          right={
            <button
              onClick={() => setShowTemplates((v) => !v)}
              className="rounded-button bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.08] cursor-pointer"
            >
              {showTemplates ? "Hide" : "Show"}
            </button>
          }
        >
          {showTemplates && (
            <div className="grid gap-2">
              {TEMPLATES.map((tpl) => (
                <div
                  key={tpl.key}
                  onClick={() => applyTemplate(tpl)}
                  className="cursor-pointer rounded-input bg-depth-0/30 p-3 transition-all hover:bg-glow/[0.04]"
                >
                  <div className="text-sm font-medium text-white">{tpl.title}</div>
                  <div className="mt-0.5 text-xs text-white/30">{tpl.description}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Scheduled — 2/3 */}
      <div className="lg:col-span-2 space-y-6">
        <Card
          title="Upcoming Outreach"
          subtitle={loading ? "Loading..." : `${scheduledItems.length} scheduled`}
          right={
            <button
              onClick={loadItems}
              className="rounded-button bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
            >
              Refresh
            </button>
          }
        >
          {loading ? (
            <div className="py-8 text-center text-sm text-white/40">Loading outreach...</div>
          ) : scheduledItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-white/50">No scheduled outreach yet.</p>
              <p className="mt-1 text-xs text-white/25">
                The follow-up is where the magic happens.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {scheduledItems.map((item) => {
                const due = isDue(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-section p-4 transition-all ${
                      due
                        ? "bg-glow/[0.04] ring-1 ring-glow/15"
                        : "bg-depth-0/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">
                            {contactNameById(item.contact_id)}
                          </span>
                          <span className="inline-block rounded-badge bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-white/40">
                            {item.channel.toUpperCase()}
                          </span>
                          {due && (
                            <span className="inline-block rounded-badge bg-glow/[0.1] px-2 py-0.5 text-xs font-medium text-glow breathe">
                              Due Now
                            </span>
                          )}
                        </div>
                        {item.subject && (
                          <div className="mt-1 text-sm text-white/50 truncate">
                            {item.subject}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-white/25 line-clamp-2">
                          {item.message}
                        </div>
                        <div className="mt-2 font-data text-xs text-white/25">
                          {new Date(item.scheduled_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSendItem(item)}
                        className={`rounded-button px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          due
                            ? "bg-glow/90 text-depth-0 shadow-[0_0_16px_rgba(0,229,255,0.2)] hover:bg-glow"
                            : "bg-glow/[0.08] text-glow hover:bg-glow/15"
                        }`}
                      >
                        Send
                      </button>
                      <button
                        onClick={() => markStatus(item.id, "skipped")}
                        className="rounded-button bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/40 transition-colors hover:bg-white/[0.08] cursor-pointer"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded-button bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/40 transition-colors hover:bg-white/[0.08] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="rounded-button px-3 py-1.5 text-xs font-medium text-danger/50 transition-colors hover:text-danger cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* History */}
        {completedItems.length > 0 && (
          <Card
            title="History"
            subtitle={`${completedItems.length} completed`}
          >
            <div className="grid gap-2">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-input bg-depth-0/20 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/50 truncate">
                        {contactNameById(item.contact_id)}
                      </span>
                      <span className="inline-block rounded-badge bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-white/30">
                        {item.channel.toUpperCase()}
                      </span>
                      <span className={`inline-block rounded-badge px-2 py-0.5 text-xs font-medium ${
                        item.status === "sent" ? "bg-glow/[0.08] text-glow/60" : "bg-white/[0.04] text-white/30"
                      }`}>
                        {item.status === "sent" ? "Sent" : "Skipped"}
                      </span>
                    </div>
                    <div className="mt-0.5 font-data text-xs text-white/20">
                      {new Date(item.scheduled_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="ml-2 text-xs font-medium text-danger/50 transition-colors hover:text-danger cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
