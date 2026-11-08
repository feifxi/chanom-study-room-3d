'use client';

import { useState } from 'react';
import { Check, Globe, Link2, Lock, Map as MapIcon, Rocket, ScrollText, Shield, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { MAPS, userById, type Visibility } from '@/lib/mock';
import { BOOST_LEVELS, levelFor, type PlaceRoom } from './model';

const TABS = [
  ['overview', 'Overview', ScrollText],
  ['map', 'Map & capacity', MapIcon],
  ['members', 'Members & roles', Users],
  ['invites', 'Invites', Link2],
  ['safety', 'Safety', Shield],
  ['boosts', 'Boosts', Rocket],
] as const;

const VIS: { id: Visibility; icon: typeof Lock; title: string; text: string }[] = [
  { id: 'private', icon: Lock, title: 'Private', text: 'Invite only. Not listed anywhere.' },
  { id: 'request', icon: UserCheck, title: 'Ask to join', text: 'Listed in Discover. Mods approve each new member.' },
  { id: 'public', icon: Globe, title: 'Open', text: 'An open room: listed, anyone can walk in and join.' },
];

/** Room settings: the owner (and mods) edit the room here, from Home, the Chat page or inside the room. */
export function RoomSettingsDialog({ room, tab, onClose }: { room: PlaceRoom; tab: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!tab} onOpenChange={(o) => !o && onClose()}>
      {tab && <Body key={tab} room={room} initial={tab} />}
    </Dialog>
  );
}

function Body({ room, initial }: { room: PlaceRoom; initial: string }) {
  const [current, setCurrent] = useState(initial);
  return (
    <DialogContent className="flex h-[min(680px,90dvh)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-4xl">
      <aside className="hidden w-52 flex-none flex-col gap-1 bg-muted/60 p-3 sm:flex">
        <p className="truncate px-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
          {room.emoji} {room.name}
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
        <DialogDescription className="sr-only">Room settings</DialogDescription>
        {/* Phones: no side list, so the tabs are chips */}
        <div className="mt-3 flex gap-1 overflow-x-auto sm:hidden">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setCurrent(id)}
              className={cn(
                'flex-none rounded-full px-3 py-1 text-xs font-bold',
                current === id ? 'bg-secondary text-primary' : 'bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-5">
          {current === 'overview' && <Overview room={room} />}
          {current === 'map' && <MapAndCapacity room={room} />}
          {current === 'members' && <Members room={room} />}
          {current === 'boosts' && <Boosts room={room} />}
          {current === 'invites' && (
            <Toggles
              rows={[
                ['Members can invite', 'Off: only owner and mods make invite links', true],
                ['Guest links expire after 24 h', 'Guests see only this room and carry a guest badge', true],
                ['Guests can use voice', 'Off: guests can listen and chat but not talk', false],
              ]}
            />
          )}
          {current === 'safety' && (
            <Toggles
              rows={[
                ['Filter rude words', 'In the room chat and the bubbles', true],
                ['Slow mode', 'One message every 5 seconds', false],
                ['New members wait 10 minutes to talk', '', false],
                ['Show rules before joining', '', true],
              ]}
            />
          )}
        </div>
      </div>
    </DialogContent>
  );
}

function Overview({ room }: { room: PlaceRoom }) {
  const [vis, setVis] = useState(room.server.visibility);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className={cn('grid size-20 place-items-center rounded-3xl text-4xl', room.tint)}>{room.emoji}</span>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="rn">Room name</Label>
          <Input id="rn" defaultValue={room.name} className="rounded-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rd">Description</Label>
        <Input id="rd" defaultValue={room.description} className="rounded-xl" />
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
      </div>
      <Button className="w-fit rounded-full font-extrabold" onClick={() => toast.success('Saved')}>
        Save changes
      </Button>
      {room.myRole === 'Owner' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-destructive/30 p-3">
          <p className="min-w-0 flex-1 text-sm">
            <span className="block font-extrabold">Danger zone</span>
            <span className="text-xs text-muted-foreground">Hand the room to a mod, or delete it with its chat for everyone.</span>
          </p>
          <Button variant="outline" className="rounded-full font-extrabold" onClick={() => toast('Pick a member to make owner')}>
            Transfer ownership
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-destructive/40 font-extrabold text-destructive"
            onClick={() => toast('Type the room name to confirm')}
          >
            Delete room
          </Button>
        </div>
      )}
    </div>
  );
}

