'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, AtSign, Check, Mail, Sprout } from 'lucide-react';
import type { AvatarLook } from '@study/shared';
import { RoomShot, SplitScreen } from '@/components/app/SplitScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CharacterEditor } from '@/features/avatar/CharacterEditor';
import { ME } from '@/lib/mock';
import { ageLocked, checkHandle, clearAgeLock, clearGuest, handleFrom, loadGuest, lockAge, MIN_AGE } from '@/lib/guest';
import { cn } from '@/lib/utils';

// Read once when the page loads; the age check doesn't need to tick
const LOADED_AT = Date.now();

type Step = 'method' | 'code' | 'age' | 'too-young' | 'character';

/**
 * Sign up / sign in: provider → (email code) → date of birth (13+) → your character and @handle.
 * `?from=guest` is a guest signing up from inside a room: their name and character carry over.
 * Under 13 gets a friendly stop, and this device waits a day before it can try another birthday.
 */
export default function LoginPage() {
  // useSearchParams needs a Suspense boundary so the page can still be prerendered
  return (
    <Suspense>
      <LoginFlow />
    </Suspense>
  );
}

function LoginFlow() {
  const router = useRouter();
  const fromGuest = useSearchParams().get('from') === 'guest';
  const [step, setStep] = useState<Step>('method');
  const [email, setEmail] = useState('');
  const [birth, setBirth] = useState('2004-05-14');
  const [name, setName] = useState(ME.name);
  const [handle, setHandle] = useState(ME.handle);
  // The handle follows the display name until you type in it yourself
  const [handleEdited, setHandleEdited] = useState(false);
  const [look, setLook] = useState<AvatarLook>(ME.look);
  const [keptLook, setKeptLook] = useState(false);

  const age = Math.floor((LOADED_AT - new Date(birth).getTime()) / (365.25 * 24 * 3600 * 1000));
  const tooYoung = Number.isFinite(age) && age < MIN_AGE;
  const check = checkHandle(handle);

  const toCharacter = () => {
    const guest = fromGuest ? loadGuest() : null;
    if (guest) {
      setName(guest.name);
      setHandle(handleFrom(guest.name));
      setLook(guest.look);
      setKeptLook(true);
    }
    setStep('character');
  };

  return (
    <SplitScreen aside={<LoginAside />}>
      <div className="rounded-[2rem] border bg-card p-6 shadow-soft sm:p-8">
        {step === 'method' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-[-0.03em]">Welcome in ✨</h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign in or make an account. It takes a minute.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <Button variant="outline" className="h-12 rounded-2xl text-base font-bold" onClick={() => setStep('age')}>
                <GoogleIcon /> Continue with Google
              </Button>
              <Button
                className="h-12 rounded-2xl bg-[#5865f2] text-base font-bold text-white hover:bg-[#4752c4]"
                onClick={() => setStep('age')}
              >
                <DiscordIcon /> Continue with Discord
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
            </div>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setStep('code');
              }}
            >
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl"
              />
              <Button type="submit" variant="secondary" className="h-12 rounded-2xl text-base font-bold">
                <Mail /> Email me a code
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              No passwords. By continuing you agree to the rules and privacy policy.
            </p>
          </div>
        )}

        {step === 'code' && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              setStep('age');
            }}
          >
            <BackButton onClick={() => setStep('method')} />
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em]">Check your email</h1>
              <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to {email || 'your email'}.</p>
            </div>
            <Input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              defaultValue="482913"
              className="h-14 rounded-2xl text-center font-mono text-2xl tracking-[0.5em]"
              aria-label="Code"
            />
            <Button type="submit" className="h-12 rounded-2xl text-base font-extrabold">
              Continue <ArrowRight />
            </Button>
          </form>
        )}

        {step === 'age' && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (tooYoung) lockAge(LOADED_AT);
              if (tooYoung || ageLocked(LOADED_AT)) setStep('too-young');
              else toCharacter();
            }}
          >
            <BackButton onClick={() => setStep('method')} />
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em]">When’s your birthday? 🎂</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Connecta is for people {MIN_AGE} and older. We don’t show this to anyone.
              </p>
            </div>
            <Input
              type="date"
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              className="h-12 rounded-2xl"
              aria-label="Date of birth"
            />
            <Button type="submit" className="h-12 rounded-2xl text-base font-extrabold">
              Continue <ArrowRight />
            </Button>
          </form>
        )}

        {step === 'too-young' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-mint text-mint-ink">
              <Sprout className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em]">Come back when you’re {MIN_AGE}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Connecta is for people {MIN_AGE} and older. We’ll keep a cosy spot for you until then 🌱
              </p>
            </div>
            <Button asChild variant="outline" className="h-11 rounded-2xl px-6 font-bold">
              <Link href="/">Back to the start</Link>
            </Button>
            {/* Demo only: the lock would otherwise stop you trying the flow again for a day */}
            <button
              type="button"
              onClick={() => {
                clearAgeLock();
                setStep('age');
              }}
              className="text-xs font-bold text-muted-foreground underline underline-offset-2"
            >
              Demo: clear the age lock
            </button>
          </div>
        )}

        {step === 'character' && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!check.ok) return;
              clearGuest();
              router.push('/home');
            }}
          >
            <BackButton onClick={() => setStep('age')} />
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em]">{keptLook ? 'Keep your character?' : 'Make your character'}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {keptLook
                  ? 'It’s the one you walked around with as a guest. Change anything you like.'
                  : 'This is you in every room. You can change it any time.'}
              </p>
            </div>
            <CharacterEditor look={look} onChange={setLook}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-muted-foreground">
                  Display name
                </Label>
                <Input
                  id="name"
                  value={name}
                  maxLength={16}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!handleEdited) setHandle(handleFrom(e.target.value));
                  }}
                  className="rounded-xl"
                />
              </div>
            </CharacterEditor>
            <HandleField
              handle={handle}
              check={check}
              onChange={(h) => {
                setHandle(h);
                setHandleEdited(true);
              }}
            />
            <Button type="submit" disabled={!check.ok} className="h-12 rounded-2xl text-base font-extrabold">
              Let’s go <ArrowRight />
            </Button>
          </form>
        )}
      </div>
    </SplitScreen>
  );
}

