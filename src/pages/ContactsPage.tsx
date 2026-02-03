import Card from "../components/ui/Card";
import type { Contact } from "../types";

interface ContactsPageProps {
  contacts: Contact[];
  loadingContacts: boolean;
  loadContacts: () => void;
  search: string;
  setSearch: (v: string) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (v: string) => void;
  addContact: () => void;
  openDetails: (contactId: string) => void;
  openEdit: (c: Contact) => void;
  deleteContact: (contactId: string) => void;
  inputCls: string;
}

export default function ContactsPage({
  contacts,
  loadingContacts,
  loadContacts,
  search,
  setSearch,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  company,
  setCompany,
  jobTitle,
  setJobTitle,
  contactEmail,
  setContactEmail,
  phone,
  setPhone,
  linkedinUrl,
  setLinkedinUrl,
  addContact,
  openDetails,
  openEdit,
  deleteContact,
  inputCls,
}: ContactsPageProps) {
  return (
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
          subtitle={loadingContacts ? "Loading…" : `${contacts.length} connection(s)`}
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
            ) : contacts.length === 0 ? (
              <div className="px-4 py-4 text-sm text-white/70">No connections found.</div>
            ) : (
              contacts.map((c) => {
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
  );
}
