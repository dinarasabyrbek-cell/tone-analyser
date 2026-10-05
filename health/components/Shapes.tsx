import { cx } from "./ui";

// Soft sculpted 3D-ish objects (inspired by the clay shapes in the reference design).
// `className` should set a text colour — shapes are painted with currentColor.

export function Stones({ className }: { className?: string }) {
  return (
    <div className={cx("relative h-24 w-16", className)} aria-hidden>
      <div className="blob absolute left-1/2 top-0 h-7 w-7 -translate-x-1/2 rounded-full" />
      <div className="blob absolute left-1/2 top-6 h-6 w-10 -translate-x-1/2 rounded-[50%]" />
      <div className="blob absolute left-1/2 top-11 h-7 w-12 -translate-x-1/2 rounded-[50%]" />
      <div className="blob absolute bottom-0 left-1/2 h-9 w-16 -translate-x-1/2 rounded-t-full rounded-b-[40%]" />
    </div>
  );
}

export function Pebbles({ className }: { className?: string }) {
  return (
    <div className={cx("relative h-20 w-20", className)} aria-hidden>
      <div className="blob absolute left-1 top-0 h-9 w-9 rounded-full" />
      <div className="blob absolute right-1 top-0 h-9 w-9 rounded-full" />
      <div className="blob absolute bottom-0 left-1/2 h-11 w-16 -translate-x-1/2 rounded-b-full rounded-t-lg" />
    </div>
  );
}

export function Leaf({ className }: { className?: string }) {
  return (
    <div className={cx("relative h-24 w-24", className)} aria-hidden>
      <div className="blob absolute left-1/2 top-0 h-14 w-24 -translate-x-1/2 rounded-t-full rounded-b-[30%_70%]" style={{ transform: "translateX(-50%) rotate(-12deg)" }} />
      <div className="blob absolute left-1/2 top-12 h-6 w-3 -translate-x-1/2 rounded-full" />
      <div className="blob absolute bottom-0 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full" />
    </div>
  );
}

export function Tiles({ className }: { className?: string }) {
  return (
    <div className={cx("grid h-20 w-20 grid-cols-2 gap-1.5", className)} aria-hidden>
      <div className="blob rounded-t-2xl rounded-b-md" />
      <div className="blob rounded-t-2xl rounded-b-md" />
      <div className="blob rounded-b-2xl rounded-t-md" />
      <div className="blob rounded-b-2xl rounded-t-md" />
    </div>
  );
}

export function Drop({ className }: { className?: string }) {
  return (
    <div className={cx("relative h-16 w-12", className)} aria-hidden>
      <div className="blob absolute inset-0 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]" style={{ borderTopLeftRadius: "50% 70%", borderTopRightRadius: "50% 70%" }} />
    </div>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cx("h-10 w-10", className)} aria-hidden>
      <path d="M50 0C53 35 65 47 100 50 65 53 53 65 50 100 47 65 35 53 0 50 35 47 47 35 50 0Z" fill="currentColor" />
    </svg>
  );
}