/** Wide screens: where you're about to be, so signing in feels like walking somewhere. */
function LoginAside() {
  return (
    <>
      <div>
        <p className="text-sm font-black tracking-wider text-primary uppercase">Connecta</p>
        <h2 className="mt-2 text-5xl leading-[1.02] font-black tracking-[-0.04em] text-balance">
          Your friends are <span className="text-primary">waiting</span> 🛋️
        </h2>
        <p className="mt-3 max-w-md text-lg">A cosy 3D room for your people. Walk over to talk, play a game, or just be there.</p>
      </div>
      <RoomShot
        chips={[
          { text: <>🍅 Mai · focusing 25m</>, className: '-top-4 -left-4 rotate-[-4deg]' },
          { text: <>💬 “come sit with us!”</>, className: '-right-4 bottom-10 rotate-[3deg]' },
        ]}
      />
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold">
        <span>✓ Free</span>
        <span>✓ No download</span>
        <span>✓ No passwords</span>
        <span>✓ 13+</span>
      </p>
    </>
  );
}

/** Your unique @handle: how friends add you and how @mentions find you. Checked as you type. */
function HandleField({
  handle,
  check,
  onChange,
}: {
  handle: string;
  check: ReturnType<typeof checkHandle>;
  onChange: (handle: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="handle" className="text-xs font-bold text-muted-foreground">
        Your @handle <span className="font-semibold">(friends add you with it)</span>
      </Label>
      <label
        className={cn(
          'flex h-11 items-center gap-1.5 rounded-xl border bg-card px-3 focus-within:ring-2',
          check.ok ? 'focus-within:ring-primary/40' : 'border-destructive/50 focus-within:ring-destructive/30',
        )}
      >
        <AtSign className="size-4 flex-none text-muted-foreground" />
        <input
          id="handle"
          value={handle}
          maxLength={20}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
        />
        {check.ok && <Check className="size-4 flex-none text-mint-ink" aria-label="Available" />}
      </label>
      {check.ok ? (
        <p className="text-xs font-semibold text-mint-ink">@{handle} is yours if you want it</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-destructive">{check.reason}</span>
          {check.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="rounded-full bg-secondary px-2 py-0.5 font-bold text-secondary-foreground hover:bg-secondary/70"
            >
              @{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="flex w-fit items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.9S6.8 21.4 12 21.4c6.9 0 9.2-4.8 9.2-7.3 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.7.1 18.2a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.7 19.7 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.8ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"
      />
    </svg>
  );
}
