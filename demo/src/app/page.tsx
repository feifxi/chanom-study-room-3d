import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Footprints, Gamepad2, Hash, Link2, MessageCircle, ShieldCheck, Sparkles, Timer, Users } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: Hash,
    tint: 'bg-secondary text-secondary-foreground',
    title: 'Servers with chats',
    text: 'Make a server for your friends or your whole class. Text chats keep things going when nobody is online.',
  },
  {
    icon: Footprints,
    tint: 'bg-lavender text-lavender-ink',
    title: '3D rooms, not voice channels',
    text: 'Walk up to someone to talk. Groups split into little conversations, like at a real hangout.',
  },
  {
    icon: Gamepad2,
    tint: 'bg-mint text-mint-ink',
    title: 'Things to do together',
    text: 'Watch videos on the big TV, play cards at a table, draw on the whiteboard, answer by walking to a side.',
  },
  {
    icon: Timer,
    tint: 'bg-peach text-peach-ink',
    title: 'Study, if you want',
    text: 'A Pomodoro over your head, a to-do list, lo-fi music and a focus ranking. Quiet rooms keep games away.',
  },
  {
    icon: Sparkles,
    tint: 'bg-sky text-sky-ink',
    title: 'Cute, and yours',
    text: 'Dress up your chibi, pick a pet, choose a cosy room for your server. Everything bounces a little.',
  },
  {
    icon: ShieldCheck,
    tint: 'bg-muted text-foreground',
    title: 'Safe by default',
    text: 'Private servers by default, guests only where owners allow them, and reporting everywhere. 16+.',
  },
];

/** Public landing page: what Connecta is, then into the app. */
export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-transparent bg-background/70 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <div className="hidden items-center gap-5 text-sm font-bold text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <Link href="/discover" className="hover:text-foreground">
              Discover
            </Link>
            <Link href="/home/plus" className="hover:text-foreground">
              Plus
            </Link>
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
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:pt-16">
          <div className="flex flex-col items-start gap-6">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground">
              New: servers, chats and rooms for your friends ✨
            </span>
            <h1 className="text-5xl leading-[1.02] font-black tracking-[-0.04em] text-balance sm:text-6xl">
              Hang out somewhere <span className="text-primary">cosy</span>.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Connecta is a little 3D place for your friends. Make a server, share a link, and walk over to whoever you want to talk to.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base font-extrabold">
                <Link href="/login">
                  Make your server <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base font-bold">
                <Link href="/invite/cafe-chanom">Try a room as a guest</Link>
              </Button>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link2 className="size-4" /> No download. Friends join from a link.
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
            <div className="absolute -top-4 -left-3 hidden rotate-[-4deg] items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-bold shadow-soft sm:flex">
              <span className="text-lg">🍅</span> Mai · focusing 25m
            </div>
            <div className="absolute -right-3 bottom-10 hidden rotate-[3deg] items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-bold shadow-soft sm:flex">
              <MessageCircle className="size-4 text-primary" /> “come sit with us!”
            </div>
            <div className="absolute -bottom-4 left-8 hidden items-center gap-2 rounded-full bg-cocoa px-3 py-1.5 text-xs font-bold text-white shadow-soft sm:flex">
              <span className="size-2 rounded-full bg-online" /> 6 in the Library
            </div>
          </div>
        </section>

        <section className="border-y bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.4fr] md:items-center">
            <h2 className="text-3xl font-black tracking-[-0.03em] text-balance">
              Chat apps are where you talk. Connecta is where you hang out.
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['🚶', 'Walk over', 'Voice gets louder as you get closer. Wander off to start a side chat.'],
                ['🛋️', 'Just be there', 'Sit on the sofa with your mic off. Your friends still see you.'],
                ['🎴', 'Do something', 'Cards, videos, drawing, quizzes. In the room, together.'],
              ].map(([emoji, title, text]) => (
                <div key={title} className="rounded-2xl bg-background p-4">
                  <div className="text-2xl">{emoji}</div>
                  <p className="mt-2 font-extrabold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-black tracking-[-0.03em]">Everything your group needs</h2>
          <p className="mt-2 text-muted-foreground">Servers and chats like you’re used to, with rooms you can actually walk into.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border bg-card p-5 shadow-soft">
                <span className={`grid size-11 place-items-center rounded-2xl ${f.tint}`}>
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid grid-cols-1 gap-6 rounded-[2rem] bg-cocoa p-8 text-white md:grid-cols-3 md:p-10">
            {[
              ['1', 'Make a server', 'Pick a name, an icon and a cosy room for it.'],
              ['2', 'Send the link', 'Friends sign in with Google or Discord. Guests can drop into rooms you open to them.'],
              ['3', 'Walk in', 'Everyone shows up as a chibi. Sit, chat, play, study.'],
            ].map(([n, title, text]) => (
              <div key={n}>
                <span className="grid size-9 place-items-center rounded-full bg-primary font-black text-primary-foreground">{n}</span>
                <p className="mt-3 text-lg font-extrabold">{title}</p>
                <p className="mt-1 text-sm text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 text-center sm:px-6">
          <Users className="mx-auto size-8 text-primary" />
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em]">Free for friends. Cuter with Plus.</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Servers, rooms, voice and chats are free. Plus adds outfits, a pet and bigger uploads. Boosts give your server more rooms and
            more seats.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild className="h-11 rounded-full px-6 font-extrabold">
              <Link href="/login">Get started</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-6 font-bold">
              <Link href="/home/plus">See Plus</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 pb-16 text-sm text-muted-foreground sm:px-6">
          <Logo />
          <span>Made for cosy hangouts. 16+.</span>
          <span className="ml-auto">Music from Pixabay · Demo build</span>
        </div>
      </footer>
    </div>
  );
}
