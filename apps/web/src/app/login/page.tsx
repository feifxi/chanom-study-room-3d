'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Mail, Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_LOOK, DISPLAY_NAME_MAX, handleFrom, MIN_AGE, type AvatarLook } from '@connecta/shared';
import { RoomShot, SplitScreen } from '@/components/app/SplitScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CharacterEditor } from '@/features/avatar/CharacterEditor';
import { HandleField, useHandleCheck } from '@/features/account/HandleField';
import { fetchMe, useSetMe } from '@/features/account/useMe';
import { problem } from '@/features/rooms/useRooms';
import { api, type HandleCheck, type Me } from '@/lib/api/client';
import { authClient } from '@/lib/auth-client';
import { clearGuest } from '@/lib/guest';

type Step = 'loading' | 'method' | 'code' | 'age' | 'too-young' | 'character' | 'deleting';

/** Where someone who's signed in picks up: the first sign-up step they haven't done. */
function stepFor(me: Me | null): Step | 'home' {
  if (!me || me.isGuest) return 'method';
  if (me.deleteAt) return 'deleting';
  if (!me.ageChecked) return 'age';
  if (!me.signedUp) return 'character';
  return 'home';
}

/**
 * Sign up / sign in: provider → (email code) → birthday (13+) → your character and @handle.
 * The server keeps where you are, so leaving halfway (or coming back from Google or Discord) picks up
 * at the next step. A guest signing up from inside a room keeps their name and character.
 * Under 13 gets a friendly stop; that sign-in and this browser wait a day before trying again.
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
  const setMe = useSetMe();
  const search = useSearchParams();
  // Where to go once signed in (an invite link sends people here and back); only paths on this site
  const nextPath = search.get('next');
  const after = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/home';
  const [step, setStep] = useState<Step>('loading');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [birth, setBirth] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  // The handle follows the display name until you type in it yourself
  const [handleEdited, setHandleEdited] = useState(false);
  const [look, setLook] = useState<AvatarLook>(DEFAULT_LOOK);
  const [keptLook, setKeptLook] = useState(false);
  const [taken, setTaken] = useState<HandleCheck | null>(null);
  const [deleteAt, setDeleteAt] = useState<string | null>(null);

  /** Moves to wherever this person is up to (or Home), filling the character step from their account. */
  const continueAs = (me: Me | null) => {
    setMe(me);
    const next = stepFor(me);
    if (next === 'home') {
      clearGuest();
      router.replace(after);
      return;
    }
    if (next === 'deleting' && me) setDeleteAt(me.deleteAt);
    if (next === 'character' && me) {
      setName(me.name.slice(0, DISPLAY_NAME_MAX));
      setHandle(handleFrom(me.name));
      if (me.look) {
        setLook(me.look);
        // A look before sign-up is finished can only have come from being a guest
        setKeptLook(true);
      }
    }
    setStep(next);
  };

  // Signed in already, or back from Google/Discord: pick up where this account is
  useEffect(() => {
    fetchMe()
      .then(continueAs)
      .catch(() => setStep('method'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  const social = async (provider: 'google' | 'discord') => {
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider,
      // Back here after the provider (keeping where to go next); the effect above picks up at the right step
      callbackURL: `/login?${search.toString()}`,
      errorCallbackURL: '/login',
    });
    if (error) {
      setBusy(false);
      toast.error(
        error.status === 404
          ? `${provider === 'google' ? 'Google' : 'Discord'} sign-in isn't set up here yet. Try email.`
          : "Couldn't start signing in. Try again?",
      );
    }
  };

  const sendCode = async () => {
    setBusy(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    setBusy(false);
    if (error) {
      toast.error(
        error.status === 429 ? 'Too many codes for now. Wait a minute and try again.' : "Couldn't send the code. Check the address?",
      );
      return;
    }
    setCode('');
    setCodeError(null);
    setStep('code');
  };

  const checkCode = async () => {
    setBusy(true);
    const { error } = await authClient.signIn.emailOtp({ email, otp: code });
    if (error) {
      setBusy(false);
      setCodeError(error.status === 429 ? 'Too many tries. Wait a minute.' : "That code doesn't match. Check the newest email?");
      return;
    }
    continueAs(await fetchMe());
    setBusy(false);
  };

  const sendBirthday = async () => {
    setBusy(true);
    const { data, response } = await api.POST('/api/me/birthday', { body: { birthday: birth } });
    setBusy(false);
    if (response.status === 403) return setStep('too-young');
    if (!data) return toast.error("Couldn't save that. Try again?");
    continueAs(data);
  };

  const finish = async () => {
    setBusy(true);
    const { data, error, response } = await api.POST('/api/me/sign-up', { body: { name: name.trim(), handle, look } });
    setBusy(false);
    if (response.status === 409 && error) return setTaken(error as HandleCheck);
    // A name with a blocked word says so (feature 14)
    if (!data)
      return toast.error(
        response.status === 400 ? problem(error, "Couldn't finish signing up. Try again?") : "Couldn't finish signing up. Try again?",
      );
    continueAs(data);
  };

  const keep = async () => {
    setBusy(true);
    const { data } = await api.DELETE('/api/me/deletion');
    setBusy(false);
    if (!data) return toast.error("Couldn't keep it just now. Try again?");
    toast.success('Welcome back! Your account is staying 💛');
    continueAs(data);
  };

  const backToStart = async () => {
    await authClient.signOut();
    setMe(null);
    setStep('method');
  };

  return (
    <SplitScreen aside={<LoginAside />}>
      <div className="rounded-[2rem] border bg-card p-6 shadow-soft sm:p-8">
        {step === 'loading' && (
          <div className="grid h-64 place-items-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
          </div>
        )}

        {step === 'method' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-[-0.03em]">Welcome in ✨</h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign in or make an account. It takes a minute.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <Button variant="outline" className="h-12 rounded-2xl text-base font-bold" disabled={busy} onClick={() => social('google')}>
                <GoogleIcon /> Continue with Google
              </Button>
              <Button
                className="h-12 rounded-2xl bg-[#5865f2] text-base font-bold text-white hover:bg-[#4752c4]"
                disabled={busy}
                onClick={() => social('discord')}
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
                void sendCode();
              }}
            >
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl"
              />
              <Button type="submit" variant="secondary" disabled={busy} className="h-12 rounded-2xl text-base font-bold">
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
              void checkCode();
            }}
          >
            <BackButton onClick={() => setStep('method')} />
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em]">Check your email</h1>
              <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to {email}.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  setCodeError(null);
                }}
                className="h-14 rounded-2xl text-center font-mono text-2xl tracking-[0.5em]"
                aria-label="Code"
                aria-invalid={codeError !== null}
              />
              {codeError && <p className="text-center text-xs font-semibold text-destructive">{codeError}</p>}
            </div>
            <Button type="submit" disabled={busy || code.length !== 6} className="h-12 rounded-2xl text-base font-extrabold">
              Continue <ArrowRight />
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendCode()}
              className="text-xs font-bold text-muted-foreground underline underline-offset-2"
            >
              Send a new code
            </button>
          </form>
        )}

        {step === 'age' && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void sendBirthday();
            }}
          >
            <BackButton onClick={() => void backToStart()} />
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em]">When’s your birthday? 🎂</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Connecta is for people {MIN_AGE} and older. We don’t show this to anyone.
              </p>
            </div>
            <Input
              type="date"
              required
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              className="h-12 rounded-2xl"
              aria-label="Date of birth"
            />
            <Button type="submit" disabled={busy || !birth} className="h-12 rounded-2xl text-base font-extrabold">
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
            <Button
              variant="outline"
              className="h-11 rounded-2xl px-6 font-bold"
              onClick={async () => {
                await authClient.signOut();
                setMe(null);
                router.push('/');
              }}
            >
              Back to the start
            </Button>
          </div>
        )}

        {step === 'deleting' && deleteAt && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-peach text-3xl">🫶</div>
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em]">Keep your account?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You asked to delete it. It goes on{' '}
                <span className="font-bold text-foreground">
                  {new Date(deleteAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                </span>{' '}
                unless you keep it. Your friends, rooms and character are all still here.
              </p>
            </div>
            <Button disabled={busy} className="h-12 w-full rounded-2xl text-base font-extrabold" onClick={() => void keep()}>
              Keep my account
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              className="rounded-2xl font-bold text-muted-foreground"
              onClick={async () => {
                await authClient.signOut();
                setMe(null);
                router.push('/');
              }}
            >
              No, sign me out
            </Button>
          </div>
        )}

        {step === 'character' && (
          <CharacterStep
            busy={busy}
            keptLook={keptLook}
            look={look}
            onLook={setLook}
            name={name}
            onName={(n) => {
              setName(n);
              if (!handleEdited) setHandle(handleFrom(n));
            }}
            handle={handle}
            onHandle={(h) => {
              setHandle(h);
              setHandleEdited(true);
              setTaken(null);
            }}
            taken={taken?.handle === handle ? taken : null}
            onBack={() => void backToStart()}
            onSubmit={() => void finish()}
          />
        )}
      </div>
    </SplitScreen>
  );
}

