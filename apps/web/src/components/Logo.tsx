/**
 * Brand mark (shaped like Connecta's): a thick open ring with a milk-tea dot
 * sitting in the gap at the top right. app/icon.svg is the same drawing.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M 25.85 17.74 A 10 10 0 1 1 16 6" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="23.66" cy="9.57" r="3.6" fill="var(--tea)" />
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
