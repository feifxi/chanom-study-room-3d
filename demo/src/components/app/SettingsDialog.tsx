'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Bell, Crown, Gamepad2, KeyRound, Mic, Palette, Shield, Shirt, User } from 'lucide-react';
import { toast } from 'sonner';
import type { AvatarLook } from '@study/shared';
import { PALETTES, usePalette } from '@/components/Providers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CharacterEditor } from '@/features/avatar/CharacterEditor';
import { AccountTab } from './AccountTab';
import { cn } from '@/lib/utils';
import { ME } from '@/lib/mock';
import { useGlobalOptIn } from '@/lib/focus';
import { KEYS, useClickToWalk } from '@/lib/controls';

const AvatarPreview = dynamic(() => import('@/features/avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

const TABS = [
  ['profile', 'My profile', User],
  ['character', 'My character', Shirt],
  ['appearance', 'Appearance', Palette],
  ['voice', 'Voice & sound', Mic],
  ['controls', 'Controls', Gamepad2],
  ['notifications', 'Notifications', Bell],
  ['privacy', 'Privacy & safety', Shield],
  ['plus', 'Plus & billing', Crown],
  ['account', 'Account', KeyRound],
] as const;
type Tab = (typeof TABS)[number][0];

/** User settings: one dialog with a tab list, like most chat apps, in the cosy style. */
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [tab, setTab] = useState<Tab>('profile');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(640px,90dvh)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-3xl">
        <aside className="hidden w-52 flex-none flex-col gap-1 bg-muted/60 p-3 sm:flex">
          <p className="px-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Settings</p>
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-bold',
                tab === id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <DialogTitle className="text-xl font-black">{TABS.find((t) => t[0] === tab)![1]}</DialogTitle>
          <DialogDescription className="sr-only">Your account settings</DialogDescription>
          <div className="mt-5">
            {tab === 'profile' ? (
              <Profile onEditCharacter={() => setTab('character')} />
            ) : tab === 'character' ? (
              <Character />
            ) : tab === 'appearance' ? (
              <Appearance />
            ) : tab === 'voice' ? (
              <Voice />
            ) : tab === 'controls' ? (
              <Controls />
            ) : tab === 'plus' ? (
              <PlusTab />
            ) : tab === 'account' ? (
              <AccountTab />
            ) : (
              <Toggles tab={tab} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Profile({ onEditCharacter }: { onEditCharacter: () => void }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="h-56 w-40 flex-none overflow-hidden rounded-3xl bg-gradient-to-b from-lavender to-peach">
        <AvatarPreview look={ME.look} />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dn">Display name</Label>
          <Input id="dn" defaultValue={ME.name} className="rounded-xl" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="un">@handle</Label>
          <Input id="un" defaultValue={`@${ME.handle}`} className="rounded-xl" />
          <p className="text-xs text-muted-foreground">You can change it once every 30 days.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">About me</Label>
          <Input id="bio" defaultValue="CPE student · cat person · 🍓" className="rounded-xl" />
        </div>
        <Button variant="secondary" className="w-fit rounded-full font-bold" onClick={onEditCharacter}>
          <Shirt /> Edit my character
        </Button>
      </div>
    </div>
  );
}

/** Same editor as sign-up, plus what you own from the shop. Saving changes how you look in every room. */
function Character() {
  const [look, setLook] = useState<AvatarLook>(ME.look);
  return (
    <div className="flex flex-col gap-5">
      <CharacterEditor look={look} onChange={setLook} previewClassName="h-64 w-44" />
      <section>
        <p className="mb-2 text-sm font-extrabold">From the shop</p>
        <div className="flex flex-wrap gap-2">
          {['🎒 School uniform', '👓 Round glasses', '🐱 Cat ears'].map((item) => (
            <span key={item} className="rounded-full border bg-card px-3 py-1 text-xs font-bold">
              {item}
            </span>
          ))}
          <Link href="/home/shop" className="rounded-full bg-peach px-3 py-1 text-xs font-bold text-peach-ink">
            Get more in the shop →
          </Link>
        </div>
      </section>
      <Button className="w-fit rounded-full font-extrabold" onClick={() => toast.success('Looking good! Saved for every room ✨')}>
        Save my look
      </Button>
    </div>
  );
}

function Appearance() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="mb-2 text-sm font-extrabold">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn('overflow-hidden rounded-2xl border-2 text-left', theme === t ? 'border-primary' : 'border-transparent')}
            >
              <div
                className={cn(
                  'flex h-16 gap-1 p-2',
                  t === 'dark' ? 'bg-[#18131c]' : t === 'light' ? 'bg-[#fbf4f1]' : 'bg-gradient-to-r from-[#fbf4f1] to-[#18131c]',
                )}
              >
                <span className="w-3 rounded-md bg-primary/70" />
                <span className={cn('flex-1 rounded-md', t === 'dark' ? 'bg-[#241c29]' : 'bg-white')} />
              </div>
              <p className="p-2 text-sm font-bold capitalize">{t}</p>
            </button>
          ))}
        </div>
      </section>
      <section>
        <p className="mb-2 text-sm font-extrabold">Colour</p>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              className={cn(
                'flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-bold',
                palette === p.id ? 'border-primary bg-secondary' : 'border-border',
              )}
            >
              <span className="size-4 rounded-full" style={{ background: p.swatch }} /> {p.label}
            </button>
          ))}
        </div>
      </section>
      <Row label="Bouncy animations" hint="Characters hop when they walk. Turn off for reduced motion." defaultChecked />
      <Row label="Battery saver in rooms" hint="30 fps and no shadows. On by default on phones." />
    </div>
  );
}

