'use client';

import { useState } from 'react';
import { DoorOpen, Globe, Hash, Link2, Lock, Rocket, ScrollText, Shield, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { MAPS, userById, type Server, type Visibility } from '@/lib/mock';

const TABS = [
  ['overview', 'Overview', ScrollText],
  ['rooms', 'Rooms', DoorOpen],
  ['chats', 'Chats', Hash],
  ['members', 'Members & roles', Users],
  ['invites', 'Invites', Link2],
  ['safety', 'Safety', Shield],
  ['boosts', 'Boosts', Rocket],
] as const;

const VIS: { id: Visibility; icon: typeof Lock; title: string; text: string }[] = [
  { id: 'private', icon: Lock, title: 'Private', text: 'Invite only. Hidden from Discover.' },
  { id: 'request', icon: UserCheck, title: 'Request to join', text: 'Listed. Mods approve each request.' },
  { id: 'public', icon: Globe, title: 'Public', text: 'Listed. Anyone can join.' },
];

/** Server settings, opened on a tab. Rooms is where owners pick a template, capacity, guests and quiet mode. */
export function ServerSettingsDialog({ server, tab, onClose }: { server: Server; tab: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!tab} onOpenChange={(o) => !o && onClose()}>
      {/* Keyed by the tab it was opened on, so each opening starts there */}
      {tab && <SettingsBody key={tab} server={server} initial={tab} />}
    </Dialog>
  );
}

function SettingsBody({ server, initial }: { server: Server; initial: string }) {
  const [current, setCurrent] = useState(initial);
  return (
    <>
      <DialogContent className="flex h-[min(680px,90dvh)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-4xl">
        <aside className="hidden w-52 flex-none flex-col gap-1 bg-muted/60 p-3 sm:flex">
          <p className="truncate px-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
            {server.emoji} {server.name}
          </p>
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setCurrent(id)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-bold',
                current === id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <DialogTitle className="text-xl font-black">{TABS.find((t) => t[0] === current)?.[1]}</DialogTitle>
          <DialogDescription className="sr-only">Server settings</DialogDescription>
          <div className="mt-5">
            {current === 'overview' && <Overview server={server} />}
            {current === 'rooms' && <Rooms server={server} />}
            {current === 'members' && <Members server={server} />}
            {current === 'boosts' && <Boosts />}
            {!['overview', 'rooms', 'members', 'boosts'].includes(current) && <Simple tab={current} />}
          </div>
        </div>
      </DialogContent>
    </>
  );
}

function Overview({ server }: { server: Server }) {
  const [vis, setVis] = useState(server.visibility);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className={cn('grid size-20 place-items-center rounded-3xl text-4xl', server.tint)}>{server.emoji}</span>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="sn">Server name</Label>
          <Input id="sn" defaultValue={server.name} className="rounded-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sd">Description</Label>
        <Input id="sd" defaultValue={server.description} className="rounded-xl" />
      </div>
      <div>
        <p className="mb-2 text-sm font-extrabold">Who can join</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {VIS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVis(v.id)}
              className={cn('rounded-2xl border-2 p-3 text-left', vis === v.id ? 'border-primary bg-secondary/50' : 'border-border')}
            >
              <v.icon className="size-5 text-primary" />
              <p className="mt-1 font-extrabold">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.text}</p>
            </button>
          ))}
        </div>
        {vis !== 'private' && (
          <p className="mt-2 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-peach-ink">
            Listed servers need a rules screen and at least one mod.
          </p>
        )}
      </div>
      <Button className="w-fit rounded-full font-extrabold" onClick={() => toast.success('Saved')}>
        Save changes
      </Button>
    </div>
  );
}