function MapAndCapacity({ room }: { room: PlaceRoom }) {
  const [mapId, setMapId] = useState(room.map.id);
  const max = levelFor(room.boosts).capacity;
  const someoneInside = room.people.length > 0;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-extrabold">Map</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {MAPS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMapId(m.id)}
              className={cn('rounded-2xl border-2 p-2 text-left', mapId === m.id ? 'border-primary' : 'border-border')}
            >
              <span className={cn('grid h-20 place-items-center rounded-xl text-3xl', m.tint)}>{m.emoji}</span>
              <p className="mt-1.5 text-sm font-extrabold">{m.name}</p>
              <p className="text-[11px] text-muted-foreground">{m.zones.join(' · ')}</p>
            </button>
          ))}
        </div>
        {mapId !== room.map.id && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-peach p-3 text-sm text-peach-ink">
            <p className="min-w-0 flex-1 font-bold">
              {someoneInside
                ? `${room.people.length} people are inside. The map switches when everyone leaves; the chat, members and link stay.`
                : 'Nobody’s inside, so the map switches right away. The chat, members and link stay.'}
            </p>
            {someoneInside && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full bg-card font-extrabold"
                onClick={() => toast('Everyone gets a 30-second heads-up, then reloads into the new map')}
              >
                Switch now
              </Button>
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Maps are made by the Connecta team. Drawings, games and the room’s bubbles reset whenever the room empties, so switching loses
          nothing saved.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>
          People at once · <span className="font-mono">{max}</span>
        </Label>
        <Slider defaultValue={[max]} min={2} max={max} />
        <p className="text-xs text-muted-foreground">
          Free: 25 · Level 1: 50 · Level 2: 100. When it’s full, it’s full: boost the room to fit more.
        </p>
      </div>
      <Toggles
        rows={[
          ['Allow guests', 'People with a guest link can walk in without an account', room.scene.allowGuests],
          ['Quiet room', 'No room-wide games or jukebox. Good for studying.', room.scene.quiet],
        ]}
      />
    </div>
  );
}

function Members({ room }: { room: PlaceRoom }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Members and capacity are two different limits; say so where people manage them */}
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <p className="rounded-2xl bg-muted p-3 text-sm">
          <span className="block text-lg font-black">
            {room.server.memberCount}/{levelFor(room.boosts).members}
          </span>
          members. Members can read and write the Room chat any time, from anywhere. Boosts raise the limit (150 / 300 / 500 / 1,000).
        </p>
        <p className="rounded-2xl bg-muted p-3 text-sm">
          <span className="block text-lg font-black">
            {room.inside}/{room.capacity}
          </span>
          inside right now. When it’s full, members wait for a spot (and can ask to be told). The owner and mods always fit.
        </p>
      </div>
      {room.server.members.map((id) => {
        const u = userById(id);
        const role = room.server.roles[id] ?? 'Member';
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

/** Anyone in the room can boost it; Connecta Plus comes with 2 boosts to put on any room. */
function Boosts({ room }: { room: PlaceRoom }) {
  const now = levelFor(room.boosts);
  const next = BOOST_LEVELS[now.level + 1];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-gradient-to-br from-secondary via-peach to-lavender p-5">
        <p className="text-sm font-bold text-muted-foreground">
          Level {now.level} · {room.boosts} boosts · {now.capacity} people at once
        </p>
        {next && (
          <>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-card/70">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(room.boosts / next.boosts) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm">
              {next.boosts - room.boosts} more to Level {next.level}
            </p>
          </>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {BOOST_LEVELS.map((l) => (
          <div
            key={l.level}
            className={cn('rounded-2xl border-2 p-3', l.level === now.level ? 'border-primary bg-secondary/40' : 'border-border')}
          >
            <p className="font-black">
              {l.level ? `Level ${l.level}` : 'Free'}
              <span className="ml-2 text-xs font-bold text-muted-foreground">{l.boosts ? `${l.boosts} boosts` : 'no boosts'}</span>
            </p>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm">
              <li className="flex items-center gap-1.5 font-bold">
                <Check className="size-3.5 text-primary" /> {l.capacity} people at once
              </li>
              <li className="flex items-center gap-1.5 font-bold">
                <Check className="size-3.5 text-primary" /> {l.members.toLocaleString()} members
              </li>
              {l.perks.map((p) => (
                <li key={p} className="flex items-center gap-1.5 text-muted-foreground">
                  <Check className="size-3.5 text-primary" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button className="rounded-full font-extrabold" onClick={() => toast.success('Boosted! Thank you 💖')}>
          <Rocket /> Boost this room
        </Button>
        <p className="text-xs text-muted-foreground">Anyone in the room can boost. Connecta Plus includes 2 boosts for any room.</p>
      </div>
    </div>
  );
}

function Toggles({ rows }: { rows: [string, string, boolean][] }) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map(([label, hint, on]) => (
        <label key={label} className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-bold">{label}</span>
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
          </span>
          <Switch defaultChecked={on} />
        </label>
      ))}
    </div>
  );
}
