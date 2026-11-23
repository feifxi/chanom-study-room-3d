'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Dices } from 'lucide-react';
import {
  ACCESSORIES,
  HAIR_COLORS,
  OUTFIT_COLORS,
  randomLook,
  SHOP_ITEMS,
  type Accessory,
  type AvatarLook,
  type OutfitStyle,
} from '@connecta/shared';
import { cn } from '@/lib/utils';

const AvatarPreview = dynamic(() => import('./AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

const ACCESSORY_LABELS: Record<string, string> = {
  none: 'None',
  ribbon: 'Ribbon',
  catEars: 'Cat ears',
  glasses: 'Glasses',
  headphones: 'Headphones',
  ahoge: 'Ahoge',
  twintails: 'Twin-tails',
};

/**
 * The character maker: a turning 3D preview, hair and outfit colours, and an accessory. Used when
 * signing up and in Settings, so changing your look later is the same as making it.
 */
export function CharacterEditor({
  look,
  onChange,
  children,
  previewClassName,
  owned,
}: {
  look: AvatarLook;
  onChange: (look: AvatarLook) => void;
  /** Extra fields beside the swatches, e.g. the display name when signing up. */
  children?: ReactNode;
  previewClassName?: string;
  /** Shop items you own (ids): they join the free accessories and the sailor top */
  owned?: readonly string[];
}) {
  const mine = SHOP_ITEMS.filter((i) => owned?.includes(i.id));
  const accessories: { id: Accessory; label: string }[] = [
    ...ACCESSORIES.map((a) => ({ id: a, label: ACCESSORY_LABELS[a]! })),
    ...mine.flatMap((i) => (i.kind === 'accessory' ? [{ id: i.value, label: `${i.emoji} ${i.name}` }] : [])),
  ];
  const styles: { id: OutfitStyle; label: string }[] = [
    { id: 'sailor', label: 'Sailor top' },
    ...mine.flatMap((i) => (i.kind === 'outfit' ? [{ id: i.value, label: `${i.emoji} ${i.name}` }] : [])),
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div
          className={cn(
            'relative h-52 w-36 flex-none overflow-hidden rounded-3xl bg-gradient-to-b from-lavender to-peach',
            previewClassName,
          )}
        >
          <AvatarPreview look={look} />
          <button
            type="button"
            onClick={() => onChange(randomLook())}
            className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-card/90 shadow"
            aria-label="Shuffle look"
          >
            <Dices className="size-4" />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {children}
          <Swatches label="Hair" colors={HAIR_COLORS} value={look.hair} onPick={(hair) => onChange({ ...look, hair })} />
          <Swatches label="Outfit" colors={OUTFIT_COLORS} value={look.outfit} onPick={(outfit) => onChange({ ...look, outfit })} />
        </div>
      </div>
      {styles.length > 1 && (
        <Chips label="Outfit" options={styles} value={look.style ?? 'sailor'} onPick={(style) => onChange({ ...look, style })} />
      )}
      <Chips
        label={styles.length > 1 ? 'Accessory' : undefined}
        options={accessories}
        value={look.accessory}
        onPick={(accessory) => onChange({ ...look, accessory })}
      />
    </div>
  );
}

function Chips<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label?: string;
  options: { id: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-bold text-muted-foreground">{label}</span>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => onPick(o.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-bold',
              value === o.id ? 'border-primary bg-secondary text-secondary-foreground' : 'bg-card hover:bg-muted',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: readonly string[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            type="button"
            key={c}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onPick(c)}
            className={cn(
              'size-6 rounded-full border-2 border-card shadow-[0_0_0_1px_var(--border)] transition-transform hover:scale-110',
              value === c && 'shadow-[0_0_0_2px_var(--primary)]',
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}
