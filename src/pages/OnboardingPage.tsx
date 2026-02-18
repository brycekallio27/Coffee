import { useState } from "react";
import type { Page } from "../types";

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

const STEPS = ["Personal Info", "Your Profile", "Done"] as const;

const primaryBtn =
  "rounded-button bg-glow/90 px-5 py-2.5 text-sm font-semibold text-depth-0 shadow-[0_0_24px_rgba(0,229,255,0.2)] transition-all hover:bg-glow active:scale-[0.98] disabled:opacity-50 cursor-pointer";

const secondaryBtn =
  "rounded-button bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer";

export default function OnboardingPage({
  displayName,
  setDisplayName,
  myLinkedInUrl,
  setMyLinkedInUrl,
  saveProfile,
  uploadResume,
  savingProfile,
  setPage,
  inputCls,
}: OnboardingPageProps) {
  const [step, setStep] = useState(0);

  const canAdvanceStep0 = displayName.trim().length > 0;

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    await saveProfile();
    setPage("contacts");
  };

  /* ---- stepper indicator ---- */
  const Stepper = () => (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                i < step
                  ? "bg-glow/20 text-glow shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                  : i === step
                    ? "ring-2 ring-glow/40 bg-glow/10 text-glow"
                    : "bg-white/[0.04] text-white/25"
              }`}
            >
              {i < step ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`mt-1 hidden text-[10px] sm:block ${
                i === step ? "text-glow/70" : "text-white/20"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-6 sm:w-10 transition-colors ${
                i < step ? "bg-glow/30" : "bg-white/[0.06]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  /* ---- step card wrapper ---- */
  const StepCard = ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-section bg-depth-1/60 p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/40">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );

  /* ---- nav buttons ---- */
  const Nav = ({
    nextDisabled,
    nextLabel,
    onNext,
    hideBack,
  }: {
    nextDisabled?: boolean;
    nextLabel?: string;
    onNext?: () => void;
    hideBack?: boolean;
  }) => (
    <div className="mt-6 flex items-center justify-between">
      {!hideBack && step > 0 ? (
        <button className={secondaryBtn} onClick={back}>
          Back
        </button>
      ) : (
        <div />
      )}
      <button
        className={primaryBtn}
        disabled={nextDisabled}
        onClick={onNext ?? next}
      >
        {nextLabel ?? "Next"}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-depth-0 px-4 py-10 sm:py-16">
      {/* Subtle bg glow */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,229,255,0.06),transparent_60%)]" />

      <div className="w-full max-w-lg">
        <h1
          className="mb-2 text-center text-2xl font-bold text-white"
          style={{ textShadow: "0 0 30px rgba(0, 229, 255, 0.1)" }}
        >
          Welcome to Coffee
        </h1>
        <p className="mb-6 text-center text-sm text-white/40">
          Let&apos;s get your profile set up in a few quick steps.
        </p>

        <Stepper />

        {/* Step 1: Personal Info */}
        {step === 0 && (
          <StepCard
            title="Personal Info"
            subtitle="Tell us your name so we can personalize your experience."
          >
            <div className="grid gap-3">
              <input
                className={inputCls}
                placeholder="Full name *"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <Nav nextDisabled={!canAdvanceStep0} hideBack />
          </StepCard>
        )}

        {/* Step 2: Your Profile */}
        {step === 1 && (
          <StepCard
            title="Your Profile"
            subtitle="Add your LinkedIn and resume so we can help you draft outreach."
          >
            <div className="grid gap-3">
              <input
                className={inputCls}
                placeholder="LinkedIn URL (e.g. https://linkedin.com/in/you)"
                value={myLinkedInUrl}
                onChange={(e) => setMyLinkedInUrl(e.target.value)}
              />
              <div className="rounded-input bg-depth-0/30 p-4">
                <div className="text-sm font-medium text-white">Resume upload</div>
                <div className="mt-1 text-xs text-white/30">Upload your resume (PDF, DOC, or DOCX).</div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  className="mt-3 block w-full text-sm text-white/50 file:mr-4 file:cursor-pointer file:rounded-button file:border-0 file:bg-glow/[0.08] file:px-4 file:py-2 file:text-sm file:font-medium file:text-glow hover:file:bg-glow/15"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadResume(f);
                  }}
                />
              </div>
            </div>
            <Nav />
          </StepCard>
        )}

        {/* Step 3: Done */}
        {step === 2 && (
          <StepCard
            title="You're all set!"
            subtitle="Your profile is ready. Start building your network."
          >
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-glow/15 text-glow shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-white/40">
                We&apos;ve saved your info. You can always update it in Settings.
              </p>
              <button
                className={`${primaryBtn} mt-6`}
                disabled={savingProfile}
                onClick={handleFinish}
              >
                {savingProfile ? "Saving..." : "Go to Network"}
              </button>
            </div>
          </StepCard>
        )}
      </div>
    </div>
  );
}
