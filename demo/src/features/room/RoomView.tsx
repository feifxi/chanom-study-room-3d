'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Clock, HeadphoneOff, Headphones, Leaf, MessageCircle, Mic, MicOff, Moon, MonitorUp, Sparkles, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { SEAT_BY_ID, SPAWN } from '@study/shared';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { setConnection } from '@/lib/connection';
import { ME, USERS, serverById } from '@/lib/mock';
import { useCompactScreen, useTouchScreen, isTouchScreen } from '@/lib/screen';
import { useNow } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useMusic } from '../music/useMusic';
import type { LocalMotion } from '../room3d/Avatar';
import { useDayLight, useThemeMode } from '../room3d/dayCycle';
import { Joystick } from '../room3d/Joystick';
import { LabelBoard, LabelLayer } from '../room3d/labels';
import type { Hint } from '../room3d/LocalController';
import type { LocalPlayerDriver } from '../room3d/LocalPlayerDriver';
import { MockRoom, type MockPerson } from '../room3d/mockRoom';
import { QUALITY } from '../room3d/quality';
import { RoomCanvas } from '../room3d/RoomCanvas';
import { BUBBLE_MS, type Bubble } from '../room3d/roomSession';
import { ActivitiesPanel } from './ActivitiesPanel';
import { ChannelOverlay, type ChatTarget } from './ChannelOverlay';
import { PhotoMode } from './PhotoMode';
import { RoomChat, type RoomLine } from './RoomChat';
import { RoomPeople, type RoomPerson } from './RoomPeople';
import { RoomTools } from './RoomTools';
import { StudyPanel } from './StudyPanel';
import { usePomodoro, type Phase } from './usePomodoro';
import { WhereCard } from './WhereCard';

/** Scripted crowd: where each mock person sits or walks. */
const PRESETS: Record<string, Omit<MockPerson, 'id' | 'name' | 'look'>> = {
  mai: { seatId: 't00-b0', status: 'focus', subject: 'Calculus', focusMin: 32 },
  jod: { seatId: 't01-f1', status: 'focus', subject: 'Kuy pawa', focusMin: 9 },
  ploy: {
    path: [
      { x: -2.5, z: 4.2 },
      { x: 7.3, z: 4.2 },
      { x: 7.3, z: -0.3 },
      { x: -2.5, z: -0.3 },
    ],
  },
  ken: { seatId: 'sofa-1' },
  nam: { seatId: 't10-b1', status: 'focus', subject: 'Physics', focusMin: 18 },
  pim: { at: { x: 3, z: 3 } },
  bow: { seatId: 'sofa-0' },
};
const GUEST_COLOR = '#9c8aa0';

/**
 * The room screen. Top left is *where you are* (expands into the server's chats, rooms and your DMs);
 * the left rail is *your own tools* (study, music, help); the right is *other people*: who's here as a
 * slim rail of faces on top, the room chat below; the dock is *what you do* (mic, sound, chat, photo,
 * activities). Screen share only shows once you sit at a desk, because that's the only place it works.
 */
