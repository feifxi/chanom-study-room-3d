'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Link2, Lock, Map as MapIcon, ScrollText, Shield, UserCheck, Users } from 'lucide-react';
import {
  maxInside,
  ROOM_DESCRIPTION_MAX,
  ROOM_LANGUAGES,
  ROOM_NAME_MAX,
  ROOM_RULES_MAX,
  ROOM_TAGS,
  ROOM_TAGS_MAX,
  type MapId,
  type Visibility,
} from '@connecta/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { roomsApi, useMembers, useRoomAction, type RoomSettings } from '@/features/rooms/useRooms';
import { cn } from '@/lib/utils';
import { MAPS } from '@/lib/maps';
import { type PlaceRoom } from './model';
import { SizePicker, TemplateCard } from './MapPickers';
import { InvitesPanel, MembersPanel } from './RoomMembers';
import { mapById, ROOM_TIMES, toThumbnail, type RoomLook } from './roomLook';
import { Scene } from './Scene';

const TABS = [
  ['overview', 'Overview', ScrollText],
  ['map', 'Map & look', MapIcon],
  ['members', 'Members & roles', Users],
  ['invites', 'Invites', Link2],
  ['safety', 'Rules & safety', Shield],
] as const;
type TabId = (typeof TABS)[number][0];
/**
 * Where each setting lives (settings audit, 2026-11-09):
 * - Overview: what the room is and who it's for (name, picture, description, tags, who can join, how many at once)
 * - Map & look: only the place itself (template, size, time of day)
 * - Invites: links, and who may use them (guests)
 * - Rules & safety: the rules people read, and what's allowed inside (filters, room-wide games)
 *
 * Mods manage people, invites and rules; the room itself (name, map, visibility, deleting) is the owner's.
 */
const MOD_TABS: TabId[] = ['members', 'invites', 'safety'];

const VIS: { id: Visibility; icon: typeof Lock; title: string; text: string }[] = [
  { id: 'private', icon: Lock, title: 'Private', text: 'Invite only. Not listed anywhere.' },
  { id: 'request', icon: UserCheck, title: 'Ask to join', text: 'Listed in Discover. Mods approve each new member.' },
  { id: 'open', icon: Globe, title: 'Open', text: 'An open room: listed, anyone can walk in and join.' },
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
  const myRole = room.myRole;
  // Members never get here (they see About this room instead); the guard keeps it that way
  const tabs = TABS.filter(([id]) => myRole === 'owner' || (myRole === 'mod' && MOD_TABS.includes(id)));
  const [current, setCurrent] = useState(tabs.some((t) => t[0] === initial) ? initial : tabs[0]![0]);
  return (
    <DialogContent className="flex h-[min(680px,90dvh)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-4xl">
      <aside className="hidden w-52 flex-none flex-col gap-1 bg-muted/60 p-3 sm:flex">
        <div className="px-2 pb-2">
          <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">Room settings</p>
          <p className="truncate text-sm font-black">
            {room.emoji} {room.name}
          </p>
          <p className="text-[11px] text-muted-foreground">Changes the room for everyone</p>
        </div>
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
        <DialogDescription className="sr-only">Room settings: changes the room for everyone</DialogDescription>
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
          {current === 'map' && <MapAndLook room={room} />}
          {current === 'members' && <MembersPanel room={room} />}
          {current === 'invites' && (
            <InvitesPanel
              room={room}
              toggles={
                <Toggles
                  room={room}
                  rows={[
                    ['membersCanInvite', 'Members can invite', 'Off: only the owner and mods make invite links'],
                    ['allowGuests', 'Allow guests', 'Guest passes let people walk in for 24 hours without an account'],
                    ['guestVoice', 'Guests can use voice', 'Off: guests with a 24-hour pass can listen and type in Bubbles, but not talk'],
                  ]}
                />
              }
            />
          )}
          {current === 'safety' && <RulesAndSafety room={room} />}
        </div>
      </div>
    </DialogContent>
  );
}

/** Saves settings and says so; the API has the last word on what each role may change. */
function useSave(room: PlaceRoom, message = 'Saved') {
  return useRoomAction(
    (body: RoomSettings) => roomsApi.update({ id: room.id, ...body }),
    () => toast.success(message),
  );
}

