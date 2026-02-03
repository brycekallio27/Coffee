import Card from "../components/ui/Card";
import type { Application, Contact } from "../types";

interface ApplicationsPageProps {
  applications: Application[];
  loadingApps: boolean;
  loadApplications: () => void;
  contacts: Contact[];
  appCompany: string;
  setAppCompany: (v: string) => void;
  appLink: string;
  setAppLink: (v: string) => void;
  appDate: string;
  setAppDate: (v: string) => void;
  appStatus: string;
  setAppStatus: (v: string) => void;
  appContactId: string;
  setAppContactId: (v: string) => void;
  savingApp: boolean;
  editingAppId: string | null;
  saveApplication: () => void;
  cancelEditApp: () => void;
  startEditApp: (a: Application) => void;
  deleteApplication: (id: string) => void;
  inputCls: string;
  selectCls: string;
}

export default function ApplicationsPage({
  applications,
  loadingApps,
  loadApplications,
  contacts,
  appCompany,
  setAppCompany,
  appLink,
  setAppLink,
  appDate,
  setAppDate,
  appStatus,
  setAppStatus,
  appContactId,
  setAppContactId,
  savingApp,
  editingAppId,
  saveApplication,
  cancelEditApp,
  startEditApp,
  deleteApplication,
  inputCls,
  selectCls,
}: ApplicationsPageProps) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card title={editingAppId ? "Edit Application" : "Track Application"} subtitle="Keep tabs on where you've applied.">
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
  );
}
