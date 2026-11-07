'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import type { AvatarLook } from '@study/shared';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CharacterEditor } from '@/features/avatar/CharacterEditor';
import { ME } from '@/lib/mock';

// Read once when the page loads; the age check doesn't need to tick
const LOADED_AT = Date.now();

type Step = 'method' | 'code' | 'age' | 'character';

/** Sign up / sign in: provider → (email code) → date of birth (16+) → make your character. */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('method');
  const [email, setEmail] = useState('');
  const [birth, setBirth] = useState('2004-05-14');
  const [name, setName] = useState(ME.name);
  const [look, setLook] = useState<AvatarLook>(ME.look);

  const age = Math.floor((LOADED_AT - new Date(birth).getTime()) / (365.25 * 24 * 3600 * 1000));
  const tooYoung = Number.isFinite(age) && age < 16;

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo />
        </Link>
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
                if (!tooYoung) setStep('character');
              }}
            >
              <BackButton onClick={() => setStep('method')} />
              <div>
                <h1 className="text-2xl font-black tracking-[-0.03em]">When’s your birthday? 🎂</h1>
                <p className="mt-1 text-sm text-muted-foreground">Connecta is for people 16 and older. We don’t show this to anyone.</p>
              </div>
              <Input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className="h-12 rounded-2xl"
                aria-label="Date of birth"
              />
              {tooYoung && (
                <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                  Sorry, you need to be 16 or older to use Connecta.
                </p>
              )}
              <Button type="submit" disabled={tooYoung} className="h-12 rounded-2xl text-base font-extrabold">
                Continue <ArrowRight />
              </Button>
            </form>
          )}

          {step === 'character' && (
            <div className="flex flex-col gap-5">
              <BackButton onClick={() => setStep('age')} />
              <div>
                <h1 className="text-2xl font-black tracking-[-0.03em]">Make your character</h1>
                <p className="mt-1 text-sm text-muted-foreground">This is you in every room. You can change it any time.</p>
              </div>
              <CharacterEditor look={look} onChange={setLook}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-muted-foreground">
                    Display name
                  </Label>
                  <Input id="name" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                </div>
              </CharacterEditor>
              <Button className="h-12 rounded-2xl text-base font-extrabold" onClick={() => router.push('/home')}>
                Let’s go <ArrowRight />
              </Button>
            </div>
          )}
        </div>
      </div>
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
