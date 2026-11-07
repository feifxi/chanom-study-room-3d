'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Lock, Ticket, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { MAPS } from '@/lib/mock';

const KINDS = [
  { id: 'friends', emoji: '🍓', title: 'For my friends', text: 'A private hangout. One room and a chat to start.' },
  { id: 'study', emoji: '📚', title: 'Study group', text: 'A quiet Library room plus a #study-notes chat.' },
  { id: 'community', emoji: '🎪', title: 'Community', text: 'Rules, a public listing, more rooms for events.' },
];

const VISIBILITY = [
  { id: 'private', icon: Lock, title: 'Private', text: 'Only people with an invite can join. Hidden from Discover.' },
  { id: 'request', icon: UserCheck, title: 'Request to join', text: 'Listed in Discover. You approve who gets in.' },
  { id: 'public', icon: Globe, title: 'Public', text: 'Listed in Discover. Anyone can join.' },
];

const EMOJIS = ['🍓', '🍵', '🧋', '🐱', '🌙', '📚', '🎴', '🌸'];

/** Create a server in three short steps, or join one with an invite code. */
export function CreateServerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState('friends');
  const [emoji, setEmoji] = useState('🍓');
  const [name, setName] = useState("feifei's server");
  const [map, setMap] = useState('library');
  const [visibility, setVisibility] = useState('private');

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(() => setStep(0), 200);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-lg">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex w-fit items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        )}
        {step === 0 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Make a server</DialogTitle>
              <DialogDescription>Your own place with chats and cosy rooms. You can change everything later.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => {
                    setKind(k.id);
                    setEmoji(k.emoji);
                    setVisibility(k.id === 'community' ? 'request' : 'private');
                    setStep(1);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border p-3 text-left hover:border-primary hover:bg-secondary/50',
                    kind === k.id && 'border-primary',
                  )}
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-muted text-2xl">{k.emoji}</span>
                  <span>
                    <span className="block font-extrabold">{k.title}</span>
                    <span className="block text-sm text-muted-foreground">{k.text}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-muted p-3">
              <Ticket className="size-5 text-muted-foreground" />
              <Input placeholder="Have an invite? Paste the link or code" className="h-9 rounded-xl bg-card" />
              <Button
                className="rounded-xl font-bold"
                onClick={() => {
                  close(false);
                  router.push('/invite/cafe-chanom');
                }}
              >
                Join
              </Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Name and icon</DialogTitle>
              <DialogDescription>Pick something your friends will recognise.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn('grid size-12 place-items-center rounded-2xl bg-muted text-2xl', emoji === e && 'ring-[3px] ring-primary')}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sname">Server name</Label>
              <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <p className="text-sm font-extrabold">First room</p>
            <div className="grid grid-cols-3 gap-2">
              {MAPS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMap(m.id)}
                  className={cn('rounded-2xl border-2 p-2 text-left', map === m.id ? 'border-primary' : 'border-transparent bg-muted/50')}
                >
                  <span className={cn('grid h-14 place-items-center rounded-xl text-2xl', m.tint)}>{m.emoji}</span>
                  <span className="mt-1 block text-xs font-bold">{m.name}</span>
                </button>
              ))}
            </div>
            <Button className="h-11 rounded-2xl font-extrabold" onClick={() => setStep(2)}>
              Next
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Who can join?</DialogTitle>
              <DialogDescription>Private is the default. Public servers need rules and a mod.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {VISIBILITY.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVisibility(v.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border-2 p-3 text-left',
                    visibility === v.id ? 'border-primary bg-secondary/50' : 'border-border',
                  )}
                >
                  <v.icon className="size-5 flex-none text-primary" />
                  <span>
                    <span className="block font-extrabold">{v.title}</span>
                    <span className="block text-sm text-muted-foreground">{v.text}</span>
                  </span>
                </button>
              ))}
            </div>
            <Button
              className="h-11 rounded-2xl font-extrabold"
              onClick={() => {
                close(false);
                toast.success(`${emoji} ${name} is ready! Share the invite link with your friends.`);
                router.push('/servers/chanom');
              }}
            >
              Create server
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