function Rooms({ server }: { server: Server }) {
  const [open, setOpen] = useState(server.rooms[0]!.id);
  const room = server.rooms.find((r) => r.id === open)!;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {server.rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpen(r.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold',
              open === r.id ? 'border-primary bg-secondary' : '',
            )}
          >
            {MAPS.find((m) => m.id === r.mapId)!.emoji} {r.name}
          </button>
        ))}
        <button
          className="rounded-full border border-dashed border-primary/60 px-3 py-1.5 text-sm font-bold text-primary"
          onClick={() => toast('Free servers have 3 rooms. Boost to add more.')}
        >
          + Add room
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rn">Room name</Label>
        <Input id="rn" key={room.id} defaultValue={room.name} className="rounded-xl" />
      </div>

      <div>
        <p className="mb-2 text-sm font-extrabold">Room template</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {MAPS.map((m) => (
            <div key={m.id} className={cn('rounded-2xl border-2 p-2', room.mapId === m.id ? 'border-primary' : 'border-border')}>
              <span className={cn('grid h-20 place-items-center rounded-xl text-3xl', m.tint)}>{m.emoji}</span>
              <p className="mt-1.5 text-sm font-extrabold">{m.name}</p>
              <p className="text-[11px] text-muted-foreground">{m.zones.join(' · ')}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Templates are made by the Connecta team and get updates. A changed template loads the next time the room opens.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>
          Capacity · <span className="font-mono">{room.capacity}</span> people
        </Label>
        <Slider defaultValue={[room.capacity]} min={2} max={25} key={room.id} />
        <p className="text-xs text-muted-foreground">Free: up to 15 · Level 1 boost: 25 · Level 2: 40</p>
      </div>
      <Toggle
        label="Allow guests"
        hint="People with a guest link can walk in without an account. They only see this room."
        on={room.allowGuests}
      />
      <Toggle label="Quiet room" hint="No room-wide games or jukebox. Good for studying." on={room.quiet} />
      <Toggle label="Guests can use voice" hint="Off: guests can listen and chat but not talk." on={false} />
    </div>
  );
}

function Members({ server }: { server: Server }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2 flex gap-2">
        {['Owner', 'Mod', 'Member'].map((r) => (
          <span key={r} className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
            {r}
          </span>
        ))}
      </div>
      {server.members.map((id) => {
        const u = userById(id);
        const role = server.roles[id] ?? 'Member';
        return (
          <div key={id} className="flex items-center gap-3 rounded-2xl border p-2.5">
            <UserAvatar user={u} size={34} presence />
            <span className="flex-1 font-bold">{u.name}</span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-bold',
                role === 'Owner' ? 'bg-peach text-peach-ink' : role === 'Mod' ? 'bg-lavender text-lavender-ink' : 'bg-muted',
              )}
            >
              {role}
            </span>
            {role !== 'Owner' && (
              <Button size="sm" variant="ghost" className="rounded-full text-destructive">
                Kick
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Boosts() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-gradient-to-br from-secondary via-peach to-lavender p-5">
        <p className="text-sm font-bold text-muted-foreground">Level 1 · 2 boosts</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-card/70">
          <div className="h-full w-[28%] rounded-full bg-primary" />
        </div>
        <p className="mt-2 text-sm">5 more boosts to Level 2: 10 rooms, 40 people per room and overflow rooms.</p>
      </div>
      <Button className="w-fit rounded-full font-extrabold">
        <Rocket /> Boost this server
      </Button>
    </div>
  );
}

function Simple({ tab }: { tab: string }) {
  const rows: Record<string, [string, string, boolean][]> = {
    chats: [
      ['Slow mode in #general', 'One message every 5 seconds', false],
      ['Allow images', 'Members can post pictures', true],
    ],
    invites: [
      ['Members can invite', 'Off: only owner and mods make invite links', true],
      ['Guest links expire after 24 h', '', true],
    ],
    safety: [
      ['Filter rude words', 'In chats and room chat', true],
      ['New members wait 10 minutes to talk', '', false],
      ['Show rules before joining', '', true],
    ],
  };
  return (
    <div className="flex flex-col gap-4">
      {(rows[tab] ?? []).map(([label, hint, on]) => (
        <Toggle key={label} label={label} hint={hint} on={on} />
      ))}
    </div>
  );
}

function Toggle({ label, hint, on }: { label: string; hint?: string; on: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch defaultChecked={on} />
    </label>
  );
}
