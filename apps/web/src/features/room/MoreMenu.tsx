'use client';

import { useState } from 'react';
import { Bell, Camera, Ellipsis, Leaf, Mic, MousePointerClick, Shield, Shirt, type LucideIcon } from 'lucide-react';
import type { SettingsTab } from '@/components/app/SettingsDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** The settings people look for in a room; everything else is under "All your settings". */
const MY_TABS: [SettingsTab, LucideIcon, string][] = [
  ['character', Shirt, 'My look'],
  ['voice', Mic, 'Voice & sound'],
  ['notifications', Bell, 'Notifications'],
  ['privacy', Shield, 'Privacy'],
];

/**
 * More, the dock's last button: what you use now and then (photo mode) and your own settings. The
 * Room card holds only the room's things, the way Discord's server menu does, so an owner never mixes
 * up "for everyone" and "only you", and the card stays short.
 */
export function MoreMenu({
  compact,
  onPhoto,
  onMySettings,
  saver,
  onSaver,
  clickToWalk,
  onClickToWalk,
}: {
  compact: boolean;
  onPhoto: () => void;
  /** Opens your own settings on a tab (guests have none). */
  onMySettings?: (tab: SettingsTab) => void;
  saver: boolean;
  onSaver: (on: boolean) => void;
  clickToWalk: boolean;
  onClickToWalk: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  // Every item closes the menu, except the switches: you may flip both
  const pick = (f: () => void) => () => {
    setOpen(false);
    f();
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="More" aria-pressed={open} className={cn('dock-btn', compact && 'min-w-0 px-3')}>
          <Ellipsis className="size-5" />
          {!compact && 'More'}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={10} className="w-72 rounded-2xl p-1.5">
        <button onClick={pick(onPhoto)} className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-muted">
          <span className="grid size-8 flex-none place-items-center rounded-lg bg-primary/15 text-primary">
            <Camera className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold">Photo mode</span>
            <span className="block text-[11px] leading-snug text-muted-foreground">Frame the room and save a picture</span>
          </span>
        </button>

        <div className="my-1.5 h-px bg-border" />
        <p className="flex items-baseline justify-between px-2 pb-1.5 text-xs font-black">
          Your settings <span className="text-[11px] font-bold text-muted-foreground">only you</span>
        </p>
        {onMySettings && (
          <div className="grid grid-cols-2 gap-1 px-0.5">
            {MY_TABS.map(([tab, Icon, label]) => (
              <button
                key={tab}
                onClick={pick(() => onMySettings(tab))}
                className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-extrabold hover:bg-muted"
              >
                <Icon className="size-3.5 flex-none text-primary" /> {label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1 flex flex-col gap-1 px-0.5">
          <Switch icon={Leaf} label="Battery saver" on={saver} onClick={() => onSaver(!saver)} />
          <Switch icon={MousePointerClick} label="Click to walk" on={clickToWalk} onClick={() => onClickToWalk(!clickToWalk)} />
        </div>
        {onMySettings && (
          <button
            onClick={pick(() => onMySettings('profile'))}
            className="mt-1 px-2 py-1 text-left text-[11px] font-bold text-muted-foreground hover:text-foreground hover:underline"
          >
            All your settings →
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Switch({ icon: Icon, label, on, onClick }: { icon: LucideIcon; label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-extrabold',
        on ? 'bg-mint text-mint-ink' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" /> {label}
      <span className="ml-auto">{on ? 'On' : 'Off'}</span>
    </button>
  );
}
