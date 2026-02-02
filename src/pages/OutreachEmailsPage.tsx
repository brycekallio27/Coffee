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
import type { Contact, ScheduledOutreach } from "../types";
import Card from "../components/ui/Card";
import { toast } from "sonner";

interface OutreachEmailsPageProps {
  contacts: Contact[];
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
    subject: "Introduction — {name}, nice to connect!",
    message:
      "Hi {name},\n\nMy name is [Your Name] and I came across your profile at {company}. I'm very interested in the work your team is doing and would love to learn more about your experience there.\n\nWould you be open to a brief conversation? I'd really appreciate any insights you might share.\n\nBest regards,\n[Your Name]",
  },
  {
    key: "coffee_chat",
    title: "Coffee Chat Request",
    description: "Ask a contact to meet for coffee or a virtual chat.",
    subject: "Coffee chat? — would love to hear about {company}",
    message:
      "Hi {name},\n\nI hope this message finds you well! I've been exploring opportunities in the {company} space and would love to pick your brain over a quick coffee (virtual or in-person).\n\nWould you have 20-30 minutes sometime this week or next? I'm happy to work around your schedule.\n\nThanks so much,\n[Your Name]",
  },
  {
    key: "follow_up",
    title: "Follow Up",
    description: "Follow up after an initial meeting or conversation.",
    subject: "Great chatting — following up, {name}",
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

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email", icon: "\u2709\uFE0F" },
  { value: "sms", label: "SMS", icon: "\uD83D\uDCF1" },
  { value: "linkedin", label: "LinkedIn", icon: "\uD83D\uDD17" },
] as const;

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-200",
  sms: "bg-green-500/20 text-green-200",
  linkedin: "bg-cyan-500/20 text-cyan-200",
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  scheduled: { cls: "bg-purple-500/20 text-purple-200", label: "Scheduled" },
  due: { cls: "bg-amber-500/20 text-amber-200", label: "Due Now" },
  sent: { cls: "bg-green-500/20 text-green-200", label: "Sent" },
  skipped: { cls: "bg-white/10 text-white/60", label: "Skipped" },
};

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
    toast.info("Message copied to clipboard. Paste it in LinkedIn.");
    if (contact?.linkedin_url) {
      window.open(contact.linkedin_url, "_blank");
    } else {
      window.open("https://www.linkedin.com/messaging/", "_blank");
    }
  }
}

/* ── Component ────────────────────────────────────────── */

