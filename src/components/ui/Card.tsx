interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

export default function Card({ title, subtitle, children, right }: CardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}
