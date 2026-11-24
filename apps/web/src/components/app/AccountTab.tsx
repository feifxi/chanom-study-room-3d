'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { DELETE_GRACE_DAYS, HANDLE_HOLD_DAYS } from '@connecta/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccountDetails, useMe, useSetMe } from '@/features/account/useMe';
import { useMembers, useMyRooms, type Room } from '@/features/rooms/useRooms';
import { api } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';

const PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'discord', label: 'Discord' },
] as const;

/**
 * Settings → Account: how you sign in, your (private) birthday, and deleting the account.
 * Deleting waits 7 days; signing in meanwhile offers "Keep my account". Your messages stay as
 * "Deleted user" so conversations still read properly.
 * (Picking new owners for your rooms comes with rooms: docs/features/01-accounts.md.)
 */
export function AccountTab() {
  const { data: me } = useMe();
  const details = useAccountDetails();
  const [deleting, setDeleting] = useState(false);
  if (!me?.signedUp) return <p className="text-sm text-muted-foreground">Sign up to have an account.</p>;
  if (!details.data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { email, birthday, linked, available } = details.data;

  const connect = async (provider: 'google' | 'discord') => {
    const { error } = await authClient.linkSocial({ provider, callbackURL: '/home' });
    if (error) toast.error("Couldn't connect it. Try again?");
  };
  const disconnect = async (accountId: string, label: string) => {
    const { error } = await authClient.unlinkAccount({ accountId });
    // Better Auth wants a recent sign-in (within a day) before removing a way in
    if (error) return toast.error(error.status === 403 ? 'Sign in again first, then disconnect it.' : "Couldn't disconnect it. Try again?");
    void details.refetch();
    toast.success(`${label} disconnected. You can still sign in with an email code.`);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-black">How you sign in</h3>
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
          <Mail className="size-4 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-semibold">Email code · {email}</span>
          <span className="text-xs font-bold text-mint-ink">Always on</span>
        </div>
        {PROVIDERS.map(({ id, label }) => {
          const accountId = linked[id];
          return (
            <div key={id} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span className={accountId ? 'flex-1 font-semibold' : 'flex-1 font-semibold text-muted-foreground'}>{label}</span>
              {accountId ? (
                <Button size="sm" variant="ghost" className="rounded-full font-bold" onClick={() => void disconnect(accountId, label)}>
                  Disconnect
                </Button>
              ) : available[id] ? (
                <Button size="sm" variant="outline" className="rounded-full font-bold" onClick={() => void connect(id)}>
                  Connect
                </Button>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">Not set up here yet</span>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-black">Birthday</h3>
        <p className="text-sm text-muted-foreground">
          {birthday
            ? new Date(`${birthday}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
            : '—'}{' '}
          · only you can see this
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-destructive/30 p-4">
        <h3 className="text-sm font-black text-destructive">Delete account</h3>
        {deleting ? (
          <ConfirmDelete handle={me.handle!} onCancel={() => setDeleting(false)} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              You get {DELETE_GRACE_DAYS} days to change your mind: sign in before then and you can keep it.
            </p>
            <Button variant="outline" className="w-fit rounded-full font-bold text-destructive" onClick={() => setDeleting(true)}>
              Delete my account…
            </Button>
          </>
        )}
      </section>
    </div>
  );
}

function ConfirmDelete({ handle, onCancel }: { handle: string; onCancel: () => void }) {
  const router = useRouter();
  const setMe = useSetMe();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = typed.trim().replace(/^@/, '') === handle;
  // Rooms you own pass to someone; rooms with only you go with the account
  const rooms = useMyRooms();
  const owned = (rooms.data ?? []).filter((r) => r.me.role === 'owner');
  const shared = owned.filter((r) => r.memberCount > 1);
  const solo = owned.filter((r) => r.memberCount <= 1);
  const [heirs, setHeirs] = useState<Record<string, string>>({});

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready) return;
        setBusy(true);
        const { data } = await api.POST('/api/me/deletion', { body: { handle: typed, heirs } });
        setBusy(false);
        if (!data) return toast.error("Couldn't do that just now. Try again?");
        setMe(data);
        // The sign-in page shows the date and "Keep my account"
        router.push('/login');
      }}
    >
      {shared.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">Pick a new owner for your rooms</p>
          {shared.map((r) => (
            <HeirPicker key={r.id} room={r} value={heirs[r.id]} onChange={(userId) => setHeirs((h) => ({ ...h, [r.id]: userId }))} />
          ))}
          <p className="text-xs text-muted-foreground">They take over when your account goes, not before: keep it and nothing changes.</p>
        </div>
      )}
      <ul className="list-disc pl-5 text-sm text-muted-foreground">
        {solo.length > 0 && <li>Rooms with only you in them are deleted: {solo.map((r) => r.name).join(', ')}.</li>}
        <li>Every other device is signed out now.</li>
        <li>Your messages stay, shown as “Deleted user”, so conversations still make sense.</li>
        <li>Connecta Plus is cancelled now.</li>
        <li>
          Your character, friends, birthday and focus stats are removed. @{handle} is freed {HANDLE_HOLD_DAYS} days later.
        </li>
      </ul>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-handle" className="text-xs font-bold text-muted-foreground">
          Type @{handle} to confirm
        </Label>
        <Input id="confirm-handle" value={typed} onChange={(e) => setTyped(e.target.value)} className="rounded-xl" autoComplete="off" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={!ready || busy} className="rounded-full font-bold">
          Delete in {DELETE_GRACE_DAYS} days
        </Button>
        <Button type="button" variant="ghost" className="rounded-full font-bold" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Who takes a room over: mods first (they know the room), then members by how long they've been in. */
function HeirPicker({ room, value, onChange }: { room: Room; value?: string; onChange: (userId: string) => void }) {
  const members = useMembers(room.id);
  const candidates = (members.data ?? []).filter((m) => m.role !== 'owner');
  // Without a pick the API hands it to the same person shown first here
  const shown = value ?? candidates[0]?.person.id;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {room.emoji} {room.name}
      </span>
      <Select value={shown} onValueChange={onChange} disabled={!candidates.length}>
        <SelectTrigger className="w-40 rounded-xl bg-card">
          <SelectValue placeholder="Loading…" />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((m) => (
            <SelectItem key={m.person.id} value={m.person.id}>
              {m.person.name}
              {m.role === 'mod' ? ' · mod' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
