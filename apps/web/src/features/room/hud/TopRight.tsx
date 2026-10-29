import { Clock3, Leaf, Moon, Sun, type LucideIcon } from 'lucide-react';
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

interface Props {
  status: ConnectionStatus;
  mode: ThemeMode;
  onMode: (m: ThemeMode) => void;
  /** Battery saver is on (chosen, or switched on automatically on a slow device) */
  saver: boolean;
  saverIsAuto: boolean;
  onSaver: () => void;
}

/** Top-right: battery saver, the day / night switch and the connection pill. */
export function TopRight({ status, mode, onMode, saver, saverIsAuto, onSaver }: Props) {
  const s = STATUS[status];
  const saverLabel = saver
    ? saverIsAuto
      ? 'Battery saver (switched on because this device was struggling); click to choose it yourself'
      : 'Battery saver is on; click for smooth graphics'
    : 'Battery saver: lower resolution, 30 fps, no shadows';
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <button
        onClick={onSaver}
        aria-pressed={saver}
        aria-label="Battery saver"
        title={saverLabel}
        className={`panel grid size-10 place-items-center rounded-full ${saver ? '!bg-mint text-mint-ink' : 'text-muted hover:text-ink'}`}
      >
        <Leaf className="size-4" />
      </button>
      <div role="radiogroup" aria-label="Lighting" className="panel flex gap-0.5 rounded-full p-1">
        {MODES.map(({ mode: m, icon: Icon, label }) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            aria-label={label}
            title={label}
            onClick={() => onMode(m)}
            className={`grid size-8 place-items-center rounded-full ${mode === m ? 'bg-cocoa text-white' : 'text-muted hover:bg-soft hover:text-ink'}`}
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
