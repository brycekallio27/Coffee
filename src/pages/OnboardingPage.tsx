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

const gradientBtn =
  "rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.22)] hover:brightness-110 disabled:opacity-50 transition";

const secondaryBtn =
  "rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition";

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

  // Local-only fields (not saved to DB yet)
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
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                i < step
                  ? "bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 text-white"
                  : i === step
                    ? "ring-2 ring-sky-500 bg-white/10 text-white"
                    : "bg-white/[0.06] text-white/40"
              }`}
            >
              {i < step ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`mt-1 hidden text-[10px] sm:block ${
                i === step ? "text-white/80" : "text-white/40"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-6 sm:w-10 ${
                i < step ? "bg-sky-500" : "bg-white/10"
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/60">{subtitle}</p>
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
        className={gradientBtn}
        disabled={nextDisabled}
        onClick={onNext ?? next}
      >
        {nextLabel ?? "Next"}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-[#050b14] px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-white">
          Welcome to Coffee
        </h1>
        <p className="mb-6 text-center text-sm text-white/60">
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
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">
                  Resume upload
                </div>
                <div className="mt-1 text-xs text-white/60">
                  Upload your resume (PDF, DOC, or DOCX).
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  className="mt-3 block w-full text-sm text-white/80 file:mr-4 file:rounded-2xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
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
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition"
                onClick={() => {
                  /* placeholder - not functional yet */
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
                  📅
                </span>
                <div>
                  <div className="font-semibold">Connect Calendar</div>
                  <div className="text-xs text-white/50">
                    Google Calendar, Outlook (coming soon)
                  </div>
                </div>
              </button>
              <button
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition"
                onClick={() => {
                  /* placeholder - not functional yet */
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
                  ✉️
                </span>
                <div>
                  <div className="font-semibold">Connect Email</div>
                  <div className="text-xs text-white/50">
                    Gmail, Outlook (coming soon)
                  </div>
                </div>
              </button>
            </div>

            {skippedIntegrations && (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                <span className="font-semibold">Limited Mode:</span> Without
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
                <button className={gradientBtn} onClick={next}>
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
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-cyan-300 via-sky-500 to-indigo-500 text-2xl text-white">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-white/70">
                We&apos;ve saved your info. You can always update it in
                Settings.
              </p>

              {skippedIntegrations && (
                <div className="mt-4 w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                  <span className="font-semibold">Limited Mode:</span>{" "}
                  Integrations were skipped. Head to Settings any time to
                  connect your calendar and email.
                </div>
              )}

              <button
                className={`${gradientBtn} mt-6`}
                disabled={savingProfile}
                onClick={handleFinish}
              >
                {savingProfile ? "Saving\u2026" : "Go to Network"}
              </button>
            </div>
          </StepCard>
        )}
      </div>
    </div>
  );
}
