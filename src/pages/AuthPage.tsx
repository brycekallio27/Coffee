import { useState } from "react";
import AuthIllustration from "../components/ui/AuthIllustration";
import Logo from "../components/ui/Logo";

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
  signupName: string;
  setSignupName: (v: string) => void;
  signupPhone: string;
  setSignupPhone: (v: string) => void;
  signupLinkedIn: string;
  setSignupLinkedIn: (v: string) => void;
  signupCareerInterests: string;
  setSignupCareerInterests: (v: string) => void;
  setSignupResumeFile: (v: File | null) => void;
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
  signupName,
  setSignupName,
  signupPhone,
  setSignupPhone,
  signupLinkedIn,
  setSignupLinkedIn,
  signupCareerInterests,
  setSignupCareerInterests,
  setSignupResumeFile,
}: AuthPageProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const tabCls = (active: boolean) =>
    `flex-1 py-2.5 text-sm font-medium text-center rounded-button transition-all duration-200 cursor-pointer ${
      active
        ? "bg-glow/10 text-glow"
        : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
    }`;

  return (
    <div className="relative flex min-h-screen items-center justify-center text-white">
      <AuthIllustration />

      <div className="relative z-10 mx-auto w-full max-w-sm px-6">
        {/* Environmental branding */}
        <div className="mb-10 flex justify-center">
          <div className="auth-title-enter">
            <Logo size="lg" />
          </div>
        </div>

        {/* Mode toggle tabs */}
        <div className="auth-form-enter mb-4 flex gap-1 rounded-button bg-white/[0.04] p-1">
          <button className={tabCls(mode === "signin")} onClick={() => setMode("signin")}>
            Sign In
          </button>
          <button className={tabCls(mode === "signup")} onClick={() => setMode("signup")}>
            Sign Up
          </button>
        </div>

        {/* Form */}
        <div className="auth-form-enter">
          <div className="grid gap-3">
            {/* Sign Up: full name */}
            {mode === "signup" && (
              <input
                className={inputCls}
                placeholder="Full name *"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />
            )}

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

            {/* Sign Up: extra fields */}
            {mode === "signup" && (
              <>
                <input
                  className={inputCls}
                  placeholder="Phone number *"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="LinkedIn URL *"
                  value={signupLinkedIn}
                  onChange={(e) => setSignupLinkedIn(e.target.value)}
                />
                <textarea
                  className={`${inputCls} min-h-[80px] resize-y`}
                  placeholder="Career interests (e.g. Product Management, UX Design...)"
                  value={signupCareerInterests}
                  onChange={(e) => setSignupCareerInterests(e.target.value)}
                />
                <div className="rounded-input bg-white/[0.04] p-3">
                  <div className="text-xs text-white/40 mb-2">Resume (optional, PDF only)</div>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="block w-full text-sm text-white/50 file:mr-4 file:cursor-pointer file:rounded-button file:border-0 file:bg-glow/[0.08] file:px-4 file:py-2 file:text-sm file:font-medium file:text-glow hover:file:bg-glow/15"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setSignupResumeFile(f);
                    }}
                  />
                </div>
              </>
            )}

            {/* Primary action button */}
            {mode === "signin" ? (
              <button
                onClick={signIn}
                className="mt-1 rounded-button bg-glow/90 px-4 py-3 text-sm font-semibold text-depth-0 shadow-[0_0_30px_rgba(0,229,255,0.25)] transition-all duration-300 hover:bg-glow hover:shadow-[0_0_40px_rgba(0,229,255,0.35)] active:scale-[0.98] cursor-pointer"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={signUp}
                className="mt-1 rounded-button bg-glow/90 px-4 py-3 text-sm font-semibold text-depth-0 shadow-[0_0_30px_rgba(0,229,255,0.25)] transition-all duration-300 hover:bg-glow hover:shadow-[0_0_40px_rgba(0,229,255,0.35)] active:scale-[0.98] cursor-pointer"
              >
                Create Account
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            {mode === "signin" ? (
              <>
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
              </>
            ) : (
              <div />
            )}
          </div>

          <div className="mt-4 text-center">
            {mode === "signin" ? (
              <button
                onClick={() => setMode("signup")}
                className="text-xs text-white/35 transition-colors hover:text-glow cursor-pointer"
              >
                Don't have an account? <span className="font-medium text-glow/70">Sign Up</span>
              </button>
            ) : (
              <button
                onClick={() => setMode("signin")}
                className="text-xs text-white/35 transition-colors hover:text-glow cursor-pointer"
              >
                Already have an account? <span className="font-medium text-glow/70">Sign In</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
