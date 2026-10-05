import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Serif headline; wrap the accent word in <em> for the italic moss style. */
export function Display({ children, as: Tag = "h1", className }: { children: ReactNode; as?: "h1" | "h2" | "h3"; className?: string }) {
  const size = Tag === "h1" ? "text-4xl sm:text-5xl" : Tag === "h2" ? "text-3xl sm:text-4xl" : "text-2xl";
  return <Tag className={cx("display text-noir", size, className)}>{children}</Tag>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-block rounded-full bg-kombu px-3 py-1 text-[11px] font-medium tracking-wide text-cream", className)}>
      {children}
    </span>
  );
}

type Variant = "primary" | "outline" | "light" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-kombu text-cream hover:bg-kombu-700",
  outline: "border border-kombu/40 text-kombu hover:bg-kombu/5",
  light: "bg-cream text-kombu hover:bg-white",
  ghost: "text-kombu hover:bg-kombu/5",
};

export function Button({
  variant = "primary",
  className,
  loading,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className
      )}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("h-4 w-4", className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

/** Small circular ↗ button used on cards (as in the reference design). */
export function ArrowButton({ href, dark, label = "Open" }: { href: string; dark?: boolean; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cx(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:scale-105",
        dark ? "bg-noir text-cream" : "bg-cream text-kombu"
      )}
    >
      <ArrowIcon />
    </Link>
  );
}

export function Card({ className, children, tone = "bone" }: { className?: string; children: ReactNode; tone?: "bone" | "cream" | "kombu" | "moss" | "sage" | "white" }) {
  const tones = {
    bone: "bg-bone/70 text-noir",
    cream: "bg-cream text-noir border border-noir/10",
    white: "bg-[#fffaf2] text-noir border border-noir/10",
    kombu: "bg-kombu text-cream",
    moss: "bg-moss text-cream",
    sage: "bg-sage text-noir",
  };
  return <div className={cx("rounded-4xl p-5 sm:p-6", tones[tone], className)}>{children}</div>;
}

export function Chip({ children, tone = "tan", className }: { children: ReactNode; tone?: "tan" | "moss" | "alert" | "kombu" | "cream"; className?: string }) {
  const tones = {
    tan: "bg-tan/70 text-noir",
    moss: "bg-moss/25 text-kombu",
    alert: "bg-alert-100 text-alert",
    kombu: "bg-kombu text-cream",
    cream: "bg-cream/90 text-kombu",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Spinner({ small, className }: { small?: boolean; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx("spin inline-block rounded-full border-2 border-current border-r-transparent", small ? "h-4 w-4" : "h-7 w-7", className)}
    />
  );
}

export function ErrorBox({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  if (!children) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-alert-100 px-4 py-3 text-sm text-alert" role="alert">
      <span>{children}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-semibold underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-moss">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  );
}

export function Empty({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-4xl border border-dashed border-moss/50 bg-sage-100/60 px-6 py-10 text-center">
      <p className="display text-2xl text-kombu">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-noir/70">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-moss">{label}</span>
      {children}
      {hint && <span className="text-xs text-noir/55">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, intro, action }: { title: ReactNode; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Display>{title}</Display>
        {intro && <p className="mt-3 max-w-xl text-sm leading-relaxed text-noir/70">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="mt-10 text-center text-[11px] leading-relaxed text-noir/45">
      Soul Health explains your data; it is not a medical device and doesn&apos;t replace a doctor.
      <br />
      Out-of-range or worrying results should always be discussed with a clinician.
    </p>
  );
}
