import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

/** Top-left card: which room you're in and how many people are here. */
export function RoomHeader({
  label,
  people,
  statusText,
  onLeave,
  compact = false,
}: {
  label: string;
  people: number;
  statusText: string | null;
  onLeave: () => void;
  compact?: boolean;
}) {
  return (
    <header
      className={`panel absolute flex items-center ${compact ? 'top-2 left-2 max-w-[calc(100vw-170px)] gap-2 py-1.5 pr-1.5 pl-2.5' : 'top-4 left-4 gap-3 py-2.5 pr-2.5 pl-3.5'}`}
    >
      <LogoMark size={compact ? 24 : 30} />
      <div className="min-w-0">
        <p className="truncate text-[15px] leading-tight font-extrabold tracking-[-0.02em]">{label}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {statusText ?? (
            <>
              <span className="size-1.5 rounded-full bg-mint-ink" />
              {people} in the room
            </>
          )}
        </p>
      </div>
      <button
        onClick={onLeave}
        aria-label="Leave"
        className={`flex flex-none items-center gap-1 rounded-xl border border-line bg-white text-xs font-bold text-muted hover:text-ink ${compact ? 'ml-1 p-2' : 'ml-3 px-2.5 py-1.5'}`}
      >
        <ArrowLeft className="size-3.5" />
        {!compact && 'Leave'}
      </button>
    </header>
  );
}
