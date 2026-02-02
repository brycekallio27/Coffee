import Card from "../components/ui/Card";
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
    <div className="relative min-h-screen text-white">
      <AuthIllustration />

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
              Coffee?
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight">Turn networking into a repeatable system.</h1>
            <p className="mt-3 max-w-lg text-sm text-white/70">
              Track your network, log coffee chats by date, and keep your relationship context where it belongs—next to
              the person.
            </p>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center lg:hidden">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                Coffee?
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight">Coffee?</h1>
              <p className="mt-2 text-sm text-white/70">A colorful networking dashboard that actually gets used.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-1 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <Card title="Sign in" subtitle="Use any email + password you control.">
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
                    className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.28)] hover:brightness-110"
                  >
                    Sign In
                  </button>

                  <button
                    onClick={signUp}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Sign Up
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={requestPasswordReset}
                      disabled={resettingPw}
                      className="text-left text-xs font-semibold text-cyan-200 hover:underline disabled:opacity-60"
                    >
                      {resettingPw ? "Sending reset email\u2026" : "Forgot my password"}
                    </button>

                    {resetSent ? <span className="text-xs text-white/60">Reset email sent.</span> : null}
                  </div>

                  <p className="text-xs text-white/55">
                    Note: If you don't receive the email, check spam. Also ensure Supabase Auth redirect URLs include
                    this site.
                  </p>
                </div>
              </Card>
            </div>

            <p className="mt-4 text-center text-xs text-white/55">
              By signing in, you'll land directly in your Network dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
