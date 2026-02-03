import Card from "../components/ui/Card";
import type { Contact, ContactMeeting } from "../types";

interface ContactDetailsPageProps {
  selectedContact: Contact | null;
  meetings: ContactMeeting[];
  loadingMeetings: boolean;
  meetingEdits: Record<string, { meeting_date: string; title: string; notes: string }>;
  meetingDirty: Record<string, boolean>;
  meetingSavingId: string;
  meetingDeletingId: string;
  meetingDraftDate: string;
  setMeetingDraftDate: (v: string) => void;
  meetingDraftTitle: string;
  setMeetingDraftTitle: (v: string) => void;
  addMeeting: () => void;
  saveMeeting: (meetingId: string) => void;
  deleteMeeting: (meetingId: string) => void;
  setMeetingField: (meetingId: string, key: "meeting_date" | "title" | "notes", value: string) => void;
  loadMeetings: (contactId: string) => void;
  openEdit: (c: Contact) => void;
  deleteContact: (contactId: string) => void;
  setPage: (page: "contacts") => void;
  setSelectedContactId: (id: string) => void;
  inputCls: string;
  formatDateLabel: (iso: string) => string;
}

export default function ContactDetailsPage({
  selectedContact,
  meetings,
  loadingMeetings,
  meetingEdits,
  meetingDirty,
  meetingSavingId,
  meetingDeletingId,
  meetingDraftDate,
  setMeetingDraftDate,
  meetingDraftTitle,
  setMeetingDraftTitle,
  addMeeting,
  saveMeeting,
  deleteMeeting,
  setMeetingField,
  loadMeetings,
  openEdit,
  deleteContact,
  setPage,
  setSelectedContactId,
  inputCls,
  formatDateLabel,
}: ContactDetailsPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {!selectedContact ? (
        <Card
          title="Connection not found"
          subtitle="This can happen if the person was deleted or hasn't loaded yet."
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
  );
}
