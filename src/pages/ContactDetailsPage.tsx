import Card from "../components/ui/Card";
import type { Contact, ContactMeeting } from "../types";
import { ensureUrl } from "../lib/utils";

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
    <div className="mx-auto max-w-7xl px-6 py-8">
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
              className="rounded-button bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
            >
              Back
            </button>
          }
        >
          <p className="text-sm text-white/40">
            Like a conversation you forgot to save. Return to Network and try again.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact info — 1/3 */}
          <div className="lg:col-span-1">
            <Card
              title="Connection"
              right={
                <button
                  onClick={() => setPage("contacts")}
                  className="flex items-center gap-1.5 rounded-button bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              }
            >
              <div className="grid gap-3">
                <div className="rounded-input bg-depth-0/40 p-4">
                  <div className="text-sm font-semibold text-white">
                    {[selectedContact.first_name, selectedContact.last_name].filter(Boolean).join(" ") || "\u2014"}
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    {[selectedContact.company, selectedContact.title].filter(Boolean).join(" \u2022 ") || "\u2014"}
                  </div>
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="rounded-input bg-depth-0/30 p-3">
                    <div className="text-xs text-white/30">Email</div>
                    <div className="mt-1 font-data text-white/60">{selectedContact.email ?? "\u2014"}</div>
                  </div>
                  <div className="rounded-input bg-depth-0/30 p-3">
                    <div className="text-xs text-white/30">Phone</div>
                    <div className="mt-1 font-data text-white/60">{selectedContact.phone ?? "\u2014"}</div>
                  </div>
                  <div className="rounded-input bg-depth-0/30 p-3">
                    <div className="text-xs text-white/30">LinkedIn</div>
                    <div className="mt-1">
                      {selectedContact.linkedin_url ? (
                        <a
                          className="text-sm font-medium text-glow hover:underline"
                          href={ensureUrl(selectedContact.linkedin_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open profile
                        </a>
                      ) : (
                        <span className="text-white/60">{"\u2014"}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => openEdit(selectedContact)}
                    className="w-full rounded-button bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
                  >
                    Edit Contact
                  </button>
                  <button
                    onClick={() => deleteContact(selectedContact.id)}
                    className="w-full rounded-button bg-danger/[0.06] px-4 py-2.5 text-sm font-medium text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Meeting notes — 2/3 */}
          <div className="lg:col-span-2">
            <Card
              title="Meeting notes"
              subtitle="Each meeting is a folder labeled by date."
              right={
                <button
                  onClick={() => loadMeetings(selectedContact.id)}
                  className="rounded-button bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
                >
                  Refresh
                </button>
              }
            >
              {/* Add meeting form */}
              <div className="rounded-input bg-depth-0/30 p-4">
                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  <div>
                    <div className="mb-1 text-xs font-medium text-white/35">Meeting date</div>
                    <input className={inputCls} type="date" value={meetingDraftDate} onChange={(e) => setMeetingDraftDate(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="mb-1 text-xs font-medium text-white/35">Label (optional)</div>
                    <input
                      className={inputCls}
                      placeholder='e.g. "Coffee chat" or "Follow-up call"'
                      value={meetingDraftTitle}
                      onChange={(e) => setMeetingDraftTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={addMeeting}
                    className="rounded-button bg-glow/90 px-4 py-2.5 text-sm font-semibold text-depth-0 shadow-[0_0_24px_rgba(0,229,255,0.2)] transition-all hover:bg-glow cursor-pointer"
                  >
                    Add meeting
                  </button>
                </div>
              </div>

              {/* Meeting list */}
              <div className="mt-4 rounded-section bg-depth-0/30">
                {loadingMeetings ? (
                  <div className="px-4 py-8 text-center text-sm text-white/40">Loading meetings...</div>
                ) : meetings.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm text-white/50">No meetings logged yet.</p>
                    <p className="mt-1 text-xs text-white/25">
                      Every great relationship started with one conversation.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
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
                              <div className="inline-flex shrink-0 items-center gap-2 rounded-badge bg-glow/[0.06] px-3 py-1.5 text-xs font-medium text-glow/80">
                                <span className="h-1.5 w-1.5 rounded-full bg-glow shadow-[0_0_6px_rgba(0,229,255,0.4)]" />
                                <span className="font-data">{formatDateLabel(draft.meeting_date || m.meeting_date)}</span>
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
                                className="rounded-button bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
                              >
                                {saving ? "Saving..." : isDirty ? "Save" : "Saved"}
                              </button>

                              <button
                                onClick={() => deleteMeeting(m.id)}
                                disabled={deleting}
                                className="rounded-button bg-danger/[0.06] px-3 py-2 text-sm font-medium text-danger/70 transition-colors hover:bg-danger/10 disabled:opacity-30 cursor-pointer"
                              >
                                {deleting ? "..." : "Delete"}
                              </button>
                            </div>
                          </div>

                          <div className="mt-3">
                            <textarea
                              className="min-h-[160px] w-full rounded-input bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 border border-white/[0.04] focus:border-glow/20 focus:bg-white/[0.05] focus:ring-1 focus:ring-glow/10"
                              placeholder="What you discussed, next steps, reminders, personal details, follow-ups..."
                              value={draft.notes}
                              onChange={(e) => setMeetingField(m.id, "notes", e.target.value)}
                            />
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
