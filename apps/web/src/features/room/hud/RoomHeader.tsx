import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

/** Top-left card: which room you're in and how many people are here. */
export function RoomHeader({
  label,
  people,
  statusText,
  onLeave,
}: {
  label: string;
  people: number;
  statusText: string | null;
  onLeave: () => void;
}) {
  return (
    <header className="panel absolute top-4 left-4 flex items-center gap-3 py-2.5 pr-2.5 pl-3.5">
      <LogoMark size={30} />
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
        className="ml-3 flex items-center gap-1 rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" /> Leave
      </button>
    </header>
  );
}