export default function OutreachEmailsPage({
  contacts,
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

  const selectedContact =
    contacts.find((c) => c.id === selectedContactId) ?? null;

  /* ── helpers ────────────────────────────────────────── */

  const contactDisplayName = (c: Contact) => {
    const name =
      [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed";
    return c.company ? `${name} \u2014 ${c.company}` : name;
  };

  const contactNameById = (id: string | null) => {
    if (!id) return "Unknown";
    const c = contacts.find((x) => x.id === id);
    if (!c) return "Unknown";
    return [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed";
  };

  const resolvePlaceholders = (text: string) => {
    const name =
      [selectedContact?.first_name, selectedContact?.last_name]
        .filter(Boolean)
        .join(" ") || "{name}";
    const company = selectedContact?.company || "{company}";
    return text.replace(/\{name\}/g, name).replace(/\{company\}/g, company);
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
      // Table may not exist yet — silently handle
      if (!error.message.includes("does not exist")) {
        toast.error("Failed to load outreach: " + error.message);
      }
      setItems([]);
    } else {
      setItems(data as ScheduledOutreach[]);

      // Toast for due items
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
      contact_id: selectedContactId || null,
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
    // Convert ISO to datetime-local format
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

  /* ── load on mount ──────────────────────────────────── */

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  /* ── derived ────────────────────────────────────────── */

  const scheduledItems = items.filter((i) => i.status === "scheduled");
  const completedItems = items.filter(
    (i) => i.status === "sent" || i.status === "skipped",
  );

  /* ── render ─────────────────────────────────────────── */

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
      {/* ── Left column: compose ──────────────────────────── */}
      <div className="lg:col-span-1 space-y-6">
        <Card
          title={editingId ? "Edit Outreach" : "Compose"}
          subtitle="Draft and schedule outreach messages."
        >
          <div className="grid gap-3">
            {/* Contact */}
            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">
                Contact
              </div>
              <select
                className={selectCls}
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
              >
                <option value="">Select a contact\u2026</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contactDisplayName(c)}
                  </option>
                ))}
              </select>
            </div>

            {/* Channel */}
            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">
                Channel
              </div>
              <div className="flex gap-2">
                {CHANNEL_OPTIONS.map((ch) => (
                  <button
                    key={ch.value}
                    onClick={() => setChannel(ch.value)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      channel === ch.value
                        ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {ch.icon} {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject (email only) */}
            {channel === "email" && (
              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">
                  Subject
                </div>
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
              <div className="mb-1 text-xs font-semibold text-white/70">
                Message
              </div>
              <textarea
                className={inputCls + " min-h-[140px] resize-y"}
                placeholder="Write your message here\u2026"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Schedule date/time */}
            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">
                Schedule for
              </div>
              <input
                className={inputCls}
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div className="mt-2 flex gap-2">
              <button
                onClick={saveItem}
                disabled={saving}
                className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.25)] hover:brightness-110 disabled:opacity-50"
              >
                {saving
                  ? "Saving\u2026"
                  : editingId
                    ? "Update"
                    : "Schedule"}
              </button>
              <button
                onClick={handleSendNow}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
              >
                Send Now
              </button>
              <button
                onClick={resetForm}
                className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </div>
        </Card>

        {/* Templates (collapsible) */}
        <Card
          title="Templates"
          subtitle="Click to auto-fill compose form."
          right={
            <button
              onClick={() => setShowTemplates((v) => !v)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"
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
                  className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"
                >
                  <div className="text-sm font-semibold text-white">
                    {tpl.title}
                  </div>
                  <div className="mt-0.5 text-xs text-white/60">
                    {tpl.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Right column: scheduled outreach ───────────────── */}
      <div className="lg:col-span-2 space-y-6">
        <Card
          title="Upcoming Outreach"
          subtitle={
            loading
              ? "Loading\u2026"
              : `${scheduledItems.length} scheduled`
          }
          right={
            <button
              onClick={loadItems}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Refresh
            </button>
          }
        >
          {loading ? (
            <div className="py-4 text-sm text-white/70">Loading\u2026</div>
          ) : scheduledItems.length === 0 ? (
            <div className="py-4 text-sm text-white/70">
              No scheduled outreach yet. Compose a message and hit Schedule.
            </div>
          ) : (
            <div className="grid gap-3">
              {scheduledItems.map((item) => {
                const due = isDue(item);
                const statusInfo = due
                  ? STATUS_BADGE.due
                  : STATUS_BADGE[item.status] ?? STATUS_BADGE.scheduled;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 transition ${
                      due
                        ? "border-amber-400/30 bg-amber-500/[0.06]"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">
                            {contactNameById(item.contact_id)}
                          </span>
                          <span
                            className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${CHANNEL_BADGE[item.channel] ?? "bg-white/10 text-white/90"}`}
                          >
                            {item.channel.toUpperCase()}
                          </span>
                          <span
                            className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${statusInfo.cls}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        {item.subject && (
                          <div className="mt-1 text-sm text-white/80 truncate">
                            {item.subject}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-white/50 line-clamp-2">
                          {item.message}
                        </div>
                        <div className="mt-2 text-xs text-white/40">
                          {new Date(item.scheduled_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSendItem(item)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          due
                            ? "bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 text-white shadow-[0_5px_15px_rgba(56,189,248,0.2)] hover:brightness-110"
                            : "border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                        }`}
                      >
                        Send
                      </button>
                      <button
                        onClick={() => markStatus(item.id, "skipped")}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-300/70 hover:text-rose-300"
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

        {/* Completed / skipped history */}
        {completedItems.length > 0 && (
          <Card
            title="History"
            subtitle={`${completedItems.length} completed`}
          >
            <div className="grid gap-2">
              {completedItems.map((item) => {
                const statusInfo =
                  STATUS_BADGE[item.status] ?? STATUS_BADGE.sent;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white/80 truncate">
                          {contactNameById(item.contact_id)}
                        </span>
                        <span
                          className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${CHANNEL_BADGE[item.channel] ?? "bg-white/10 text-white/90"}`}
                        >
                          {item.channel.toUpperCase()}
                        </span>
                        <span
                          className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${statusInfo.cls}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-white/40">
                        {new Date(item.scheduled_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="ml-2 text-xs font-semibold text-rose-300/70 hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
