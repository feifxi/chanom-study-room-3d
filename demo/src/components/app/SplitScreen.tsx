import Image from 'next/image';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

/**
 * The layout for sign-in and invites: a picture of the place on the left (wide screens), the form on
 * the right. Instead of a lonely card in the middle of the screen, you see where you're going.
 */
export function SplitScreen({ aside, children }: { aside: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-secondary via-peach to-lavender lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-center lg:gap-6 lg:p-12 xl:gap-8 xl:p-16">
        {aside}
      </aside>
      <main className="flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 flex justify-center lg:justify-start">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

/** The real room, tilted a little, with chips floating around it. */
export function RoomShot({ chips }: { chips: { text: React.ReactNode; className: string }[] }) {
  return (
    <div className="relative mx-auto w-full max-w-xl [@media(max-height:820px)]:max-w-md">
      <div className="rotate-[-1.5deg] overflow-hidden rounded-[2rem] border-4 border-card shadow-2xl">
        <Image src="/screenshot.png" alt="Friends in a cosy room" width={1872} height={1330} className="h-auto w-full" />
      </div>
      {chips.map((c, i) => (
        <div
          key={i}
          className={cn('absolute flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-bold shadow-lg', c.className)}
        >
          {c.text}
        </div>
      ))}
    </div>
  );
}
