import Link from 'next/link';
import { Crown } from 'lucide-react';
import { PRESENCE_LABEL, UserAvatar } from '@/components/UserAvatar';
import { MAPS, userById, type Server } from '@/lib/mock';

/** Members grouped by where they are: in a room (with a link), online, offline. */
export function MembersPanel({ server }: { server: Server }) {
  const members = server.members.map(userById);
  const inRoom = server.rooms.flatMap((r) => r.people.map((id) => ({ u: userById(id), r })));
  const inRoomIds = new Set(inRoom.map((x) => x.u.id));
  const online = members.filter((u) => u.presence !== 'offline' && !inRoomIds.has(u.id));
  const offline = members.filter((u) => u.presence === 'offline');

  return (
    <aside className="hidden w-60 flex-none flex-col gap-4 overflow-y-auto border-l p-3 lg:flex">
      {server.rooms
        .filter((r) => r.people.length)
        .map((r) => (
          <Group key={r.id} title={`${MAPS.find((m) => m.id === r.mapId)!.emoji} In ${r.name} · ${r.people.length}`}>
            {r.people.map((id) => (
              <Member key={id} id={id} server={server} href={`/servers/${server.id}/rooms/${r.id}`} />
            ))}
          </Group>
        ))}
      <Group title={`Online · ${online.length}`}>
        {online.map((u) => (
          <Member key={u.id} id={u.id} server={server} />
        ))}
      </Group>
      <Group title={`Offline · ${offline.length}`}>
        {offline.map((u) => (
          <Member key={u.id} id={u.id} server={server} dim />
        ))}
      </Group>
    </aside>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-2 text-[11px] font-black tracking-wider text-muted-foreground uppercase">{title}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Member({ id, server, href, dim }: { id: string; server: Server; href?: string; dim?: boolean }) {
  const u = userById(id);
  const role = server.roles[id];
  const body = (
    <>
      <UserAvatar user={u} size={32} presence />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-bold">
          <span className="truncate">{u.id === 'me' ? `${u.name} (you)` : u.name}</span>
          {role === 'Owner' && <Crown className="size-3 flex-none text-gold" aria-label="Owner" />}
          {role === 'Mod' && <span className="rounded bg-lavender px-1 text-[9px] font-black text-lavender-ink">MOD</span>}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">{u.activity ?? PRESENCE_LABEL[u.presence]}</span>
      </span>
    </>
  );
  const cls = `flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted ${dim ? 'opacity-50' : ''}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
