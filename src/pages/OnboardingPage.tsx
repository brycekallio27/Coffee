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

const STEPS = [
  "Personal Info",
  "Career Goals",
  "Your Profile",
  "Integrations",
  "Done",
] as const;

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

  const [school, setSchool] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [location, setLocation] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [skippedIntegrations, setSkippedIntegrations] = useState(false);

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
            subtitle="Tell us a bit about yourself so we can personalize your experience."
          >
            <div className="grid gap-3">
              <input
                className={inputCls}
                placeholder="Full name *"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="School or Current Company"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Graduation Year or Current Role"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Location (e.g. San Francisco, CA)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Nav nextDisabled={!canAdvanceStep0} hideBack />
          </StepCard>
        )}

        {/* Step 2: Career Goals */}
        {step === 1 && (
          <StepCard
            title="Career Goals"
            subtitle="What are you working toward? This helps us tailor suggestions."
          >
            <div className="grid gap-3">
              <input
                className={inputCls}
                placeholder="Target roles or industries (e.g. Product Management, Fintech)"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Target companies (e.g. Stripe, Notion, Google)"
                value={targetCompanies}
                onChange={(e) => setTargetCompanies(e.target.value)}
              />
            </div>
            <Nav />
          </StepCard>
        )}

        {/* Step 3: Your Profile */}
        {step === 2 && (
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

        {/* Step 4: Connect Integrations */}
        {step === 3 && (
          <StepCard
            title="Connect Integrations"
            subtitle="Link your calendar and email for automatic meeting tracking."
          >
            <div className="grid gap-3">
              <button
                className="flex items-center gap-3 rounded-input bg-depth-0/30 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/[0.04] cursor-pointer"
                onClick={() => {}}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-button bg-glow/[0.08]">
                  <svg className="h-5 w-5 text-glow/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <div className="font-medium">Connect Calendar</div>
                  <div className="text-xs text-white/30">Google Calendar, Outlook (coming soon)</div>
                </div>
              </button>
              <button
                className="flex items-center gap-3 rounded-input bg-depth-0/30 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/[0.04] cursor-pointer"
                onClick={() => {}}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-button bg-glow/[0.08]">
                  <svg className="h-5 w-5 text-glow/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <div className="font-medium">Connect Email</div>
                  <div className="text-xs text-white/30">Gmail, Outlook (coming soon)</div>
                </div>
              </button>
            </div>

            {skippedIntegrations && (
              <div className="mt-4 rounded-input bg-glow/[0.04] px-4 py-3 text-xs text-white/40">
                <span className="font-semibold text-white/50">Limited Mode:</span> Without
                calendar and email connected, some features like automatic
                meeting logging won&apos;t be available. You can connect them
                later in Settings.
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button className={secondaryBtn} onClick={back}>
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  className={secondaryBtn}
                  onClick={() => {
                    setSkippedIntegrations(true);
                    next();
                  }}
                >
                  Skip for now
                </button>
                <button className={primaryBtn} onClick={next}>
                  Next
                </button>
              </div>
            </div>
          </StepCard>
        )}

        {/* Step 5: Done */}
        {step === 4 && (
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

              {skippedIntegrations && (
                <div className="mt-4 w-full rounded-input bg-glow/[0.04] px-4 py-3 text-xs text-white/40">
                  <span className="font-semibold text-white/50">Limited Mode:</span>{" "}
                  Integrations were skipped. Head to Settings any time to
                  connect your calendar and email.
                </div>
              )}

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
