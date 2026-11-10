import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Crown, Flag, Link2, Lock, MessageCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACTIVITIES = [
  ['📺', 'Watch together', 'bg-sky'],
  ['🃏', 'Card games', 'bg-mint'],
  ['🐺', 'Werewolf', 'bg-lavender'],
  ['🗳️', 'Pick a Side', 'bg-peach'],
  ['✏️', 'Draw & Guess', 'bg-secondary'],
  ['🎨', 'Whiteboard', 'bg-sky'],
  ['🐱', 'Pet the cats', 'bg-peach'],
  ['🤖', 'Study buddies', 'bg-mint'],
] as const;

const FAQ: [string, string][] = [
  [
    'Is it free?',
    'Yes. Rooms, voice, chat and every activity are free, for up to 25 people at once. Plus (฿89 a month) makes your rooms bigger and dresses you up.',
  ],
  ['Do I need to download anything?', 'No. Connecta runs in your browser, on a laptop or a phone. Friends join from a link.'],
  [
    'Can my friends join without an account?',
    'Yes, as guests, in rooms whose owner allows it, and in Common rooms. They pick a name and a look and walk in.',
  ],
  [
    'Who can talk to me?',
    'Only your friends can message you. Rooms are private unless the owner opens them, and you can report or block anyone.',
  ],
  ['How old do I need to be?', '13 or older.'],
];

/**
 * Public landing page: what Connecta is, then into the app. Built like the product pages people know
 * (Gather, Discord, Duolingo): one clear promise with the real room in the hero, then each idea shown
 * with its own little picture instead of a grid of icons, then Common rooms, safety, Plus, a short
 * FAQ and one last call to make a room.
 */
