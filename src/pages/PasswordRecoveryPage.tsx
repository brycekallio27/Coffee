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
    <div className="relative flex min-h-screen items-center justify-center text-white">
      <AuthIllustration />

      <div className="relative z-10 mx-auto w-full max-w-sm px-6">
        <div className="mb-10 text-center">
          <h1
            className="auth-title-enter text-4xl font-semibold tracking-tight"
            style={{ textShadow: "0 0 40px rgba(0, 229, 255, 0.15)" }}
          >
            New password
          </h1>
          <p className="auth-subtitle-enter mt-3 text-sm text-white/50">
            You're in recovery mode. Choose something you'll remember.
          </p>
        </div>

        <div className="auth-form-enter">
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
              className="mt-1 rounded-button bg-glow/90 px-4 py-3 text-sm font-semibold text-depth-0 shadow-[0_0_30px_rgba(0,229,255,0.25)] transition-all duration-300 hover:bg-glow hover:shadow-[0_0_40px_rgba(0,229,255,0.35)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {recoverySaving ? "Saving..." : "Update Password"}
            </button>

            <button
              onClick={signOut}
              className="rounded-button border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:scale-[0.98] cursor-pointer"
            >
              Cancel (Sign Out)
            </button>

            <p className="mt-2 text-xs text-white/30">
              If this doesn't work, confirm your Supabase Auth redirect URLs
              include your site origin.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <span className="whisper-bar text-white/[0.12]">
            press enter to update
          </span>
        </div>
      </div>
    </div>
  );
}
