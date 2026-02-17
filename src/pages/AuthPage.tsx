import AuthIllustration from "../components/ui/AuthIllustration";

interface AuthPageProps {
  authEmail: string;
  setAuthEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  resetSent: boolean;
  setResetSent: (v: boolean) => void;
  resettingPw: boolean;
  signIn: () => void;
  signUp: () => void;
  requestPasswordReset: () => void;
  inputCls: string;
}

export default function AuthPage({
  authEmail,
  setAuthEmail,
  password,
  setPassword,
  resetSent,
  setResetSent,
  resettingPw,
  signIn,
  signUp,
  requestPasswordReset,
  inputCls,
}: AuthPageProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center text-white">
      <AuthIllustration />

      <div className="relative z-10 mx-auto w-full max-w-sm px-6">
        {/* Environmental branding */}
        <div className="mb-10 text-center">
          <h1
            className="auth-title-enter text-5xl font-semibold tracking-tight"
            style={{ textShadow: "0 0 40px rgba(0, 229, 255, 0.15)" }}
          >
            Coffee?
          </h1>
          <p className="auth-subtitle-enter mt-3 text-sm text-white/50">
            Your network is waiting. Sign in to pick up where you left off.
          </p>
        </div>

        {/* Form — no card, no borders, floats in space */}
        <div className="auth-form-enter">
          <div className="grid gap-3">
            <input
              className={inputCls}
              placeholder="Email"
              value={authEmail}
              onChange={(e) => {
                setAuthEmail(e.target.value);
                if (resetSent) setResetSent(false);
              }}
            />
            <input
              className={inputCls}
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (resetSent) setResetSent(false);
              }}
            />

            <button
              onClick={signIn}
              className="mt-1 rounded-button bg-glow/90 px-4 py-3 text-sm font-semibold text-depth-0 shadow-[0_0_30px_rgba(0,229,255,0.25)] transition-all duration-300 hover:bg-glow hover:shadow-[0_0_40px_rgba(0,229,255,0.35)] active:scale-[0.98] cursor-pointer"
            >
              Sign In
            </button>

            <button
              onClick={signUp}
              className="rounded-button border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:scale-[0.98] cursor-pointer"
            >
              Sign Up
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={requestPasswordReset}
              disabled={resettingPw}
              className="text-xs font-medium text-white/35 transition-colors hover:text-glow disabled:opacity-50 cursor-pointer"
            >
              {resettingPw ? "Sending..." : "Forgot password"}
            </button>

            {resetSent ? (
              <span className="text-xs text-glow/60">Check your inbox.</span>
            ) : null}
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="mt-16 text-center">
          <span className="whisper-bar text-white/[0.12]">
            press enter to sign in
          </span>
        </div>
      </div>
    </div>
  );
}
