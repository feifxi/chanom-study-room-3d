import { Clock3, Moon, Sun, type LucideIcon } from 'lucide-react';
import type { ConnectionStatus } from '../roomSession';
import type { ThemeMode } from '../dayCycle';

const MODES: { mode: ThemeMode; icon: LucideIcon; label: string }[] = [
  { mode: 'auto', icon: Clock3, label: 'Follow the clock' },
  { mode: 'day', icon: Sun, label: 'Always day' },
  { mode: 'night', icon: Moon, label: 'Always night' },
];

const STATUS: Record<ConnectionStatus, { text: string; dot: string; ink: string }> = {
  connecting: { text: 'Connecting', dot: 'bg-tea', ink: 'text-peach-ink' },
  connected: { text: 'Connected', dot: 'bg-mint-ink', ink: 'text-mint-ink' },
  error: { text: 'Offline', dot: 'bg-rose-ink', ink: 'text-rose-ink' },
  closed: { text: 'Disconnected', dot: 'bg-rose-ink', ink: 'text-rose-ink' },
};

/** Top-right: connection pill and the day / night switch. */
export function TopRight({ status, mode, onMode }: { status: ConnectionStatus; mode: ThemeMode; onMode: (m: ThemeMode) => void }) {
  const s = STATUS[status];
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <div role="radiogroup" aria-label="Lighting" className="panel flex gap-0.5 rounded-full p-1">
        {MODES.map(({ mode: m, icon: Icon, label }) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            aria-label={label}
            title={label}
            onClick={() => onMode(m)}
            className={`grid size-8 place-items-center rounded-full ${mode === m ? 'bg-navy text-white' : 'text-muted hover:bg-soft hover:text-ink'}`}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
      <span className={`panel flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold ${s.ink}`}>
        <span className={`size-2 rounded-full ${s.dot}`} /> {s.text}
      </span>
    </div>
  );
}
