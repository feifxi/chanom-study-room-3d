'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Coins, Crown } from 'lucide-react';
import { QuestList } from '@/components/app/QuestList';
import { toast } from 'sonner';
import type { Accessory, AvatarLook } from '@study/shared';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ME, SHOP, type ShopCategory, type ShopItem } from '@/lib/mock';
import { spendCoins, useQuests } from '@/lib/quests';

const AvatarPreview = dynamic(() => import('@/features/avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

/** What trying an item on changes on the real 3D character (the rest are previews). */
const TRY_ON: Record<string, Partial<AvatarLook>> = {
  'strawberry-dress': { outfit: '#ff6fa8' },
  'matcha-hoodie': { outfit: '#12a37f' },
  'starry-pajamas': { outfit: '#7c5cff' },
  'school-uniform': { outfit: '#2f80ed' },
  'bunny-ears': { accessory: 'ahoge' as Accessory },
  'flower-crown': { accessory: 'ribbon' as Accessory },
  'round-glasses': { accessory: 'glasses' as Accessory },
  'cat-ears': { accessory: 'catEars' as Accessory },
};

const CATEGORIES: [ShopCategory | 'all', string][] = [
  ['all', 'Everything'],
  ['outfits', 'Outfits'],
  ['accessories', 'Accessories'],
  ['pets', 'Pets'],
  ['frames', 'Photo frames'],
];

/** The shop: cosmetics only (never power). Try things on your real character before buying. */
export default function ShopPage() {
  const [cat, setCat] = useState<ShopCategory | 'all'>('all');
  const [trying, setTrying] = useState<ShopItem | null>(null);
  const [owned, setOwned] = useState(() => new Set(SHOP.filter((i) => i.owned).map((i) => i.id)));
  const { coins } = useQuests();
  const look = { ...ME.look, ...(trying ? TRY_ON[trying.id] : {}) };
  const items = SHOP.filter((i) => cat === 'all' || i.category === cat);

  const buy = (item: ShopItem) => {
    if (!spendCoins(item.price)) return toast.error('Not enough coins yet. Today’s quests earn more.');
    setOwned(new Set(owned).add(item.id));
    toast.success(`${item.emoji} ${item.name} is yours!`);
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <aside className="flex flex-none flex-col gap-4 border-b p-5 lg:w-80 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-[-0.03em]">Shop</h1>
          <span className="flex items-center gap-1.5 rounded-full bg-peach px-3 py-1 text-sm font-black text-peach-ink">
            <Coins className="size-4" /> {coins.toLocaleString()}
          </span>
        </div>
        <div className="relative h-72 overflow-hidden rounded-3xl bg-gradient-to-b from-lavender via-secondary to-peach">
          <AvatarPreview look={look} />
          {trying?.category === 'pets' && <span className="absolute bottom-6 left-6 animate-bounce text-4xl">{trying.emoji}</span>}
          <span className="absolute top-3 left-3 rounded-full bg-card/90 px-2.5 py-1 text-xs font-bold">
            {trying ? `Trying on: ${trying.name}` : 'Your character'}
          </span>
        </div>
        {/* Premium skins come with Plus and are never sold for coins */}
        {trying?.plusOnly && !ME.plus ? (
          <Button asChild className="h-11 rounded-2xl font-extrabold">
            <Link href="/home/plus">
              <Crown /> Comes with Plus
            </Link>
          </Button>
        ) : trying && !trying.plusOnly && !owned.has(trying.id) ? (
          <Button className="h-11 rounded-2xl font-extrabold" onClick={() => buy(trying)}>
            Buy for {trying.price} <Coins />
          </Button>
        ) : (
          <Button variant="secondary" className="h-11 rounded-2xl font-bold" onClick={() => setTrying(null)}>
            {trying ? 'Wear it' : 'Pick something to try on'}
          </Button>
        )}
        <section className="flex flex-col gap-2">
          <h2 className="flex items-baseline justify-between text-sm font-black">
            Today’s quests <span className="text-[11px] font-bold text-muted-foreground">new at midnight</span>
          </h2>
          <QuestList />
        </section>
        <p className="text-xs text-muted-foreground">
          Everything here is just for looks. Coins can’t be bought: you earn them with quests. Premium skins come with Plus.
        </p>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto p-5">
        <div className="mb-5 flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-mint to-sky p-5">
          <span className="text-5xl">🐥</span>
          <div className="flex-1">
            <p className="text-xs font-black tracking-wider text-mint-ink uppercase">New this week</p>
            <p className="text-xl font-black">Pet Duckling</p>
            <p className="text-sm text-muted-foreground">Waddles after you in every room. Quacks when you finish a Pomodoro.</p>
          </div>
          <Button className="rounded-full font-extrabold" onClick={() => setTrying(SHOP.find((i) => i.id === 'pet-duck')!)}>
            Try it
          </Button>
        </div>
        <Tabs value={cat} onValueChange={(v) => setCat(v as ShopCategory | 'all')}>
          <TabsList className="h-10 flex-wrap rounded-2xl">
            {CATEGORIES.map(([id, label]) => (
              <TabsTrigger key={id} value={id} className="rounded-xl px-3 font-bold">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const has = owned.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setTrying(item)}
                className={cn(
                  'group flex flex-col overflow-hidden rounded-3xl border bg-background/60 text-left transition-shadow hover:shadow-soft',
                  trying?.id === item.id && 'ring-[3px] ring-primary',
                )}
              >
                <span className={cn('relative grid h-28 place-items-center text-5xl', item.tint)}>
                  <span className="transition-transform group-hover:-translate-y-1">{item.emoji}</span>
                  {item.isNew && (
                    <span className="absolute top-2 left-2 rounded-full bg-primary px-2 text-[10px] font-black text-primary-foreground">
                      NEW
                    </span>
                  )}
                  {item.plusOnly && (
                    <span className="absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-card px-2 text-[10px] font-black">
                      <Crown className="size-3" /> Plus
                    </span>
                  )}
                </span>
                <span className="p-3">
                  <span className="block truncate text-sm font-extrabold">{item.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-sm font-bold text-muted-foreground">
                    {item.plusOnly ? (
                      <span className={ME.plus ? 'text-mint-ink' : undefined}>{ME.plus ? 'Yours with Plus ✓' : 'With Plus'}</span>
                    ) : has ? (
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
      </section>
    </div>
  );
}