/** The last step: your character, display name and @handle (checked with the server as you type). */
function CharacterStep(props: {
  busy: boolean;
  keptLook: boolean;
  look: AvatarLook;
  onLook: (look: AvatarLook) => void;
  name: string;
  onName: (name: string) => void;
  handle: string;
  onHandle: (handle: string) => void;
  /** The server said no on submit (someone took it meanwhile) */
  taken: HandleCheck | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { handle } = props;
  const check = useHandleCheck(handle, props.taken);
  const canSubmit = check.ok === true && props.name.trim().length > 0 && !props.busy;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) props.onSubmit();
      }}
    >
      <BackButton onClick={props.onBack} />
      <div>
        <h1 className="text-2xl font-black tracking-[-0.03em]">{props.keptLook ? 'Keep your character?' : 'Make your character'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {props.keptLook
            ? 'It’s the one you walked around with as a guest. Change anything you like.'
            : 'This is you in every room. You can change it any time.'}
        </p>
      </div>
      <CharacterEditor look={props.look} onChange={props.onLook}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-xs font-bold text-muted-foreground">
            Display name
          </Label>
          <Input
            id="name"
            value={props.name}
            maxLength={DISPLAY_NAME_MAX}
            onChange={(e) => props.onName(e.target.value)}
            className="rounded-xl"
          />
        </div>
      </CharacterEditor>
      <HandleField handle={handle} check={check} onChange={props.onHandle} />
      <Button type="submit" disabled={!canSubmit} className="h-12 rounded-2xl text-base font-extrabold">
        Let’s go <ArrowRight />
      </Button>
    </form>
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
