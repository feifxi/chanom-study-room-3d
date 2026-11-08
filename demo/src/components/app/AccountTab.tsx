'use client';

import { useState } from 'react';
import { Mail, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ME, SERVERS, userById } from '@/lib/mock';

/** Days between "Delete account" and the account really going: sign in before then to keep it. */
export const DELETE_GRACE_DAYS = 7;

/**
 * Settings → Account: how you sign in, your (private) birthday, and deleting the account.
 * Deleting waits 7 days (signing in cancels it). Rooms you own that have other members need a new
 * owner first (mods are suggested first); rooms with only you go with the account. Your messages
 * stay as "Deleted user" so conversations still read properly.
 */
export function AccountTab() {
  const [deleting, setDeleting] = useState<'no' | 'confirm' | 'pending'>('no');
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-black">How you sign in</h3>
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
          <Mail className="size-4 text-muted-foreground" />
          <span className="flex-1 font-semibold">Google · feifei@gmail.com</span>
          <span className="text-xs font-bold text-mint-ink">Connected</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
          <Mail className="size-4 text-muted-foreground" />
          <span className="flex-1 font-semibold text-muted-foreground">Discord</span>
          <Button size="sm" variant="outline" className="rounded-full font-bold" onClick={() => toast('Discord connected')}>
            Connect
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-black">Birthday</h3>
        <p className="text-sm text-muted-foreground">14 May 2004 · only you can see this</p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-destructive/30 p-4">
        <h3 className="text-sm font-black text-destructive">Delete account</h3>
        {deleting === 'no' && (
          <>
            <p className="text-sm text-muted-foreground">
              You get {DELETE_GRACE_DAYS} days to change your mind: sign in before then and it’s cancelled.
            </p>
            <Button variant="outline" className="w-fit rounded-full font-bold text-destructive" onClick={() => setDeleting('confirm')}>
              Delete my account…
            </Button>
          </>
        )}
        {deleting === 'confirm' && <ConfirmDelete onCancel={() => setDeleting('no')} onDone={() => setDeleting('pending')} />}
        {deleting === 'pending' && (
          <>
            <p className="flex items-start gap-2 text-sm font-semibold">
              <TriangleAlert className="mt-0.5 size-4 flex-none text-destructive" />
              Your account will be deleted in {DELETE_GRACE_DAYS} days. Until then, signing in shows a “Keep my account” button.
            </p>
            <Button
              className="w-fit rounded-full font-bold"
              onClick={() => {
                setDeleting('no');
                toast.success('Welcome back! Your account is staying.');
              }}
            >
              Keep my account
            </Button>
          </>
        )}
      </section>
    </div>
  );
}

function ConfirmDelete({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const owned = SERVERS.filter((s) => s.roles.me === 'Owner');
  const shared = owned.filter((s) => s.members.length > 1);
  const solo = owned.filter((s) => s.members.length <= 1);
  // Mods are the natural next owners, so they're offered first
  const candidates = (s: (typeof owned)[number]) =>
    s.members.filter((id) => id !== 'me').sort((a, b) => Number(s.roles[b] === 'Mod') - Number(s.roles[a] === 'Mod'));
  const [owners, setOwners] = useState<Record<string, string>>(() => Object.fromEntries(shared.map((s) => [s.id, candidates(s)[0]!])));
  const [typed, setTyped] = useState('');
  const ready = typed.trim().replace(/^@/, '') === ME.handle;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onDone();
      }}
    >
      {shared.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">Pick a new owner for your rooms</p>
          {shared.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {s.emoji} {s.name}
              </span>
              <Select value={owners[s.id]} onValueChange={(v) => setOwners((o) => ({ ...o, [s.id]: v }))}>
                <SelectTrigger className="w-40 rounded-xl bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {candidates(s).map((id) => (
                    <SelectItem key={id} value={id}>
                      {userById(id).name}
                      {s.roles[id] === 'Mod' ? ' · mod' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
      <ul className="list-disc pl-5 text-sm text-muted-foreground">
        {solo.length > 0 && <li>Rooms with only you in them are deleted: {solo.map((s) => s.name).join(', ')}.</li>}
        <li>Your messages stay, shown as “Deleted user”, so conversations still make sense.</li>
        <li>Connecta Plus is cancelled now.</li>
        <li>Your character, friends, birthday and focus stats are removed. @{ME.handle} is freed 30 days later.</li>
      </ul>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-handle" className="text-xs font-bold text-muted-foreground">
          Type @{ME.handle} to confirm
        </Label>
        <Input id="confirm-handle" value={typed} onChange={(e) => setTyped(e.target.value)} className="rounded-xl" autoComplete="off" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={!ready} className="rounded-full font-bold">
          Delete in {DELETE_GRACE_DAYS} days
        </Button>
        <Button type="button" variant="ghost" className="rounded-full font-bold" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
