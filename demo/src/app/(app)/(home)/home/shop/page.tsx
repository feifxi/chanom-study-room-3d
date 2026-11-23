'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { PET_NAME_MAX, SHOP_ITEMS, type AvatarLook, type ShopItem } from '@connecta/shared';
import { QuestList } from '@/components/app/QuestList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMyLook } from '@/lib/myLook';
import { useQuests } from '@/lib/quests';
import { useBuy, useSaveLook, useWardrobe } from '@/features/shop/useWardrobe';

const AvatarPreview = dynamic(() => import('@/features/avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });
const PetPreview = dynamic(() => import('@/features/npc/PetPreview').then((m) => m.PetPreview), { ssr: false });

type Category = 'all' | ShopItem['kind'];
const CATEGORIES: [Category, string][] = [
  ['all', 'Everything'],
  ['outfit', 'Outfits'],
  ['accessory', 'Accessories'],
  ['pet', 'Pets'],
];
const TINTS = ['bg-secondary', 'bg-mint', 'bg-lavender', 'bg-sky', 'bg-peach'];

/** An item on your look: outfits change the shape (your colour stays), accessories the one slot; pets aren't worn */
const wearing = (look: AvatarLook, item: ShopItem): AvatarLook =>
  item.kind === 'outfit' ? { ...look, style: item.value } : item.kind === 'accessory' ? { ...look, accessory: item.value } : look;
const isWorn = (look: AvatarLook, item: ShopItem) =>
  item.kind === 'outfit' ? (look.style ?? 'sailor') === item.value : item.kind === 'accessory' && look.accessory === item.value;

/** The big picture: a pet up close, or your character wearing the item */
function Preview({ item, look }: { item: ShopItem | null; look: AvatarLook }) {
  return item?.kind === 'pet' ? <PetPreview coat={item.value} /> : <AvatarPreview look={look} />;
}

/**
 * The Shop (spec 15): only things that really show on your character in every room, bought with
 * coins you earn. Try anything on your own character first; what you own joins Settings → My
 * character.
 */
export default function ShopPage() {
  const [cat, setCat] = useState<Category>('all');
  const [trying, setTryingItem] = useState<ShopItem | null>(null);
  // A pet is named when you buy it: its own name to start with
  const [petName, setPetName] = useState('');
  const setTrying = (item: ShopItem | null) => {
    setTryingItem(item);
    setPetName(item?.kind === 'pet' ? item.name : '');
  };
  const { owned } = useWardrobe();
  const { coins } = useQuests();
  const buyItem = useBuy();
  const saveLook = useSaveLook();
  const { look: mine } = useMyLook();
  const look = trying ? wearing(mine, trying) : mine;
  const items = SHOP_ITEMS.filter((i) => cat === 'all' || i.kind === cat);
  const featured = SHOP_ITEMS.at(-1)!;

  const buy = async (item: ShopItem) => {
    if (coins < item.price) return toast.error(`Not enough coins yet: ${item.price - coins} to go. Today’s quests earn more.`);
    const name = item.kind === 'pet' ? petName.trim() || item.name : undefined;
    const failed = await buyItem.mutateAsync({ id: item.id, name });
    if (failed) return toast.error(failed);
    setTryingItem(item);
    if (name) toast.success(`${item.emoji} ${name} is yours! Bring ${name} out from the Buddy Machine in any room.`);
    else toast.success(`${item.emoji} ${item.name} is yours! Wear it now or any time from Settings.`);
  };
  const wear = async (item: ShopItem) => {
    const r = await saveLook(wearing(mine, item));
    if (!r.ok) return toast(r.message);
    setTrying(null);
    toast.success(`${item.emoji} Looking good! Everyone in the room sees it now`);
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
          <Preview item={trying} look={look} />
          <span className="absolute top-3 left-3 rounded-full bg-card/90 px-2.5 py-1 text-xs font-bold">
            {trying?.kind === 'pet' ? `Meet ${trying.name}` : trying ? `Trying on: ${trying.name}` : 'Your character'}
          </span>
        </div>
        {!trying ? (
          <Button variant="secondary" className="h-11 rounded-2xl font-bold" disabled>
            Pick something to try on
          </Button>
        ) : !owned.includes(trying.id) ? (
          <div className="flex flex-wrap gap-2">
            {trying.kind === 'pet' && (
              <label className="flex w-full flex-col gap-1 text-xs font-bold">
                Name your cat
                <Input
                  value={petName}
                  maxLength={PET_NAME_MAX}
                  onChange={(e) => setPetName(e.target.value)}
                  className="h-10 rounded-xl"
                  aria-label="Your cat's name"
                />
              </label>
            )}
            <Button className="h-11 flex-1 rounded-2xl font-extrabold" disabled={buyItem.isPending} onClick={() => buy(trying)}>
              Buy for {trying.price} <Coins />
            </Button>
            <Button variant="secondary" className="h-11 rounded-2xl font-bold" onClick={() => setTrying(null)}>
              {trying.kind === 'pet' ? 'Back' : 'Take off'}
            </Button>
          </div>
        ) : trying.kind === 'pet' ? (
          <p className="rounded-2xl bg-mint px-4 py-3 text-sm font-bold text-mint-ink">
            🐾 Yours! Bring it out from the Buddy Machine in any room.
          </p>
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
            <p className="max-w-sm text-sm">
              {featured.blurb}.{' '}
              {featured.kind === 'pet'
                ? 'Your own cat: bring it out from the Buddy Machine in any room.'
                : 'In your outfit colour, in every room.'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-sm font-black">
                <Coins className="size-4 text-gold" /> {featured.price}
              </span>
              <Button className="rounded-full font-extrabold" onClick={() => setTrying(featured)}>
                {featured.kind === 'pet' ? `Meet ${featured.name}` : 'Try it on'}
              </Button>
              {owned.includes(featured.id) && <span className="text-sm font-black text-mint-ink">Owned ✓</span>}
            </div>
          </div>
          <div className="relative mx-auto size-44 overflow-hidden rounded-full bg-card/50 sm:size-52">
            <Preview item={featured} look={wearing(mine, featured)} />
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
        Everything here is just for fun. Coins can’t be bought: you earn them with quests. Outfits come in your outfit colour; pets come out
        of the Buddy Machine.
      </p>
    </div>
  );
}
