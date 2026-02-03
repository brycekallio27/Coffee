import Card from "../components/ui/Card";
import AuthIllustration from "../components/ui/AuthIllustration";

interface PasswordRecoveryPageProps {
  recoveryNewPassword: string;
  setRecoveryNewPassword: (v: string) => void;
  recoverySaving: boolean;
  completePasswordRecovery: () => void;
  signOut: () => void;
  inputCls: string;
}

export default function PasswordRecoveryPage({
  recoveryNewPassword,
  setRecoveryNewPassword,
  recoverySaving,
  completePasswordRecovery,
  signOut,
  inputCls,
}: PasswordRecoveryPageProps) {
  return (
    <div className="relative min-h-screen text-white">
      <AuthIllustration />
      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-1 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <Card title="Set a new password" subtitle="You're in recovery mode. Choose a new password to finish.">
              <div className="grid gap-3">
                <input
                  className={inputCls}
                  placeholder="New password (min 6 chars)"
                  type="password"
                  value={recoveryNewPassword}
                  onChange={(e) => setRecoveryNewPassword(e.target.value)}
                />

                <button
                  onClick={completePasswordRecovery}
                  disabled={recoverySaving}
                  className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.28)] hover:brightness-110 disabled:opacity-50"
                >
                  {recoverySaving ? "Saving…" : "Update Password"}
                </button>

                <button
                  onClick={signOut}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Cancel (Sign Out)
                </button>

                <p className="text-xs text-white/55">
                  If this doesn't work, confirm your Supabase Auth redirect URLs include your site origin.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
