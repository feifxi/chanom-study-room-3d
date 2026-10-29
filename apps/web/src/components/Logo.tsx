/** Brand mark: a ring (a cup seen from above) with a Thai-tea dot. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle
        cx="15"
        cy="16"
        r="10.5"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeDasharray="52 14"
        strokeLinecap="round"
        transform="rotate(25 15 16)"
      />
      <circle cx="25.5" cy="9" r="3.6" fill="var(--tea)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-[-0.03em] text-ink">
        Chanom <span className="font-semibold text-muted">Study</span>
      </span>
    </span>
  );
}

/** "● Live now" style tag. */
export function LiveDot({ className = '' }: { className?: string }) {
  return <span className={`inline-block size-2 rounded-full bg-tea ${className}`} />;
}
