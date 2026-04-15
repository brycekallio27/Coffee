import { useState, useRef } from "react";
import type { Page } from "../types";
import Logo from "../components/ui/Logo";

interface OnboardingPageProps {
  displayName: string;
  setDisplayName: (v: string) => void;
  myLinkedInUrl: string;
  setMyLinkedInUrl: (v: string) => void;
  saveProfile: () => Promise<void>;
  uploadResume: (file: File) => Promise<void>;
  savingProfile: boolean;
  setPage: (page: Page) => void;
  inputCls: string;
}

const STEPS = [
  { title: "What should we call you?", sub: "This is how you'll appear across Coffee." },
  { title: "Connect your profile", sub: "Add your LinkedIn and resume for smarter outreach." },
  { title: "You're all set!", sub: "Your workspace is ready. Let's build your network." },
] as const;

const primaryBtn =
  "rounded-xl bg-glow px-6 py-3 text-sm font-semibold text-depth-0 shadow-[0_0_24px_rgba(0,229,255,0.2)] transition-all duration-300 hover:shadow-[0_0_36px_rgba(0,229,255,0.3)] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:shadow-none cursor-pointer";

const secondaryBtn =
  "rounded-xl bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.08] hover:text-white cursor-pointer";

/* ── Floating label input ── */
function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div className="group relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="peer w-full rounded-xl bg-white/[0.03] px-4 pb-2.5 pt-5 text-sm text-white outline-none transition-all duration-300 border border-white/[0.06] focus:border-glow/40 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(0,229,255,0.08)]"
        placeholder={active ? placeholder : " "}
      />
      <label
        className={`pointer-events-none absolute left-4 transition-all duration-200 ${
          active
            ? "top-1.5 text-[10px] font-medium text-glow/70"
            : "top-3.5 text-sm text-white/30"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

export default function OnboardingPage({
  displayName,
  setDisplayName,
  myLinkedInUrl,
  setMyLinkedInUrl,
  saveProfile,
  uploadResume,
  savingProfile,
  setPage,
}: OnboardingPageProps) {
  const [step, setStep] = useState(0);
  const [stepping, setStepping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const canAdvanceStep0 = displayName.trim().length > 0;

  const animateStep = (dir: 1 | -1, cb: () => void) => {
    if (stepping) return;
    setStepping(true);
    const el = cardRef.current;
    if (el) {
      el.style.transition = "opacity 0.2s, transform 0.2s";
      el.style.opacity = "0";
      el.style.transform = dir > 0 ? "translateX(-16px)" : "translateX(16px)";
    }
    setTimeout(() => {
      cb();
      if (el) {
        el.style.transform = dir > 0 ? "translateX(16px)" : "translateX(-16px)";
        requestAnimationFrame(() => {
          if (el) {
            el.style.opacity = "1";
            el.style.transform = "translateX(0)";
          }
          setTimeout(() => setStepping(false), 220);
        });
      } else {
        setStepping(false);
      }
    }, 200);
  };

  const next = () => animateStep(1, () => setStep((s) => Math.min(s + 1, STEPS.length - 1)));
  const back = () => animateStep(-1, () => setStep((s) => Math.max(s - 1, 0)));

  const handleFinish = async () => {
    await saveProfile();
    setPage("contacts");
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-depth-0 px-4">
      {/* Background accents */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,229,255,0.05),transparent_60%)]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_80%,rgba(124,77,255,0.03),transparent_50%)]" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex justify-center auth-title-enter">
          <Logo size="sm" />
        </div>

        {/* Progress bar */}
        <div className="mb-8 auth-form-enter">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-white/25 tracking-wide uppercase">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-[11px] font-medium text-glow/50">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-glow/60 to-glow transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div ref={cardRef} style={{ transition: "opacity 0.2s, transform 0.2s" }}>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1.5">
              {STEPS[step].title}
            </h1>
            <p className="text-sm text-white/35">
              {STEPS[step].sub}
            </p>
          </div>

          {/* Step 0: Name */}
          {step === 0 && (
            <div className="space-y-5">
              <FloatingInput
                label="Display name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="e.g. Bryce K."
              />
              <div className="flex justify-end">
                <button
                  className={primaryBtn}
                  disabled={!canAdvanceStep0}
                  onClick={next}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <FloatingInput
                label="LinkedIn URL"
                value={myLinkedInUrl}
                onChange={setMyLinkedInUrl}
                placeholder="https://linkedin.com/in/you"
              />
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] border-dashed p-5 text-center transition-all hover:border-glow/20 hover:bg-white/[0.04]">
                <svg className="mx-auto h-7 w-7 text-white/15 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <p className="text-xs text-white/30 mb-2">Drop your resume here (PDF)</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  className="block w-full text-xs text-white/40 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-glow/[0.08] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-glow hover:file:bg-glow/15"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadResume(f);
                  }}
                />
              </div>
              <div className="flex justify-between pt-1">
                <button className={secondaryBtn} onClick={back}>
                  Back
                </button>
                <button className={primaryBtn} onClick={next}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-6">
                {/* Success animation */}
                <div className="relative mb-5">
                  <div className="absolute inset-0 rounded-full bg-glow/20 blur-xl animate-pulse" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-glow/10 border border-glow/20">
                    <svg className="h-10 w-10 text-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-white/35 text-center max-w-xs">
                  Everything's saved. You can always update your profile in Settings later.
                </p>
              </div>
              <div className="flex justify-between">
                <button className={secondaryBtn} onClick={back}>
                  Back
                </button>
                <button
                  className={primaryBtn}
                  disabled={savingProfile}
                  onClick={handleFinish}
                >
                  {savingProfile ? "Setting up..." : "Enter Coffee"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
