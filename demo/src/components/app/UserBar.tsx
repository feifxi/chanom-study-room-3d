'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Headphones, HeadphoneOff, Mic, MicOff, PhoneOff, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { setConnection, useConnection } from '@/lib/connection';
import { ME, serverById } from '@/lib/mock';
import { SettingsDialog } from './SettingsDialog';

/** Bottom of every sidebar: the room you're still in (if any), then you, mic, sound and settings. */
export function UserBar() {
  const [mic, setMic] = useState(false);
  const [deaf, setDeaf] = useState(false);
  const [settings, setSettings] = useState(false);
  const conn = useConnection();
  const server = conn && serverById(conn.serverId);
  const room = server?.rooms.find((r) => r.id === conn?.roomId);

  return (
    <div className="flex flex-col gap-2 p-2">
      {conn && server && room && (
        <div className="rounded-2xl bg-mint p-2.5 text-mint-ink">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-online" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black">Still in {room.name}</p>
              <p className="truncate text-[11px] opacity-80">{server.name} · voice on</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-mint-ink hover:bg-white/40"
                  onClick={() => {
                    setConnection(null);
                    toast('You left the room');
                  }}
                  aria-label="Leave room"
                >
                  <PhoneOff />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Leave room</TooltipContent>
            </Tooltip>
          </div>
          <Button asChild size="sm" className="mt-2 h-7 w-full rounded-xl bg-mint-ink font-bold text-mint hover:bg-mint-ink/90">
            <Link href={`/servers/${server.id}/rooms/${room.id}`}>Back to the room</Link>
          </Button>
        </div>
      )}
      <div className="flex items-center gap-1 rounded-2xl bg-muted/70 p-1.5">
        <button className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 text-left hover:bg-card" onClick={() => setSettings(true)}>
          <UserAvatar user={ME} size={32} presence />
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold">{ME.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">Online · Plus ✨</span>
          </span>
        </button>
        <IconToggle on={mic} onClick={() => setMic(!mic)} label={mic ? 'Mute' : 'Unmute'} icon={mic ? Mic : MicOff} danger={!mic} />
        <IconToggle
          on={!deaf}
          onClick={() => setDeaf(!deaf)}
          label={deaf ? 'Turn sound on' : 'Turn sound off'}
          icon={deaf ? HeadphoneOff : Headphones}
          danger={deaf}
        />
        <IconToggle on onClick={() => setSettings(true)} label="Settings" icon={Settings} />
      </div>
      <SettingsDialog open={settings} onOpenChange={setSettings} />
    </div>
  );
}

function IconToggle({
  onClick,
  label,
  icon: Icon,
  danger,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  icon: typeof Mic;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClick}
          aria-label={label}
          className={danger ? 'text-destructive' : 'text-muted-foreground'}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
