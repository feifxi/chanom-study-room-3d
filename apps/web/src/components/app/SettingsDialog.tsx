'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Bell, Crown, Gamepad2, KeyRound, Mic, Palette, Shield, Shirt, User } from 'lucide-react';
import { toast } from 'sonner';
import { DISPLAY_NAME_MAX, type AvatarLook } from '@connecta/shared';
import { PALETTES, usePalette } from '@/components/Providers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { HandleField, useHandleCheck } from '@/features/account/HandleField';
import { useAccountDetails, useMe, useSetMe } from '@/features/account/useMe';
import { CharacterEditor } from '@/features/avatar/CharacterEditor';
import { PersonFace } from '@/components/PersonFace';
import { friendsApi, useBlocks, useFriendAction } from '@/features/friends/useFriends';
import { api } from '@/lib/api/client';
import { AccountTab } from './AccountTab';
import { PlusBillingTab } from './PlusBillingTab';
import { cn } from '@/lib/utils';
import { useGlobalOptIn } from '@/lib/focus';
import { getMyLook, saveMyLook, useMyLook } from '@/lib/myLook';
import { KEYS, useClickToWalk, useHideInvitesWhileFocusing } from '@/lib/controls';

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
export type SettingsTab = Tab;

/** User settings: one dialog with a tab list, like most chat apps, in the cosy style. */
export function SettingsDialog({
  open,
  onOpenChange,
  initialTab = 'profile',
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Inside a room it opens on Voice & sound, the thing people look for there. */
  initialTab?: SettingsTab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(640px,90dvh)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-3xl">
        <aside className="hidden w-52 flex-none flex-col gap-1 bg-muted/60 p-3 sm:flex">
          <div className="px-2 pb-2">
            <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">Your settings</p>
            <p className="text-[11px] text-muted-foreground">Only you, in every room</p>
          </div>
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
              <PlusBillingTab />
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

/** Display name and @handle (once every 30 days), saved to the account. "About me" isn't saved yet. */
function Profile({ onEditCharacter }: { onEditCharacter: () => void }) {
  const myLook = useMyLook();
  const { data: me } = useMe();
  const setMe = useSetMe();
  const details = useAccountDetails();
  const [name, setName] = useState(me?.name ?? '');
  const [handle, setHandle] = useState(me?.handle ?? '');
  const [busy, setBusy] = useState(false);
  const check = useHandleCheck(handle);
  const nextChange = details.data?.nextHandleChangeAt ? new Date(details.data.nextHandleChangeAt) : null;
  if (!me?.signedUp) return <p className="text-sm text-muted-foreground">Sign up to have a profile.</p>;

  const saveName = async () => {
    setBusy(true);
    const { data } = await api.PATCH('/api/me/profile', { body: { name: name.trim() } });
    setBusy(false);
    if (!data) return toast.error("Couldn't save your name. Try again?");
    setMe(data);
    toast.success('Name saved ✨');
  };
  const saveHandle = async () => {
    setBusy(true);
    const { data, error, response } = await api.PUT('/api/me/handle', { body: { handle } });
    setBusy(false);
    if (!data) {
      const tooSoon = response.status === 409 && error && 'nextChangeAt' in error;
      return toast.error(tooSoon ? 'You changed it recently. Try again later.' : "Couldn't change it. Is it still free?");
    }
    setMe(data);
    void details.refetch();
    toast.success(`You're @${data.handle} now ✨`);
  };

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="h-56 w-40 flex-none overflow-hidden rounded-3xl bg-gradient-to-b from-lavender to-peach">
        <AvatarPreview look={myLook.look} />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dn">Display name</Label>
          <div className="flex gap-2">
            <Input id="dn" value={name} maxLength={DISPLAY_NAME_MAX} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            <Button
              variant="secondary"
              className="rounded-xl font-bold"
              disabled={busy || !name.trim() || name.trim() === me.name}
              onClick={() => void saveName()}
            >
              Save
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {nextChange ? (
            <>
              <Label htmlFor="un">@handle</Label>
              <Input id="un" value={`@${me.handle}`} disabled className="rounded-xl" />
              <p className="text-xs text-muted-foreground">
                You can change it again on {nextChange.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.
              </p>
            </>
          ) : (
            <>
              <HandleField handle={handle} check={handle === me.handle ? { ok: true } : check} onChange={setHandle} />
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="rounded-xl font-bold"
                  disabled={busy || handle === me.handle || check.ok !== true}
                  onClick={() => void saveHandle()}
                >
                  Change my @handle
                </Button>
                <p className="text-xs text-muted-foreground">Once every 30 days. Your old one stays yours for 30 days.</p>
              </div>
            </>
          )}
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
  const [look, setLook] = useState<AvatarLook>(getMyLook);
  const { data: me } = useMe();
  const setMe = useSetMe();
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
      <Button
        className="w-fit rounded-full font-extrabold"
        onClick={async () => {
          const r = saveMyLook(look);
          if (!r.ok) return toast(`One more sec: you can change again in ${r.waitS} s`);
          // Guests' looks live on their guest session (set on the invite page), so only accounts save here
          if (me?.signedUp) {
            const { data } = await api.PATCH('/api/me/profile', { body: { look } });
            if (!data) return toast.error("Couldn't save your look. Try again?");
            setMe(data);
          }
          toast.success('Looking good! ✨ Everyone in the room sees it now');
        }}
      >
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
      <Row label="Fade my music while I watch" hint="Your lo-fi gets quieter while you’re watching the big screen." defaultChecked />
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

function Toggles({ tab }: { tab: Tab }) {
  if (tab === 'notifications')
    return (
      <div className="flex flex-col gap-5">
        <Row label="Mentions and DMs" defaultChecked />
        <Row label="Room events starting" hint="“Card night starts in 10 minutes”" defaultChecked />
        <HideInvitesRow />
        <Row label="Sounds" defaultChecked />
      </div>
    );
  return (
    <div className="flex flex-col gap-5">
      <Row label="Appear offline" hint="Friends won’t see you’re online or which room you’re in" />
      <FriendRequestsRow />
      <Row label="Show what I’m doing to friends" hint="“Focusing · Calculus”, “Playing Slave”" defaultChecked />
      <GlobalRankRow />
      <Row label="Filter rude words in chats" defaultChecked />
      <BlockedPeople />
    </div>
  );
}

/**
 * Who may send you a friend request (feature 5: by @handle, friend link or a room's people list).
 * Plain choices instead of an on/off whose "off" needed explaining. DMs are friends-only either way.
 */
function FriendRequestsRow() {
  const { data: me } = useMe();
  const setMe = useSetMe();
  const who = me?.requestsFrom ?? 'anyone';
  const setWho = async (requestsFrom: typeof who) => {
    const { data } = await api.PATCH('/api/me/privacy', { body: { requestsFrom } });
    if (!data) return toast.error('Couldn’t save that. Try again?');
    setMe(data);
    toast.success('Saved');
  };
  const options = [
    ['anyone', 'Anyone', 'Anyone with your @handle or friend link, or who meets you in a room'],
    ['rooms', 'People from my rooms', 'Members of rooms you’re in, and people inside the same room as you right now'],
    ['nobody', 'Nobody', 'No one can send you one. You can still add people yourself'],
  ] as const;
  return (
    <section className="flex flex-col gap-2">
      <span>
        <span className="block text-sm font-bold">Who can send me friend requests</span>
        <span className="block text-xs text-muted-foreground">Only friends can message you, whichever you pick.</span>
      </span>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(([id, title, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => void setWho(id)}
            aria-pressed={who === id}
            className={cn('rounded-2xl border-2 p-2.5 text-left', who === id ? 'border-primary bg-secondary/40' : 'border-border')}
          >
            <span className="block text-sm font-extrabold">{title}</span>
            <span className="block text-[11px] text-muted-foreground">{text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Who you've blocked, with Unblock. Blocking happens from a friend's or a person's "…". */
function BlockedPeople() {
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  const blocks = useBlocks(!!me?.signedUp && !me.isGuest);
  const unblock = useFriendAction(friendsApi.unblock);
  return (
    <>
      <Button variant="outline" className="w-fit rounded-full font-bold" onClick={() => setOpen(true)}>
        Blocked people ({blocks.data?.length ?? 0})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-sm">
          <DialogTitle className="text-xl font-black">Blocked people</DialogTitle>
          <DialogDescription>They can’t message you or send you a friend request. They aren’t told.</DialogDescription>
          <div className="flex flex-col gap-2">
            {blocks.data?.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nobody. Lovely 🌷</p>}
            {blocks.data?.map(({ person }) => (
              <div key={person.id} className="flex items-center gap-3 rounded-2xl border p-2.5">
                <PersonFace who={person} size={34} />
                <span className="min-w-0 flex-1 truncate font-extrabold">
                  {person.name} <span className="text-xs font-semibold text-muted-foreground">@{person.handle}</span>
                </span>
                <Button size="sm" variant="ghost" className="rounded-full font-bold" onClick={() => unblock.mutate(person.id)}>
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Game invite cards ("Mai is starting Pick a Side") show for everyone by default, even while focusing. */
function HideInvitesRow() {
  const [on, setOn] = useHideInvitesWhileFocusing();
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-bold">Hide game invites while I’m focusing</span>
        <span className="block text-xs text-muted-foreground">You can still see what’s on under Activities.</span>
      </span>
      <Switch checked={on} onCheckedChange={setOn} />
    </label>
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