function Voice() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Microphone volume</Label>
        <Slider defaultValue={[70]} max={100} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Room sound volume</Label>
        <Slider defaultValue={[85]} max={100} />
      </div>
      <Row label="Fade my music near shared audio" hint="Your lo-fi gets quieter near the jukebox or the TV." defaultChecked />
      <Row label="Lower music while people talk" defaultChecked />
      <Row label="Noise suppression" defaultChecked />
    </div>
  );
}

/** How you move. Click to walk is on by default everywhere; keys and the joystick always work. */
function Controls() {
  const [clickToWalk, setClickToWalk] = useClickToWalk();
  return (
    <div className="flex flex-col gap-6">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-bold">Click to walk</span>
          <span className="block text-xs text-muted-foreground">
            Click or tap the floor to walk there. Keys and the joystick always work. A click that closes a panel never walks.
          </span>
        </span>
        <Switch checked={clickToWalk} onCheckedChange={setClickToWalk} />
      </label>
      <section className="flex flex-col gap-2">
        <p className="text-sm font-extrabold">Keys</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {KEYS.map(([k, what]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
              </dt>
              <dd className="text-muted-foreground">{what}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function PlusTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-gradient-to-br from-secondary via-peach to-lavender p-5">
        <p className="text-sm font-bold text-muted-foreground">Your plan</p>
        <p className="text-2xl font-black">Connecta Plus ✨</p>
        <p className="mt-1 text-sm">Renews on 7 Dec 2026 · ฿99 / month</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Rooms you own follow your plan: Chanom Friends fits 100 people at once and can use Big and premium maps.
      </p>
      <Button asChild className="w-fit rounded-full font-bold">
        <Link href="/home/plus">Manage Plus</Link>
      </Button>
    </div>
  );
}

function Toggles({ tab }: { tab: Tab }) {
  if (tab === 'notifications')
    return (
      <div className="flex flex-col gap-5">
        <Row label="Mentions and DMs" defaultChecked />
        <Row label="Room events starting" hint="“Werewolf night starts in 10 minutes”" defaultChecked />
        <Row label="Sounds" defaultChecked />
      </div>
    );
  return (
    <div className="flex flex-col gap-5">
      <Row label="Appear offline" hint="Friends won’t see you’re online or which room you’re in" />
      <Row label="Friend requests from anyone" hint="Off: only people who share a room with you. Only friends can DM you." defaultChecked />
      <Row label="Show what I’m doing to friends" hint="“Focusing · Calculus”, “Playing Slave”" defaultChecked />
      <GlobalRankRow />
      <Row label="Filter rude words in chats" defaultChecked />
      <Button variant="outline" className="w-fit rounded-full font-bold">
        Blocked people (0)
      </Button>
    </div>
  );
}

/** The Everyone focus ranking lists you only while this is on (off by default under 18). */
function GlobalRankRow() {
  const [on, setOn] = useGlobalOptIn();
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-bold">Show me on the Everyone focus ranking</span>
        <span className="block text-xs text-muted-foreground">Name, character and focus minutes. Friends always see you.</span>
      </span>
      <Switch checked={on} onCheckedChange={setOn} />
    </label>
  );
}

function Row({ label, hint, defaultChecked }: { label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch defaultChecked={defaultChecked} />
    </label>
  );
}