function Overview({ room }: { room: PlaceRoom }) {
  const r = room.room;
  const [name, setName] = useState(r.name);
  const [description, setDescription] = useState(r.description);
  const [vis, setVis] = useState<Visibility>(r.visibility);
  // A fixed list, up to 3: free-text tags only get spammed (docs/features/02-rooms.md)
  const [tags, setTags] = useState<string[]>(r.tags);
  const [lang, setLang] = useState<string | null>(r.language);
  const [capacity, setCapacity] = useState(r.capacity);
  const [transfer, setTransfer] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const save = useSave(room);
  const listed = vis !== 'private';
  const toggleTag = (t: string) =>
    setTags((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : cur.length < ROOM_TAGS_MAX ? [...cur, t] : (toast(`Up to ${ROOM_TAGS_MAX} tags`), cur),
    );
  const submit = () => {
    save.mutate({
      name: name.trim(),
      description: description.trim(),
      visibility: vis,
      tags: tags as RoomSettings['tags'],
      language: lang as RoomSettings['language'],
      capacity,
    });
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className={cn('grid size-20 place-items-center rounded-3xl text-4xl', room.tint)}>{room.emoji}</span>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="rn">Room name</Label>
          <Input id="rn" value={name} onChange={(e) => setName(e.target.value)} maxLength={ROOM_NAME_MAX} className="rounded-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rd">Description</Label>
        <Input
          id="rd"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={ROOM_DESCRIPTION_MAX}
          placeholder="What’s it for? e.g. “Card night every Friday”"
          className="rounded-xl"
        />
      </div>
      {r.me.role === 'owner' && <ThumbnailPicker room={room} />}
      <div>
        <p className="mb-2 text-sm font-extrabold">Who can join</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {VIS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVis(v.id)}
              aria-pressed={vis === v.id}
              className={cn('rounded-2xl border-2 p-3 text-left', vis === v.id ? 'border-primary bg-secondary/50' : 'border-border')}
            >
              <v.icon className="size-5 text-primary" />
              <p className="mt-1 font-extrabold">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.text}</p>
            </button>
          ))}
        </div>
      </div>
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-extrabold">Tags and language</p>
          <p className="text-xs text-muted-foreground">
            {listed ? 'How people find the room in Discover.' : 'Used in Discover once the room is listed (Ask to join or Open).'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_TAGS.map((t) => (
            <Chip key={t} on={tags.includes(t)} onClick={() => toggleTag(t)}>
              {t}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-muted-foreground">Language</span>
          {ROOM_LANGUAGES.map((l) => (
            <Chip key={l} on={lang === l} onClick={() => setLang(lang === l ? null : l)}>
              {l}
            </Chip>
          ))}
        </div>
      </section>
      <div className="flex flex-col gap-2">
        <Label>
          People at once · <span className="font-mono">{capacity}</span>
        </Label>
        <Slider value={[capacity]} onValueChange={([v]) => setCapacity(v!)} min={2} max={r.maxCapacity} />
        <p className="text-xs text-muted-foreground">
          Free: 25 · Plus: 50 on a Cosy map, 100 on a Big one (the size is in Map & look). When it’s full, it’s full.
        </p>
      </div>
      <Button className="w-fit rounded-full font-extrabold" disabled={!name.trim() || save.isPending} onClick={submit}>
        Save changes
      </Button>
      {room.myRole === 'owner' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-destructive/30 p-3">
          <p className="min-w-0 flex-1 text-sm">
            <span className="block font-extrabold">Danger zone</span>
            <span className="text-xs text-muted-foreground">Hand the room to a member, or delete it with its chat for everyone.</span>
          </p>
          <Button variant="outline" className="rounded-full font-extrabold" onClick={() => setTransfer(true)}>
            Transfer ownership
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-destructive/40 font-extrabold text-destructive"
            onClick={() => setDeleting(true)}
          >
            Delete room
          </Button>
        </div>
      )}
      <TransferDialog room={room} open={transfer} onOpenChange={setTransfer} />
      <DeleteRoomDialog room={room} open={deleting} onOpenChange={setDeleting} />
    </div>
  );
}

