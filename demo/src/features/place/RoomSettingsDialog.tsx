'use client';

import { useState } from 'react';
import { Globe, Link2, Lock, Map as MapIcon, ScrollText, Shield, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { MAP_SIZES, MAPS, type Visibility } from '@/lib/mock';
import { planOf, type PlaceRoom } from './model';
import { SizePicker, TemplateCard } from './MapPickers';
import { InvitesPanel, MembersPanel } from './RoomMembers';
import { mapById, ROOM_TIMES, saveLook, toThumbnail, useRoomLook, type RoomLook } from './roomLook';
import { Scene } from './Scene';

const TABS = [
  ['overview', 'Overview', ScrollText],
  ['map', 'Map & look', MapIcon],
  ['members', 'Members & roles', Users],
  ['invites', 'Invites', Link2],
  ['safety', 'Safety', Shield],
] as const;
type TabId = (typeof TABS)[number][0];
/** Mods manage people and safety; the room itself (name, map, visibility, deleting) is the owner's. */
const MOD_TABS: TabId[] = ['members', 'invites', 'safety'];

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
  const myRole = room.server.roles.me;
  const tabs = TABS.filter(([id]) => myRole === 'Owner' || MOD_TABS.includes(id));
  const [current, setCurrent] = useState(tabs.some((t) => t[0] === initial) ? initial : tabs[0]![0]);
  return (
    <DialogContent className="flex h-[min(680px,90dvh)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-4xl">
      <aside className="hidden w-52 flex-none flex-col gap-1 bg-muted/60 p-3 sm:flex">
        <p className="truncate px-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
          {room.emoji} {room.name}
        </p>
        {tabs.map(([id, label, Icon]) => (
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
          {tabs.map(([id, label]) => (
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
          {current === 'members' && <MembersPanel room={room} myRole={myRole} />}
          {current === 'invites' && (
            <InvitesPanel
              toggles={
                <Toggles
                  rows={[
                    ['Members can invite', 'Off: only the owner and mods make invite links', true],
                    ['Guests can use voice', 'Off: guests with a 24-hour pass can listen and type in Bubbles, but not talk', false],
                  ]}
                />
              }
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
  const saved = useRoomLook(room.id, room.map.id);
  const [look, setLook] = useState(saved);
  const set = (patch: Partial<RoomLook>) => setLook((l) => ({ ...l, ...patch }));
  const max = Math.min(planOf(room.ownerPlus).capacity, MAP_SIZES.find((s) => s.id === look.size)!.upTo);
  const someoneInside = room.people.length > 0;
  const mapChanged = look.mapId !== saved.mapId || look.size !== saved.size;

  const save = () => {
    // Everything applies at once, a new map too: people inside get a short loading screen (feature 7)
    if (!saveLook(room.id, look)) return toast.error('Couldn’t save that. Try a smaller picture.');
    toast.success(mapChanged && someoneInside ? `Moving everyone to ${mapById(look.mapId).name}` : 'Saved for everyone in the room');
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="mb-2 text-sm font-extrabold">Template</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {MAPS.map((m) => (
            <TemplateCard key={m.id} map={m} picked={look.mapId === m.id} onPick={() => set({ mapId: m.id })} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Every template has the same things to do (study spots, private zones, big screen, jukebox, games, whiteboard, Buddy Machine); only
          the place and its look differ. Premium maps for rooms whose owner has Plus are on the way.
        </p>
      </section>

      <section>
        <p className="mb-2 text-sm font-extrabold">Size</p>
        <SizePicker size={look.size} plus={room.ownerPlus} onPick={(size) => set({ size })} />
      </section>

      {mapChanged && (
        <p className="-mt-3 rounded-2xl bg-peach p-3 text-sm font-bold text-peach-ink">
          {someoneInside
            ? `${room.people.length} people are inside. When you save, everyone sees a short loading screen and lands at the door of the new map. Voice and chat keep going; seats and screen shares end. Boards and card games move with you.`
            : 'Nobody’s inside, so the new map is ready for the next person. The chat, members and link stay.'}
        </p>
      )}

      <section>
        <p className="mb-2 text-sm font-extrabold">Time of day</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROOM_TIMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set({ time: t.id })}
              aria-pressed={look.time === t.id}
              className={cn(
                'rounded-2xl border-2 p-2.5 text-left',
                look.time === t.id ? 'border-primary bg-secondary/40' : 'border-border',
              )}
            >
              <span className="block text-sm font-extrabold">
                {t.id === 'clock' ? '🕐' : t.id === 'day' ? '☀️' : '🌙'} {t.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{t.text}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The same for everyone inside{look.time === 'clock' && ', on the room’s clock (Asia/Bangkok, from your settings)'}. Battery saver
          stays each person’s own.
        </p>
      </section>

      <ThumbnailPicker roomId={room.id} look={look} onChange={(thumb) => set({ thumb })} />

      <div className="flex flex-col gap-2">
        <Label>
          People at once · <span className="font-mono">{max}</span>
        </Label>
        <Slider key={max} defaultValue={[max]} min={2} max={max} />
        <p className="text-xs text-muted-foreground">Free: 25 · Plus: 50 on a Cosy map, 100 on a Big one. When it’s full, it’s full.</p>
      </div>
      <Toggles
        rows={[
          ['Allow guests', 'People with a guest link can walk in without an account', room.scene.allowGuests],
          [
            'Room-wide games',
            'Off: nobody can start games that invite the whole room. Tables, TV and the board still work.',
            room.scene.roomWideGames,
          ],
        ]}
      />
      <Button className="w-fit rounded-full font-extrabold" onClick={save}>
        {mapChanged && someoneInside ? 'Save and move everyone' : 'Save changes'}
      </Button>
    </div>
  );
}

/** The room's picture on Home, Discover and invites: the owner's own, or the map's. */
function ThumbnailPicker({ roomId, look, onChange }: { roomId: string; look: RoomLook; onChange: (thumb?: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('That picture is over 5 MB');
    setBusy(true);
    try {
      onChange(await toThumbnail(file));
    } catch {
      toast.error('That doesn’t look like a picture');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <p className="mb-2 text-sm font-extrabold">Thumbnail</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative isolate aspect-video w-48 overflow-hidden rounded-2xl">
          {look.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- a data URL preview
            <img src={look.thumb} alt="Room thumbnail" className="absolute inset-0 size-full object-cover" />
          ) : (
            <Scene roomId={`preview:${roomId}`} mapId={look.mapId} emojiClass="right-3 bottom-2 text-4xl" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="w-fit cursor-pointer rounded-full border bg-card px-4 py-1.5 text-sm font-extrabold hover:bg-muted">
            {busy ? 'Loading…' : look.thumb ? 'Change picture' : 'Upload a picture'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {look.thumb && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="w-fit text-xs font-bold text-muted-foreground hover:underline"
            >
              Use the map’s picture
            </button>
          )}
          <p className="max-w-64 text-xs text-muted-foreground">
            16:9, up to 5 MB. Checked before it shows. Without one, the map’s picture is used.
          </p>
        </div>
      </div>
    </section>
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