export default function RoomView({ serverId, roomId, guestName }: { serverId: string; roomId: string; guestName: string | null }) {
  const router = useRouter();
  const server = serverById(serverId)!;
  const roomDef = server.rooms.find((r) => r.id === roomId) ?? server.rooms[0]!;
  const guest = guestName !== null;
  const myName = guest ? guestName || 'Guest' : ME.name;

  const room = useMemo(() => {
    const crowd = roomDef.people.length ? roomDef.people : ['ploy', 'ken'];
    const people: MockPerson[] = crowd.map((id) => ({ id, name: USERS[id]!.name, look: USERS[id]!.look, ...PRESETS[id] }));
    if (roomDef.allowGuests && !guest)
      people.push({
        id: 'guest-mint',
        name: 'Mint',
        look: { hair: '#8fdcc0', outfit: '#12a37f', accessory: 'none' },
        at: { x: -6.8, z: 5.6 },
      });
    return new MockRoom({ name: myName, look: guest ? { hair: '#c8e3ff', outfit: '#12a37f', accessory: 'headphones' } : ME.look }, people);
  }, [roomDef, guest, myName]);

  const motion = useRef<LocalMotion>({ x: SPAWN.x, z: SPAWN.z, yaw: 0, moving: false });
  const driverRef = useRef<LocalPlayerDriver | null>(null);
  const board = useMemo(() => new LabelBoard(), []);
  const [themeMode, setThemeMode] = useThemeMode();
  const light = useDayLight(themeMode);
  const [saver, setSaver] = useState(isTouchScreen);
  const quality = QUALITY[saver ? 'saver' : 'smooth'];
  const compact = useCompactScreen();
  const touch = useTouchScreen();
  const now = useNow(1000);

  const [hint, setHint] = useState<Hint | null>(null);
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});
  const [lines, setLines] = useState<RoomLine[]>([{ id: 'j', system: true, text: `👋 You walked into the ${roomDef.name}` }]);
  const [findId, setFindId] = useState<string | null>(null);
  const [photo, setPhoto] = useState(false);
  const [activities, setActivities] = useState(false);
  const [mic, setMic] = useState(false);
  // Deafen = hear nobody and say nothing, like Discord; undeafening brings the mic back as it was
  const [deaf, setDeaf] = useState(false);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);
  const [sheet, setSheet] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [subject, setSubject] = useState('');
  const subjectRef = useRef(subject);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());

  const onPhase = useCallback((phase: Phase) => room.setStatus(phase === 'idle' ? 'idle' : phase, subjectRef.current), [room]);
  const pomo = usePomodoro(onPhase);
  const music = useMusic(speaking.size > 0);

  // Stay "connected" while browsing chats elsewhere, like a voice channel
  useEffect(() => {
    if (!guest) setConnection({ serverId, roomId: roomDef.id, micOn: mic && !deaf });
  }, [guest, serverId, roomDef.id, mic, deaf]);

  const say = useCallback((id: string, name: string, text: string) => {
    setBubbles((b) => ({ ...b, [id]: { text, until: Date.now() + BUBBLE_MS } }));
    setLines((l) => [...l, { id: `${Date.now()}-${id}`, name, text }]);
  }, []);

  // A little life: someone talks on voice now and then, someone says hi
  useEffect(() => {
    const ids = [...room.state.players.keys()].filter((id) => id !== 'me');
    const talker = ids.find((id) => id === 'ploy') ?? ids[0];
    const t1 = setTimeout(() => talker && say(talker, room.state.players.get(talker)!.name, 'come sit with us! 🛋️'), 2500);
    const t2 = setInterval(() => setSpeaking((s) => (s.size ? new Set() : new Set(talker ? [talker] : []))), 2600);
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, [room, say]);

  const ids = useMemo(() => [...room.state.players.keys()], [room]);
  const npcIds = useMemo(() => [...room.state.npcs.keys()], [room]);
  const me = room.state.players.get('me')!;
  const people: RoomPerson[] = ids.map((id) => {
    const p = room.state.players.get(id)!;
    const isGuest = id.startsWith('guest') || (id === 'me' && guest);
    const status =
      p.status === 'focus'
        ? `📖 Focusing${p.subject ? ` · ${p.subject}` : ''} · ${Math.max(1, Math.round((now - p.focusSince) / 60_000))}m`
        : p.status === 'break'
          ? '☕ On a break'
          : p.seatId
            ? SEAT_BY_ID.get(p.seatId)?.kind === 'sofa'
              ? '🛋️ On the sofa'
              : '🪑 At a desk'
            : p.moving
              ? '🚶 Walking around'
              : 'Hanging out';
    return {
      id,
      name: p.name,
      color: id === 'me' ? (guest ? GUEST_COLOR : ME.color) : (USERS[id]?.color ?? GUEST_COLOR),
      status,
      guest: isGuest,
      you: id === 'me',
      micOn: id === 'me' ? mic && !deaf : id === 'mai' || speaking.has(id),
      deafened: id === 'me' ? deaf : id === 'jod',
      speaking: speaking.has(id),
    };
  });

  const micIds = new Set(people.filter((p) => p.micOn).map((p) => p.id));
  const seatKind = me.seatId ? SEAT_BY_ID.get(me.seatId)?.kind : undefined;
  const seated = !!seatKind;

  const study = (
    <StudyPanel
      pomo={pomo}
      subject={subject}
      onSubject={(s) => ((subjectRef.current = s), setSubject(s), pomo.phase === 'focus' && room.setStatus('focus', s))}
    />
  );
  const find = (id: string | null) => {
    setFindId(id);
    setSheet(false);
    if (id) toast(id === 'me' ? 'That’s you, with the pink ring' : `Follow the arrow to ${room.state.players.get(id)!.name}`);
  };
  const chat = (
    <RoomChat
      lines={lines}
      onSend={(text) => say('me', myName, text)}
      onClose={compact ? undefined : () => setChatOpen(false)}
      className={compact ? 'h-[46dvh] border-0 shadow-none' : 'h-[300px] w-[320px]'}
    />
  );

  const leave = () => {
    setConnection(null);
    music.pause();
    router.push(guest ? '/' : serverId === 'public' ? '/home' : `/servers/${serverId}`);
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden transition-[background] duration-1000"
      style={{ background: `linear-gradient(180deg, ${light.background[0]}, ${light.background[1]})` }}
    >
      <RoomCanvas
        room={room}
        motion={motion}
        board={board}
        light={light}
        quality={quality}
        bubbles={bubbles}
        findId={findId}
        onHint={setHint}
        driverRef={driverRef}
      />
      <LabelLayer
        board={board}
        ids={ids}
        players={room.state.players}
        localId="me"
        bubbles={bubbles}
        voice={{
          speaking,
          micEnabled: micIds,
          deafened: new Set(people.filter((p) => p.deafened).map((p) => p.id)),
          sharing: sharing && seated ? new Set(['me']) : new Set(),
        }}
        clockOffset={0}
        npcIds={npcIds}
        npcs={room.state.npcs}
        reactions={[]}
      />

      {photo ? (
        <PhotoMode roomName={roomDef.name} onClose={() => setPhoto(false)} />
      ) : (
        <>
          {/* Top left: where you are (expands into the server's other rooms and chats) */}
          <WhereCard
            server={server}
            room={roomDef}
            here={people.map((p) => (p.you ? 'You' : p.name))}
            guest={guest}
            onLeave={leave}
            onOpenChat={setChatTarget}
            className={cn('absolute top-3 left-3 z-30', compact ? 'right-3' : 'w-[380px]')}
          />

          {/* Left: your own tools, V1's icon rail */}
          <RoomTools
            study={study}
            pomo={pomo}
            music={music}
            touch={touch}
            className={cn('absolute left-3 z-20', compact ? 'top-[132px]' : 'top-[88px]')}
          />

          {/* Top right: the room's look; guests get a way in */}
          <div className={cn('absolute right-3 flex items-center gap-2', compact ? 'top-[80px]' : 'top-3')}>
            {guest && (
              <Link href="/login" className="panel px-3 py-2 text-xs font-extrabold text-primary hover:bg-secondary">
                Join {server.name} ✨
              </Link>
            )}
            <div className="panel flex items-center gap-0.5 p-1">
              {(
                [
                  ['auto', Clock, 'Follow the clock'],
                  ['day', Sun, 'Day'],
                  ['night', Moon, 'Night'],
                ] as const
              ).map(([m, Icon, label]) => (
                <Tooltip key={m}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setThemeMode(m)}
                      aria-label={label}
                      aria-pressed={themeMode === m}
                      className={cn(
                        'grid size-8 place-items-center rounded-xl',
                        themeMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSaver(!saver)}
                    aria-pressed={saver}
                    aria-label="Battery saver"
                    className={cn(
                      'grid size-8 place-items-center rounded-xl',
                      saver ? 'bg-mint text-mint-ink' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Leaf className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Battery saver {saver ? 'on' : 'off'}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Right: who's here */}
          {!compact && <RoomPeople people={people} findId={findId} onFind={find} className="absolute top-[64px] right-3" />}

          {/* Bottom right, under the people rail: everything about other people stays on one side */}
          {!compact && chatOpen && <div className="absolute right-3 bottom-3">{chat}</div>}

          {/* Above the dock: what you can do right here (sit, pet, and share your screen once seated) */}
          {(hint || seated) && (
            <div className="absolute bottom-[100px] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
              <button
                onClick={() => {
                  driverRef.current?.press('KeyE');
                  driverRef.current?.release('KeyE');
                }}
                className="panel rounded-full px-4 py-2 text-sm font-bold"
              >
                {seated
                  ? seatKind === 'sofa'
                    ? `🛋️ Lounging · ${touch ? 'tap' : 'press E'} to get up`
                    : `📖 At a desk · ${touch ? 'tap' : 'press E'} to stand up`
                  : hint?.kind === 'seat'
                    ? `${touch ? 'Tap' : 'Press E'} to sit`
                    : hint?.kind === 'pet'
                      ? `${touch ? 'Tap' : 'Press E'} to pet ${hint.name} 🐾`
                      : `${touch ? 'Tap' : 'Press E'}: Buddy Machine`}
              </button>
              {seated && seatKind !== 'sofa' && !guest && !compact && (
                <button
                  onClick={() => {
                    setSharing(!sharing);
                    toast(sharing ? 'Stopped sharing' : 'Sharing your screen with your table 🖥️');
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold shadow-soft',
                    sharing ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground hover:bg-primary-ink',
                  )}
                >
                  <MonitorUp className="size-4" /> {sharing ? 'Stop sharing' : 'Share screen to table'}
                </button>
              )}
            </div>
          )}

          {activities && (
            <div className="absolute bottom-[96px] left-1/2 z-20 -translate-x-1/2">
              <ActivitiesPanel quiet={roomDef.quiet} onClose={() => setActivities(false)} />
            </div>
          )}

          {/* Bottom: what you do */}
          <nav className="dock absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 p-1.5" aria-label="Controls">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <button
                    onClick={() => (deaf ? (setDeaf(false), setMic(true)) : setMic(!mic))}
                    disabled={guest}
                    aria-pressed={mic && !deaf}
                    className={cn('dock-btn', compact && 'min-w-0 px-3', mic && !deaf ? '!bg-[#2f8f62]' : '!bg-[#7a3442]')}
                  >
                    {mic && !deaf ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                    {!compact && (mic && !deaf ? 'Mic on' : 'Mic off')}
                  </button>
                </span>
              </TooltipTrigger>
              {guest && <TooltipContent>Guests can’t use voice in this room</TooltipContent>}
            </Tooltip>
            <button
              onClick={() => {
                setDeaf(!deaf);
                toast(deaf ? 'You can hear the room again' : 'Deafened: you hear nobody, and your mic is off');
              }}
              aria-pressed={deaf}
              aria-label={deaf ? 'Undeafen' : 'Deafen'}
              className={cn('dock-btn', compact && 'min-w-0 px-3', deaf && '!bg-[#7a3442]')}
            >
              {deaf ? <HeadphoneOff className="size-5" /> : <Headphones className="size-5" />}
              {!compact && (deaf ? 'Deafened' : 'Sound')}
            </button>
            <DockBtn
              icon={MessageCircle}
              label="Chat"
              compact={compact}
              pressed={compact ? sheet : chatOpen}
              onClick={() => (compact ? setSheet(true) : setChatOpen(!chatOpen))}
            />
            <DockBtn icon={Camera} label="Photo" compact={compact} onClick={() => setPhoto(true)} />
            <DockBtn icon={Sparkles} label="Activities" compact={compact} pressed={activities} onClick={() => setActivities(!activities)} />
          </nav>

          {touch && (
            <Joystick
              onMove={(x, z) => driverRef.current?.setStick(x, z)}
              className={cn('absolute', compact ? 'bottom-[84px] left-4' : 'bottom-6 left-6')}
            />
          )}
        </>
      )}

      <ChannelOverlay server={server} target={chatTarget} onClose={() => setChatTarget(null)} />

      {/* Phones: people and chat share one sheet */}
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="gap-2 rounded-t-3xl p-3">
          <SheetTitle className="sr-only">People and chat</SheetTitle>
          <RoomPeople people={people} findId={findId} onFind={find} startOpen className="w-full border-0 shadow-none" />
          {chat}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DockBtn({
  icon: Icon,
  label,
  onClick,
  compact,
  pressed,
  disabled,
}: {
  icon: typeof Mic;
  label: string;
  onClick: () => void;
  compact?: boolean;
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      className={cn('dock-btn', compact && 'min-w-0 px-3')}
    >
      <Icon className="size-5" />
      {!compact && label}
    </button>
  );
}