export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <div className="hidden items-center gap-5 text-sm font-bold text-muted-foreground md:flex">
            <a href="#together" className="hover:text-foreground">
              Features
            </a>
            <Link href="/discover" className="hover:text-foreground">
              Discover
            </Link>
            <a href="#plus" className="hover:text-foreground">
              Plus
            </a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" asChild className="rounded-full font-bold">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full px-4 font-extrabold">
              <Link href="/login">Open Connecta</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:pt-16">
          <div className="flex flex-col items-start gap-6">
            <span className="flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-extrabold shadow-sm">
              <span className="size-2 animate-pulse rounded-full bg-online" /> 1,284 people hanging out right now
            </span>
            <h1 className="text-5xl leading-[1.02] font-black tracking-[-0.04em] text-balance sm:text-6xl">
              Hang out somewhere <span className="text-primary">cosy</span>.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Connecta is a little 3D place for your friends. Make a room, share a link, and walk over to whoever you want to talk to.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base font-extrabold">
                <Link href="/login">
                  Make your room <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-card px-6 text-base font-bold">
                <Link href="/invite/cafe-chanom">Try a room as a guest</Link>
              </Button>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link2 className="size-4" /> Free · no download · friends join from a link
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-secondary via-peach to-lavender opacity-70 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border-4 border-card shadow-soft">
              <Image
                src="/screenshot.png"
                alt="Friends in the cosy library room: chibi avatars on the sofa and at a desk, a cat, chat and a Pomodoro timer"
                width={1872}
                height={1330}
                priority
                className="h-auto w-full"
              />
            </div>
            <Float className="-top-4 -left-3 rotate-[-4deg]">
              <span className="text-lg">🍅</span> Mai · focusing 25m
            </Float>
            <Float className="-right-3 bottom-10 rotate-[3deg]">
              <MessageCircle className="size-4 text-primary" /> “come sit with us!”
            </Float>
            <div className="absolute -bottom-4 left-8 hidden items-center gap-2 rounded-full bg-cocoa px-3 py-1.5 text-xs font-bold text-white shadow-soft sm:flex">
              <span className="size-2 rounded-full bg-online" /> 6 in the Library
            </div>
          </div>
        </section>

        {/* The idea */}
        <section className="bg-cocoa text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1fr_1.4fr] md:items-center">
            <h2 className="text-3xl font-black tracking-[-0.03em] text-balance sm:text-4xl">
              Chat apps are where you talk.{' '}
              {/* Secondary turns deep in dark mode, so the band (dark in both themes) uses the brighter brand pink there */}
              <span className="text-secondary dark:text-primary">Connecta is where you hang out.</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['🚶', 'Walk over', 'Voice gets louder as you get closer. Wander off to start a side chat.'],
                ['🛋️', 'Just be there', 'Sit on the sofa with your mic off. Your friends still see you.'],
                ['🎴', 'Do something', 'Cards, videos, drawing, quizzes. In the room, together.'],
              ].map(([emoji, title, text]) => (
                <div key={title} className="rounded-3xl bg-white/8 p-5">
                  <div className="text-3xl">{emoji}</div>
                  <p className="mt-2 font-extrabold">{title}</p>
                  <p className="mt-1 text-sm text-white/70">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Showcase: one idea per row, each with its own picture */}
        <div id="together" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-24 px-4 py-24 sm:px-6">
          <Showcase
            eyebrow="Walk up to talk"
            title="Conversations happen like they do in real life"
            text="Walk up to someone and their voice fades in. Three friends by the window, two at the desk: little groups, one room, nobody talking over each other."
            tint="from-lavender to-sky"
          >
            <ProximityPicture />
          </Showcase>

          <Showcase
            eyebrow="Things to do together"
            title="Never just staring at each other"
            text="Every room has a big screen, a card table, an art corner and more. Walk up, press E, and you’re playing. Call everyone in with one button."
            tint="from-mint to-sky"
            flip
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {ACTIVITIES.map(([emoji, name, tint]) => (
                <div key={name} className={cn('flex flex-col items-center gap-1 rounded-2xl p-3 text-center shadow-sm', tint)}>
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-xs font-black">{name}</span>
                </div>
              ))}
            </div>
          </Showcase>

          <Showcase
            eyebrow="Study, if you want"
            title="A study room that doesn’t feel lonely"
            text="A Pomodoro over your head, a to-do list, lo-fi music, and a weekly ranking with your friends. Quiet rooms keep the games away."
            tint="from-peach to-secondary"
          >
            <StudyPicture />
          </Showcase>

          <Showcase
            eyebrow="Your room, your people"
            title="A room that’s there when you’re not"
            text="Make a room for your friends or your class. Its chat keeps going when nobody is inside, even from your phone. Dress up your chibi and pick a cosy map."
            tint="from-secondary to-lavender"
            flip
          >
            <RoomPicture />
          </Showcase>
        </div>

        {/* Common rooms */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="rounded-[2.5rem] bg-card p-6 shadow-soft sm:p-10">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black tracking-wider text-primary uppercase">No friends online yet?</p>
                <h2 className="text-3xl font-black tracking-[-0.03em]">Walk into a Common room</h2>
                <p className="mt-1 max-w-xl text-muted-foreground">
                  Rooms run by Connecta that anyone can walk into. Text only, so they’re comfy with strangers.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full font-extrabold">
                <Link href="/discover">
                  See them all <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['📚', 'Library', 'Quiet study', '142 here', 'bg-lavender'],
                ['🐈', 'Cat Café', 'Chill and chat', '57 here', 'bg-peach'],
                ['🌙', 'Starry Rooftop', 'Late-night talks', '3 here', 'bg-sky'],
              ].map(([emoji, name, vibe, here, tint]) => (
                <Link key={name} href="/discover" className={cn('group flex items-center gap-3 rounded-3xl p-4 hover:shadow-md', tint)}>
                  <span className="grid size-14 flex-none place-items-center rounded-2xl bg-card/70 text-3xl">{emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black">{name}</span>
                    <span className="block text-sm opacity-80">{vibe}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-bold">
                      <span className="size-2 rounded-full bg-online" /> {here}
                    </span>
                  </span>
                  <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Safety */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <h2 className="text-center text-3xl font-black tracking-[-0.03em]">Cosy means safe</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Lock, 'Private by default', 'Your room is invite-only until you open it.'],
              [UserCheck, 'Friends-only messages', 'Strangers can’t DM you. Ever.'],
              [Flag, 'Report anything', 'People, messages, pictures, rooms. A real team reads them.'],
              [ShieldCheck, '13+ and moderated', 'Rude-word filter, picture checks, and mods in every room.'],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Lock;
              return (
                <div key={title as string} className="rounded-3xl border bg-card p-5">
                  <I className="size-6 text-primary" />
                  <p className="mt-3 font-extrabold">{title as string}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plus */}
        <section id="plus" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6">
          <div className="grid items-center gap-6 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-secondary via-peach to-lavender p-8 sm:p-10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-black tracking-wider text-primary uppercase">
                <Crown className="size-4" /> Connecta Plus
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Free for friends. Cuter with Plus.</h2>
              <p className="mt-2 max-w-lg">
                Everything above is free for up to 25 at once. Plus makes your rooms fit 100, unlocks premium maps, skins and pets, and your
                whole room enjoys it. Only the owner pays.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <p className="text-4xl font-black">
                ฿89<span className="text-base font-bold text-muted-foreground"> a month</span>
              </p>
              <Button asChild className="rounded-full font-extrabold">
                <Link href="/home/plus">See what you get</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          <h2 className="text-center text-3xl font-black tracking-[-0.03em]">Questions</h2>
          <div className="mt-6 flex flex-col divide-y rounded-[2rem] border bg-card">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold">
                  {q}
                  <ChevronDown className="size-4 flex-none transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Last call */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-center gap-4 rounded-[2.5rem] bg-cocoa px-6 py-14 text-center text-white">
            <span className="text-5xl">🛋️</span>
            <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">Your friends are one link away</h2>
            <p className="max-w-md text-white/70">Make a room in a minute. Pick a map, give it a name, send the link.</p>
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-extrabold">
              <Link href="/login">
                Make your room <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 pb-16 text-sm text-muted-foreground sm:px-6">
          <Logo />
          <span>Made for cosy hangouts. 13+.</span>
          <span className="ml-auto">Music from Pixabay · Demo build</span>
        </div>
      </footer>
    </div>
  );
}

function Float({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div
      className={cn('absolute hidden items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-bold shadow-soft sm:flex', className)}
    >
      {children}
    </div>
  );
}

/** Text on one side, a picture on the other; `flip` swaps them so the page zigzags. */
function Showcase({
  eyebrow,
  title,
  text,
  tint,
  flip,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  tint: string;
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className={cn('flex flex-col gap-3', flip && 'md:order-2')}>
        <p className="text-xs font-black tracking-wider text-primary uppercase">{eyebrow}</p>
        <h2 className="text-3xl font-black tracking-[-0.03em] text-balance sm:text-4xl">{title}</h2>
        <p className="text-lg text-muted-foreground">{text}</p>
      </div>
      <div className={cn('rounded-[2.5rem] bg-gradient-to-br p-5 sm:p-8', tint)}>{children}</div>
    </section>
  );
}

/** Two little conversations in one room: voice circles that overlap only within a group. */
function ProximityPicture() {
  const person = (emoji: string, name: string, className: string) => (
    <span className={cn('absolute flex flex-col items-center', className)}>
      <span className="grid size-12 place-items-center rounded-full bg-card text-2xl shadow-md">{emoji}</span>
      <span className="mt-1 rounded-full bg-card px-2 text-[11px] font-black shadow-sm">{name}</span>
    </span>
  );
  return (
    <div className="relative mx-auto aspect-[4/3] max-w-md">
      <span className="absolute top-[8%] left-[4%] size-[52%] rounded-full border-2 border-dashed border-card bg-card/30" />
      <span className="absolute right-[4%] bottom-[6%] size-[46%] rounded-full border-2 border-dashed border-card bg-card/30" />
      {person('🐰', 'Mai', 'top-[18%] left-[14%]')}
      {person('🐱', 'you', 'top-[34%] left-[34%]')}
      {person('🐻', 'Jod', 'top-[44%] left-[12%]')}
      {person('🦊', 'Ploy', 'right-[26%] bottom-[24%]')}
      {person('🐼', 'Ken', 'right-[10%] bottom-[12%]')}
      <span className="absolute top-[10%] right-[8%] rounded-2xl bg-card px-3 py-1.5 text-xs font-bold shadow-md">
        🔊 You hear Mai and Jod
      </span>
    </div>
  );
}

function StudyPicture() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3">
      <div className="rounded-3xl bg-card p-4 shadow-md">
        <p className="text-xs font-black text-muted-foreground">🍅 Pomodoro · Calculus</p>
        <p className="font-mono text-4xl font-black">18:42</p>
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div className="h-2 w-[62%] rounded-full bg-primary" />
        </div>
      </div>
      <div className="rounded-3xl bg-card p-4 shadow-md">
        <p className="mb-2 text-xs font-black text-muted-foreground">🏆 This week with friends</p>
        {[
          ['🥇', 'Nam', '13h 40m'],
          ['🥈', 'Mai', '11h 30m'],
          ['🥉', 'you', '8h 20m'],
        ].map(([medal, name, time]) => (
          <p key={name} className={cn('flex items-center gap-2 rounded-xl px-2 py-1 text-sm', name === 'you' && 'bg-secondary font-black')}>
            {medal} <span className="flex-1">{name}</span> <span className="font-mono text-xs">{time}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function RoomPicture() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3">
      <div className="rounded-3xl bg-card p-4 shadow-md">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-2xl">🍓</span>
          <span className="min-w-0 flex-1">
            <span className="block font-black">Chanom Friends</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-online" /> 3 inside · Cosy Library
            </span>
          </span>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">Walk in</span>
        </div>
      </div>
      {[
        ['Mai', 'library at 8? the cat is here 🐱', 'bg-lavender'],
        ['Jod', 'omw, bringing snacks', 'bg-peach'],
      ].map(([name, text, tint]) => (
        <div key={name} className="flex items-start gap-2 rounded-3xl bg-card p-3 shadow-sm">
          <span className={cn('grid size-8 flex-none place-items-center rounded-full text-xs font-black', tint)}>{name![0]}</span>
          <span className="text-sm">
            <span className="block font-black">{name}</span>
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}
