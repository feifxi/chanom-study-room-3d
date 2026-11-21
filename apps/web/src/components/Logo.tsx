import { cn } from '@/lib/utils';

/** V1's brand mark: a thick open ring with a milk-tea dot in the gap. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path d="M 25.85 17.74 A 10 10 0 1 1 16 6" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="23.66" cy="9.57" r="3.6" fill="var(--tea)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-lg font-black tracking-[-0.03em]">Connecta</span>
    </span>
  );
}
