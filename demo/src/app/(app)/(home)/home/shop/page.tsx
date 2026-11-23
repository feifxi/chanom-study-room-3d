'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { SHOP_ITEMS, type AvatarLook, type ShopItem } from '@connecta/shared';
import { QuestList } from '@/components/app/QuestList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { saveMyLook, useMyLook } from '@/lib/myLook';
import { spendCoins, useQuests } from '@/lib/quests';
import { addOwned, useOwned } from '@/lib/wardrobe';

const AvatarPreview = dynamic(() => import('@/features/avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

type Category = 'all' | ShopItem['kind'];
const CATEGORIES: [Category, string][] = [
  ['all', 'Everything'],
  ['outfit', 'Outfits'],
  ['accessory', 'Accessories'],
];
const TINTS = ['bg-secondary', 'bg-mint', 'bg-lavender', 'bg-sky', 'bg-peach'];

/** An item on your look: outfits change the shape (your colour stays), accessories the one slot */
const wearing = (look: AvatarLook, item: ShopItem): AvatarLook =>
  item.kind === 'outfit' ? { ...look, style: item.value } : { ...look, accessory: item.value };
const isWorn = (look: AvatarLook, item: ShopItem) =>
  item.kind === 'outfit' ? (look.style ?? 'sailor') === item.value : look.accessory === item.value;

/**
 * The Shop (spec 15): only things that really show on your character in every room, bought with
 * coins you earn. Try anything on your own character first; what you own joins Settings → My
 * character.
 */
export default function ShopPage() {
  const [cat, setCat] = useState<Category>('all');
  const [trying, setTrying] = useState<ShopItem | null>(null);
  const owned = useOwned();
  const { coins } = useQuests();
  const { look: mine } = useMyLook();
  const look = trying ? wearing(mine, trying) : mine;
  const items = SHOP_ITEMS.filter((i) => cat === 'all' || i.kind === cat);
  const featured = SHOP_ITEMS.at(-1)!;

  const buy = (item: ShopItem) => {
    if (!spendCoins(item.price)) return toast.error(`Not enough coins yet: ${item.price - coins} to go. Today’s quests earn more.`);
    addOwned(item.id);
    setTrying(item);
    toast.success(`${item.emoji} ${item.name} is yours! Wear it now or any time from Settings.`);
  };
  const wear = (item: ShopItem) => {
    const r = saveMyLook(wearing(mine, item));
    if (r.ok) {
      setTrying(null);
      toast.success(`${item.emoji} Looking good! Everyone in the room sees it now`);
    } else toast(`One more sec: you can change again in ${r.waitS} s`);
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <aside className="flex flex-none flex-col gap-4 border-b p-5 lg:w-80 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-[-0.03em]">Shop</h1>
          <span className="flex items-center gap-1.5 rounded-full bg-peach px-3 py-1 text-sm font-black text-peach-ink">
            <Coins className="size-4" /> {coins.toLocaleString()}
          </span>
        </div>
        <div className="relative h-72 overflow-hidden rounded-3xl bg-gradient-to-b from-lavender via-secondary to-peach">
          <AvatarPreview look={look} />
          <span className="absolute top-3 left-3 rounded-full bg-card/90 px-2.5 py-1 text-xs font-bold">
            {trying ? `Trying on: ${trying.name}` : 'Your character'}
          </span>
        </div>
        {!trying ? (
          <Button variant="secondary" className="h-11 rounded-2xl font-bold" disabled>
            Pick something to try on
          </Button>
        ) : !owned.includes(trying.id) ? (
          <div className="flex gap-2">
            <Button className="h-11 flex-1 rounded-2xl font-extrabold" onClick={() => buy(trying)}>
              Buy for {trying.price} <Coins />
            </Button>
            <Button variant="secondary" className="h-11 rounded-2xl font-bold" onClick={() => setTrying(null)}>
              Take off
            </Button>
          </div>
        ) : isWorn(mine, trying) ? (
          <Button variant="secondary" className="h-11 rounded-2xl font-bold" onClick={() => setTrying(null)}>
            <Check /> You’re wearing it
          </Button>
        ) : (
          <Button className="h-11 rounded-2xl font-extrabold" onClick={() => wear(trying)}>
            Wear it
          </Button>
        )}
        <Quests className="hidden lg:flex" />
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto p-5">
        {/* Featured: big, like a game's item shop, so the new thing feels like an event */}
        <div className="relative mb-6 grid items-center gap-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint via-sky to-lavender p-6 sm:grid-cols-[1fr_auto] sm:p-8">
          <div className="flex flex-col items-start gap-2">
            <span className="rounded-full bg-card/80 px-3 py-1 text-xs font-black tracking-wider text-mint-ink uppercase">
              ✨ New this week
            </span>
            <p className="text-4xl font-black tracking-[-0.03em]">
              {featured.emoji} {featured.name}
            </p>
            <p className="max-w-sm text-sm">{featured.blurb}. In your outfit colour, in every room.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-sm font-black">
                <Coins className="size-4 text-gold" /> {featured.price}
              </span>
              <Button className="rounded-full font-extrabold" onClick={() => setTrying(featured)}>
                Try it on
              </Button>
              {owned.includes(featured.id) && <span className="text-sm font-black text-mint-ink">Owned ✓</span>}
            </div>
          </div>
          <div className="relative mx-auto size-44 overflow-hidden rounded-full bg-card/50 sm:size-52">
            <AvatarPreview look={wearing(mine, featured)} />
          </div>
        </div>
        <Tabs value={cat} onValueChange={(v) => setCat(v as Category)}>
          <TabsList className="h-10 flex-wrap rounded-2xl">
            {CATEGORIES.map(([id, label]) => (
              <TabsTrigger key={id} value={id} className="rounded-xl px-3 font-bold">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {items.map((item) => {
            const has = owned.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setTrying(item)}
                className={cn(
                  'group flex flex-col overflow-hidden rounded-3xl border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-soft',
                  trying?.id === item.id && 'ring-[3px] ring-primary',
                )}
              >
                <span
                  className={cn(
                    'relative grid h-28 place-items-center bg-[radial-gradient(circle,rgb(255_255_255/0.55)_1.5px,transparent_1.5px)] bg-[length:14px_14px] text-6xl',
                    TINTS[SHOP_ITEMS.indexOf(item) % TINTS.length],
                  )}
                >
                  <span className="drop-shadow-md transition-transform group-hover:-translate-y-1.5 group-hover:scale-110">
                    {item.emoji}
                  </span>
                  {item === featured && (
                    <span className="absolute top-2 left-2 rounded-full bg-primary px-2 text-[10px] font-black text-primary-foreground">
                      NEW
                    </span>
                  )}
                  {isWorn(mine, item) && (
                    <span className="absolute top-2 right-2 rounded-full bg-card px-2 text-[10px] font-black text-mint-ink">Wearing</span>
                  )}
                </span>
                <span className="p-3">
                  <span className="block truncate text-sm font-extrabold">{item.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{item.blurb}</span>
                  <span className="mt-1 flex items-center gap-1 text-sm font-bold text-muted-foreground">
                    {has ? (
                      <span className="text-mint-ink">Owned ✓</span>
                    ) : (
                      <>
                        <Coins className="size-3.5 text-gold" /> {item.price}
                      </>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {/* On a phone the quests come after the items, so the Shop opens on things to try */}
        <Quests className="mt-6 lg:hidden" />
      </section>
    </div>
  );
}

function Quests({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <section className="flex flex-col gap-2">
        <h2 className="flex items-baseline justify-between text-sm font-black">
          Today’s quests <span className="text-[11px] font-bold text-muted-foreground">new at midnight</span>
        </h2>
        <QuestList />
      </section>
      <p className="text-xs text-muted-foreground">
        Everything here is just for looks. Coins can’t be bought: you earn them with quests. Outfits come in your outfit colour.
      </p>
    </div>
  );
}