/** Hand the room over: pick a member (mods first, they know the room); you stay on as a mod. */
function TransferDialog({ room, open, onOpenChange }: { room: PlaceRoom; open: boolean; onOpenChange: (o: boolean) => void }) {
  const members = useMembers(room.id, open);
  const others = (members.data ?? []).filter((m) => m.role !== 'owner');
  const [to, setTo] = useState('');
  const picked = to || others[0]?.person.id || '';
  const transfer = useRoomAction(roomsApi.transfer, () => {
    onOpenChange(false);
    toast.success(`${others.find((m) => m.person.id === picked)?.person.name} owns ${room.name} now. You’re a mod.`);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-black">Hand {room.name} over</DialogTitle>
          <DialogDescription>They get everything: the map, who can join, mods, deleting. You stay on as a mod.</DialogDescription>
        </DialogHeader>
        {others.length ? (
          <Select value={picked} onValueChange={setTo}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {others.map((m) => (
                <SelectItem key={m.person.id} value={m.person.id}>
                  {m.person.name} {m.role === 'mod' ? '· mod' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="rounded-2xl bg-muted p-3 text-sm">
            {members.isPending ? 'Loading…' : 'Nobody else is in the room yet. Invite someone first.'}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-full font-extrabold" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-full font-extrabold"
            disabled={!picked || transfer.isPending}
            onClick={() => transfer.mutate({ id: room.id, userId: picked })}
          >
            Hand it over
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Deleting a room takes its chat with it for everyone, so it's confirmed by typing the name. */
function DeleteRoomDialog({ room, open, onOpenChange }: { room: PlaceRoom; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const remove = useRoomAction(roomsApi.remove, () => {
    onOpenChange(false);
    toast(`${room.name} is gone`);
    router.push('/home');
  });
  const matches = typed.trim().toLowerCase() === room.name.toLowerCase();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-black">Delete {room.name}?</DialogTitle>
          <DialogDescription>
            The room, its chat and its {room.room.memberCount === 1 ? 'membership' : `${room.room.memberCount} members`} go for everyone.
            This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="delete-room">Type the room’s name to confirm</Label>
          <Input id="delete-room" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={room.name} className="rounded-xl" />
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full font-extrabold" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button
            className="rounded-full bg-destructive font-extrabold text-white hover:bg-destructive/90"
            disabled={!matches || remove.isPending}
            onClick={() => remove.mutate({ id: room.id, name: typed })}
          >
            Delete room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MapAndLook({ room }: { room: PlaceRoom }) {
  const r = room.room;
  const [look, setLook] = useState<RoomLook>({ mapId: r.mapId, size: r.size, time: r.time });
  const set = (patch: Partial<RoomLook>) => setLook((l) => ({ ...l, ...patch }));
  const someoneInside = room.people.length > 0;
  const mapChanged = look.mapId !== r.mapId || look.size !== r.size;
  const save = useRoomAction(
    () => roomsApi.update({ id: room.id, mapId: look.mapId as MapId, size: look.size, time: look.time }),
    () => {
      // Everyone inside (this tab too) hears it from the game server and the gateway
      toast.success(mapChanged && someoneInside ? `Moving everyone to ${mapById(look.mapId).name}` : 'Saved for everyone in the room');
    },
  );

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
          Every template has the same things to do (study spots, private zones, big screen, games, whiteboard, Buddy Machine); only the
          place and its look differ. Premium maps for rooms whose owner has Plus are on the way.
        </p>
      </section>

      <section>
        <p className="mb-2 text-sm font-extrabold">Size</p>
        <SizePicker size={look.size} plus={room.ownerPlus} onPick={(size) => set({ size })} />
        {maxInside(room.ownerPlus, look.size) < r.capacity && (
          <p className="mt-2 text-xs text-muted-foreground">People at once drops to {maxInside(room.ownerPlus, look.size)}.</p>
        )}
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

      <Button className="w-fit rounded-full font-extrabold" disabled={save.isPending} onClick={() => save.mutate(undefined)}>
        {mapChanged && someoneInside ? 'Save and move everyone' : 'Save changes'}
      </Button>
    </div>
  );
}

/**
 * The room's picture on Home, Discover and invites: the owner's own, or the map's. It saves at once
 * (not with Save changes): the API crops and checks it first, so it can say no.
 */
function ThumbnailPicker({ room }: { room: PlaceRoom }) {
  const thumbnail = room.room.thumbnail;
  const set = useRoomAction(roomsApi.setThumbnail, () => toast.success('Thumbnail saved'));
  const clear = useRoomAction(roomsApi.clearThumbnail, () => toast.success('Back to the map’s picture'));
  const [cropping, setCropping] = useState(false);
  const busy = cropping || set.isPending || clear.isPending;
  const pick = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('That picture is over 5 MB');
    setCropping(true);
    let picture: Blob;
    try {
      picture = await toThumbnail(file);
    } catch {
      return toast.error('That doesn’t look like a picture');
    } finally {
      setCropping(false);
    }
    set.mutate({ id: room.id, picture });
  };
  return (
    <section>
      <p className="mb-2 text-sm font-extrabold">Thumbnail</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative isolate aspect-video w-48 overflow-hidden rounded-2xl">
          <Scene
            mapId={room.room.mapId}
            thumbnail={thumbnail}
            className={cn(busy && 'opacity-60')}
            emojiClass="right-3 bottom-2 text-4xl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className={cn(
              'w-fit cursor-pointer rounded-full border bg-card px-4 py-1.5 text-sm font-extrabold hover:bg-muted',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            {busy ? 'Saving…' : thumbnail ? 'Change picture' : 'Upload a picture'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {thumbnail && (
            <button
              type="button"
              disabled={busy}
              onClick={() => clear.mutate(room.id)}
              className="w-fit text-xs font-bold text-muted-foreground hover:underline"
            >
              Use the map’s picture
            </button>
          )}
          <p className="max-w-64 text-xs text-muted-foreground">
            Cropped to 16:9, up to 5 MB. Checked before it shows. Without one, the map’s picture is used.
          </p>
        </div>
      </div>
    </section>
  );
}

/** The rules people read before joining (and in About this room), plus what's allowed inside. */
function RulesAndSafety({ room }: { room: PlaceRoom }) {
  const [rules, setRules] = useState(room.room.rules);
  const save = useSave(room, 'Rules saved');
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Label htmlFor="rules">Room rules</Label>
        <Textarea
          id="rules"
          rows={4}
          maxLength={ROOM_RULES_MAX}
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="rounded-xl"
        />
        <Button
          variant="secondary"
          className="w-fit rounded-full font-bold"
          disabled={save.isPending}
          onClick={() => save.mutate({ rules: rules.trim() })}
        >
          Save rules
        </Button>
      </section>
      <Toggles
        room={room}
        rows={[
          ['showRules', 'Show rules before joining', 'New members tick “I’ll follow the rules” before they’re in'],
          ['filterWords', 'Filter rude words', 'In the room chat and the bubbles'],
          ['slowMode', 'Slow mode', 'One message every 5 seconds'],
          ['newMemberWait', 'New members wait 10 minutes to talk', ''],
          [
            'roomWideGames',
            'Room-wide games',
            'Off: nobody can start games that invite the whole room (Pick a Side). Tables, the TV and the board still work.',
          ],
        ]}
      />
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-bold',
        on ? 'border-primary bg-secondary text-secondary-foreground' : 'hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

type Toggle =
  'showRules' | 'filterWords' | 'slowMode' | 'newMemberWait' | 'roomWideGames' | 'membersCanInvite' | 'allowGuests' | 'guestVoice';

/** On/off settings save as soon as they're flipped. */
function Toggles({ room, rows }: { room: PlaceRoom; rows: [Toggle, string, string][] }) {
  const save = useSave(room);
  return (
    <div className="flex flex-col gap-4">
      {rows.map(([key, label, hint]) => (
        <label key={key} className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-bold">{label}</span>
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
          </span>
          <Switch checked={room.room[key]} disabled={save.isPending} onCheckedChange={(on) => save.mutate({ [key]: on })} />
        </label>
      ))}
    </div>
  );
}
