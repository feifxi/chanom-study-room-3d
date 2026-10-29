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
  /** Phone layout: one button cycles the lighting, and the connection shows as a dot. */
  compact?: boolean;
}

/** Top-right: battery saver, the day / night switch and the connection pill. */
export function TopRight({ status, mode, onMode, saver, saverIsAuto, onSaver, compact = false }: Props) {
  const s = STATUS[status];
  const saverLabel = saver
    ? saverIsAuto
      ? 'Battery saver (switched on because this device was struggling); click to choose it yourself'
      : 'Battery saver is on; click for smooth graphics'
    : 'Battery saver: lower resolution, 30 fps, no shadows';
  return (
    <div className={`absolute flex items-center gap-2 ${compact ? 'top-2 right-2' : 'top-4 right-4'}`}>
      <button
        onClick={onSaver}
        aria-pressed={saver}
        aria-label="Battery saver"
        title={saverLabel}
        className={`panel grid size-10 place-items-center rounded-full ${saver ? '!bg-mint text-mint-ink' : 'text-muted hover:text-ink'}`}
      >
        <Leaf className="size-4" />
      </button>
      {compact ? (
        <CycleMode mode={mode} onMode={onMode} />
      ) : (
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
      )}
      <span
        role="status"
        aria-label={s.text}
        title={s.text}
        className={`panel flex items-center gap-2 rounded-full text-sm font-bold ${s.ink} ${compact ? 'size-10 justify-center' : 'px-4 py-2.5'}`}
      >
        <span className={`size-2 rounded-full ${s.dot}`} /> {!compact && s.text}
      </span>
    </div>
  );
}

/** One button that steps through clock → day → night (phones have no room for three). */
function CycleMode({ mode, onMode }: { mode: ThemeMode; onMode: (m: ThemeMode) => void }) {
  const i = MODES.findIndex((m) => m.mode === mode);
  const { icon: Icon, label } = MODES[i]!;
  const next = MODES[(i + 1) % MODES.length]!;
  return (
    <button
      onClick={() => onMode(next.mode)}
      aria-label={`Lighting: ${label}. Tap for ${next.label.toLowerCase()}`}
      className="panel grid size-10 place-items-center rounded-full text-ink"
    >
      <Icon className="size-4" />
    </button>
  );
}
