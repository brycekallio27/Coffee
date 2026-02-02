import { useState } from "react";
import type { Contact } from "../types";
import Card from "../components/ui/Card";
import { toast } from "sonner";

interface OutreachEmailsPageProps {
  contacts: Contact[];
  inputCls: string;
  selectCls: string;
}

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

export default function OutreachEmailsPage({
  contacts,
  inputCls,
  selectCls,
}: OutreachEmailsPageProps) {
  const [selectedContactId, setSelectedContactId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;

  const contactDisplayName = (c: Contact) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed";
    return c.company ? `${name} — ${c.company}` : name;
  };

  const resolvePlaceholders = (text: string) => {
    const name =
      [selectedContact?.first_name, selectedContact?.last_name].filter(Boolean).join(" ") ||
      "{name}";
    const company = selectedContact?.company || "{company}";
    return text.replace(/\{name\}/g, name).replace(/\{company\}/g, company);
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setSubject(resolvePlaceholders(tpl.subject));
    setMessage(resolvePlaceholders(tpl.message));
  };

  const handleCopy = async () => {
    if (!subject.trim() && !message.trim()) {
      toast.error("Nothing to copy — write a subject or message first.");
      return;
    }
    const text = `Subject: ${subject}\n\n${message}`;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleClear = () => {
    setSelectedContactId("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
      {/* ── Left column: compose ─────────────────────────────── */}
      <div className="lg:col-span-1">
        <Card title="Compose" subtitle="Draft an outreach email.">
          <div className="grid gap-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">Contact</div>
              <select
                className={selectCls}
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
              >
                <option value="">Select a contact…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contactDisplayName(c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">Subject</div>
              <input
                className={inputCls}
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-white/70">Message</div>
              <textarea
                className={inputCls + " min-h-[160px] resize-y"}
                placeholder="Write your message here…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="mt-2 flex gap-2">
              <button
                onClick={handleCopy}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.25)] hover:brightness-110"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={handleClear}
                className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Right column: templates ──────────────────────────── */}
      <div className="lg:col-span-2">
        <Card
          title="Email Templates"
          subtitle="Click a template to auto-fill the compose form."
        >
          <div className="grid gap-3">
            {TEMPLATES.map((tpl) => (
              <div
                key={tpl.key}
                onClick={() => applyTemplate(tpl)}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08] cursor-pointer transition"
              >
                <div className="text-sm font-semibold text-white">{tpl.title}</div>
                <div className="mt-1 text-xs text-white/60">{tpl.description}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
