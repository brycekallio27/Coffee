import Card from "../components/ui/Card";
import type { Profile, FieldMap } from "../types";

interface SettingsPageProps {
  displayName: string;
  setDisplayName: (v: string) => void;
  myLinkedInUrl: string;
  setMyLinkedInUrl: (v: string) => void;
  newEmail: string;
  setNewEmail: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  profile: Profile | null;
  savingProfile: boolean;
  saveProfile: () => void;
  uploadResume: (file: File) => void;
  importFileName: string;
  importRows: Record<string, string>[];
  importMap: FieldMap;
  importing: boolean;
  onPickCsv: (file: File) => void;
  importIntoSupabase: () => void;
  inputCls: string;
}

export default function SettingsPage({
  displayName,
  setDisplayName,
  myLinkedInUrl,
  setMyLinkedInUrl,
  newEmail,
  setNewEmail,
  newPassword,
  setNewPassword,
  profile,
  savingProfile,
  saveProfile,
  uploadResume,
  importFileName,
  importRows,
  importMap,
  importing,
  onPickCsv,
  importIntoSupabase,
  inputCls,
}: SettingsPageProps) {
  return (
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
                  {savingProfile ? "Saving\u2026" : "Save profile"}
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
                {savingProfile ? "Saving\u2026" : "Update account"}
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
                      .map(([k, v]) => `${k} \u2190 ${v}`)
                      .join(" \u2022 ") || "none"}
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
                            {name || "\u2014"}
                          </div>
                          <div className="truncate" title={company}>
                            {company || "\u2014"}
                          </div>
                          <div className="truncate" title={title}>
                            {title || "\u2014"}
                          </div>
                          <div className="truncate" title={email}>
                            {email || "\u2014"}
                          </div>
                          <div className="truncate" title={phone}>
                            {phone || "\u2014"}
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
                      {importing ? "Importing\u2026" : "Import into Coffee?"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-white/60">
                    If LinkedIn doesn't import: Sheets often exports only visible hyperlink text, not the URL. Import, then add LinkedIn via Edit.
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
