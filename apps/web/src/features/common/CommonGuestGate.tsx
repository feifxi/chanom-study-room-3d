'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DoorOpen } from 'lucide-react';
import { DISPLAY_NAME_MAX, type AvatarLook, type CommonType } from '@connecta/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CharacterEditor } from '@/features/avatar/CharacterEditor';
import { fetchMe } from '@/features/account/useMe';
import { RoomShot, SplitScreen } from '@/components/app/SplitScreen';
import { api } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';
import { GUEST_LOOK, saveGuest } from '@/lib/guest';

/**
 * A Common room for someone without a session (feature 14): pick a name and a character and walk in
 * as a guest. Text only for everyone there, so a guest misses nothing but a saved account.
 */
export function CommonGuestGate({ type }: { type: CommonType }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [look, setLook] = useState<AvatarLook>(GUEST_LOOK);
  const [busy, setBusy] = useState(false);

  const walkIn = async () => {
    const guestName = name.trim() || 'Guest';
    setBusy(true);
    try {
      if (!(await fetchMe())) {
        const { error } = await authClient.signIn.anonymous();
        if (error) throw error;
      }
      const { data } = await api.PUT('/api/me/guest', { body: { name: guestName, look } });
      if (!data) throw new Error('guest profile');
      saveGuest({ name: guestName, look });
      router.refresh();
    } catch {
      setBusy(false);
      toast.error('Couldn’t let you in. Try again?');
    }
  };

  return (
    <SplitScreen
      aside={
        <>
          <div>
            <p className="text-sm font-black tracking-wider text-primary uppercase">Common room · run by Connecta</p>
            <h2 className="mt-2 text-5xl leading-[1.02] font-black tracking-[-0.04em] text-balance">{type.name}</h2>
            <p className="mt-3 max-w-md text-lg">{type.vibe}. Anyone’s welcome. Text only, so it’s comfy with strangers.</p>
          </div>
          <RoomShot chips={[]} />
        </>
      }
    >
      {/* On a phone the side panel is hidden: say where you're going */}
      <div className="mb-4 w-full max-w-md lg:hidden">
        <p className="text-xs font-black tracking-wider text-primary uppercase">Common room · run by Connecta</p>
        <h1 className="text-3xl font-black tracking-[-0.03em]">{type.name}</h1>
        <p className="text-sm text-muted-foreground">{type.vibe} · text only, so it’s comfy with strangers</p>
      </div>
      <form
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-muted/60 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void walkIn();
        }}
      >
        <p className="font-extrabold">Pick how you look</p>
        <CharacterEditor look={look} onChange={setLook} previewClassName="h-44 w-32">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guest-name" className="text-xs font-bold text-muted-foreground">
              Your name
            </Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Guest"
              maxLength={DISPLAY_NAME_MAX}
              className="rounded-xl bg-card"
            />
          </div>
        </CharacterEditor>
        <Button type="submit" disabled={busy} className="h-11 rounded-2xl font-extrabold">
          <DoorOpen /> Walk in as a guest
        </Button>
      </form>
    </SplitScreen>
  );
}
