import { cn } from '@/lib/utils';
import type { Presence, User } from '@/lib/mock';

const PRESENCE: Record<Presence, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  focus: 'bg-primary',
  offline: 'bg-muted-foreground/50',
};

export const PRESENCE_LABEL: Record<Presence, string> = {
  online: 'Online',
  idle: 'Away',
  focus: 'Focusing',
  offline: 'Offline',
};

/**
 * A round chibi sticker: the person's colour, their initial, and a presence dot.
 * Stand-in for a rendered avatar portrait in the real app.
 */
export function UserAvatar({
  user,
  size = 36,
  presence = false,
  className,
  ring,
}: {
  user: Pick<User, 'name' | 'color' | 'presence'>;
  size?: number;
  presence?: boolean;
  className?: string;
  ring?: string;
}) {
  const dot = Math.max(9, Math.round(size * 0.3));
  return (
    <span className={cn('relative inline-flex flex-none', className)} style={{ width: size, height: size }}>
      <span
        className={cn('grid size-full place-items-center rounded-full font-black text-white select-none', ring)}
        style={{
          background: `linear-gradient(145deg, ${user.color}, color-mix(in oklab, ${user.color} 70%, white))`,
          fontSize: size * 0.4,
        }}
      >
        {user.name[0]?.toUpperCase()}
      </span>
      {presence && (
        <span
          className={cn('absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-card', PRESENCE[user.presence])}
          style={{ width: dot, height: dot }}
          aria-label={PRESENCE_LABEL[user.presence]}
        />
      )}
    </span>
  );
}

/** Overlapping avatars, "+n" when there are more. */
export function AvatarStack({ users, max = 4, size = 24 }: { users: User[]; max?: number; size?: number }) {
  const shown = users.slice(0, max);
  return (
    <span className="flex items-center">
      {shown.map((u, i) => (
        <UserAvatar key={u.id} user={u} size={size} className={i ? '-ml-2' : ''} ring="ring-2 ring-card" />
      ))}
      {users.length > max && (
        <span
          className="-ml-2 grid place-items-center rounded-full bg-muted text-[10px] font-black text-muted-foreground ring-2 ring-card"
          style={{ width: size, height: size }}
        >
          +{users.length - max}
        </span>
      )}
    </span>
  );
}
