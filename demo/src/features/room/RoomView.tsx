'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  HeadphoneOff,
  Headphones,
  Leaf,
  Megaphone,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  MousePointerClick,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { SEAT_BY_ID, SPAWN } from '@study/shared';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { setConnection } from '@/lib/connection';
import { DMS, ME, USERS, serverById } from '@/lib/mock';
import { AWAY_EVENT, crowdPeople, useCrowd } from '@/lib/demoCrowd';
import { questProgress } from '@/lib/quests';
import { GUEST_LOOK, loadGuest } from '@/lib/guest';
import { useCompactScreen, useTouchScreen, isTouchScreen } from '@/lib/screen';
import { useNow } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useMusic } from '../music/useMusic';
import type { LocalMotion } from '../room3d/Avatar';
import { useRoomLook } from '@/features/place/roomLook';
import { MapMove } from './MapMove';
import { useDayLight } from '../room3d/dayCycle';
import { Joystick } from '../room3d/Joystick';
import { LabelBoard, LabelLayer } from '../room3d/labels';
import type { Hint } from '../room3d/LocalController';
import type { LocalPlayerDriver } from '../room3d/LocalPlayerDriver';
import { MockRoom, type MockPerson } from '../room3d/mockRoom';
import { QUALITY } from '../room3d/quality';
import { RoomCanvas } from '../room3d/RoomCanvas';
import { ZoomControl } from '../room3d/ZoomControl';
import { bubbleMs, type Bubble } from '../room3d/roomSession';
import { zoneAt, type Zone } from '../room3d/zones';
import { ActivitiesPanel } from './ActivitiesPanel';
import { ChannelOverlay, type ChatTarget } from './ChannelOverlay';
import { PhotoMode } from './PhotoMode';
import { ChatPanel, type RoomLine } from './ChatPanel';
import { PeoplePill, RoomPeople, type RoomPerson, type RoomRole } from './RoomPeople';
import { RoomTools } from './RoomTools';
import { StudyPanel } from './StudyPanel';
import { useClickToWalk } from '@/lib/controls';
import { LeaveRoomGuard, LeaveRoomLink } from './LeaveRoom';
import { logFocus } from '@/lib/focus';
import { usePomodoro, type Phase } from './usePomodoro';
import { RoomCard } from './RoomCard';

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
/** No keys, clicks or moves for this long: you're away (💤, mic off). */
const AWAY_MS = 10 * 60_000;

/**
 * The room screen, five named parts:
 * - **Room card** (top left): the room itself: invite, settings, the room's time of day, battery saver, Leave
 * - **My tools** (left rail): study, music, help; only you
 * - **Chat** (bottom left): Room chat, Bubbles and Messages in one panel
 * - **People** (top right): a pill of faces that opens who's here
 * - **Dock** (bottom centre): mic, sound, chat, photo, activities. Screen share only shows once
 *   you sit at a desk, because that's the only place it works.
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
    // A guest walks in with the character they picked on the invite page (client-only, so storage is safe here)
    return new MockRoom({ name: myName, look: guest ? (loadGuest()?.look ?? GUEST_LOOK) : ME.look }, people);
  }, [roomDef, guest, myName]);

  const motion = useRef<LocalMotion>({ x: SPAWN.x, z: SPAWN.z, yaw: 0, moving: false });
  const driverRef = useRef<LocalPlayerDriver | null>(null);
  // Zoom buttons ask; the canvas applies it on its next frame and reports back (scroll zoom too)
  const zoomRequest = useRef<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const board = useMemo(() => new LabelBoard(), []);
  // The owner sets the room's look and time of day for everyone (feature 7); drop-ins use the defaults
  const lookId = server.id === 'public' ? `public:${roomDef.id}` : server.id;
  const look = useRoomLook(lookId, roomDef.mapId);
  // After a live map change everyone stands up (seats belong to the old map); the demo has only one 3D map
  const arrive = useCallback(() => room.send('stand', {}), [room]);
  const light = useDayLight(look.time === 'clock' ? 'auto' : look.time);
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
  const [zone, setZone] = useState<Zone | undefined>(undefined);
  const [away, setAway] = useState(false);
  // Talk to everyone (owner and mods): heard at full volume anywhere in the room
  const [stage, setStage] = useState(false);
  const canStage = !guest && (server.roles.me === 'Owner' || server.roles.me === 'Mod');

  const onPhase = useCallback(
    (phase: Phase, focusedMin: number) => {
      room.setStatus(phase === 'idle' ? 'idle' : phase, subjectRef.current);
      // The server counts a focus round when it ends or is stopped (1+ minute)
      logFocus(focusedMin, subjectRef.current);
      // A focus block ran to its end (focus → break): one finished session
      if (phase === 'break') questProgress('pomo-2');
    },
    [room],
  );
  const pomo = usePomodoro(onPhase);
  // While a focus timer runs you're studying, maybe in another tab: never away, and quest minutes count
  const focusing = useRef(false);
  useEffect(() => {
    focusing.current = pomo.phase === 'focus';
    if (pomo.phase !== 'focus') return;
    const id = setInterval(() => questProgress('focus-60'), 60_000);
    return () => clearInterval(id);
  }, [pomo.phase]);
  // Connected to a room with someone else in it (counted by the server; tabs don't matter)
  useEffect(() => {
    const id = setInterval(() => room.state.players.size > 1 && questProgress('room-30'), 60_000);
    return () => clearInterval(id);
  }, [room]);
  const music = useMusic(speaking.size > 0);

  // Stay "connected" while browsing chats elsewhere, like a voice channel
  useEffect(() => {
    if (!guest) setConnection({ serverId, roomId: roomDef.id, micOn: mic && !deaf });
  }, [guest, serverId, roomDef.id, mic, deaf]);

  const say = useCallback((id: string, name: string, text: string) => {
    setBubbles((b) => ({ ...b, [id]: { text, until: Date.now() + bubbleMs(text) } }));
    if (id === 'me') questProgress('say-5');
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

  // Which private zone you're standing in, and whether you've gone quiet long enough to be away
  useEffect(() => {
    let lastDom = performance.now();
    let forced = false;
    const touched = () => {
      lastDom = performance.now();
      forced = false;
    };
    const forceAway = () => (forced = true);
    const events = ['pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, touched));
    window.addEventListener(AWAY_EVENT, forceAway);
    const timer = setInterval(() => {
      const m = motion.current;
      setZone(zoneAt(m.x, m.z));
      const last = Math.max(lastDom, driverRef.current?.lastInput ?? 0);
      // Focusing is never away: people study in other tabs (notes, slides) and keep their mic as it was
      const isAway = !focusing.current && (forced || performance.now() - last > AWAY_MS);
      setAway((was) => {
        if (isAway && !was) {
          setMic(false);
          setStage(false);
          toast('💤 You’re away, so your mic is off. Move or press any key to come back.');
        } else if (!isAway && was) toast('Welcome back ✨');
        return isAway;
      });
    }, 500);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, touched));
      window.removeEventListener(AWAY_EVENT, forceAway);
    };
  }, []);

  const ids = useMemo(() => [...room.state.players.keys()], [room]);
  const npcIds = useMemo(() => [...room.state.npcs.keys()], [room]);
  const me = room.state.players.get('me')!;
  // Demo only: fill the list and the pill up to a crowd of 50 or 100 (the 3D scene stays as is)
  const crowd = useCrowd();
  const realPeople: RoomPerson[] = ids.map((id) => {
    const p = room.state.players.get(id)!;
    const isGuest = id.startsWith('guest') || (id === 'me' && guest);
    const status =
      id === 'me' && stage
        ? '📢 Talking to everyone'
        : id === 'me' && away
          ? '💤 Away'
          : p.status === 'focus'
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
      friend: id !== 'me' && !!USERS[id],
      // Literals, not the value from server.roles: React Compiler would treat the list as aliasing the server
      role: server.roles[id] === 'Owner' ? 'Owner' : server.roles[id] === 'Mod' ? 'Mod' : undefined,
      micOn: id === 'me' ? mic && !deaf : id === 'mai' || speaking.has(id),
      deafened: id === 'me' ? deaf : id === 'jod',
      speaking: speaking.has(id),
    };
  });

  const people = crowd ? [...realPeople, ...crowdPeople(Math.max(0, crowd - realPeople.length))] : realPeople;
  const roomName = server.id === 'public' ? roomDef.name : server.name;
  const micIds = new Set(realPeople.filter((p) => p.micOn).map((p) => p.id));
  const seatKind = me.seatId ? SEAT_BY_ID.get(me.seatId)?.kind : undefined;
  const seated = !!seatKind;

  const study = (
    <StudyPanel
      roomId={server.id}
      guest={guest}
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
  const peopleProps = {
    people,
    roomName,
    findId,
    onFind: find,
    myRole: (guest ? undefined : server.roles.me === 'Owner' ? 'Owner' : server.roles.me === 'Mod' ? 'Mod' : undefined) as
      RoomRole | undefined,
    onMessage: (p: RoomPerson) => {
      setSheet(false);
      const dm = DMS.find((d) => d.with === p.id);
      if (dm) setChatTarget({ kind: 'dm', id: dm.id });
      else toast(`A new chat with ${p.name} is in Messages`);
    },
  };
  const chatEl = (className: string, onClose?: () => void) => (
    <ChatPanel
      server={server}
      guest={guest}
      lines={lines}
      onSay={(text) => say('me', myName, text)}
      onTyping={(t) => room.setTyping(t)}
      onExpand={(t) => {
        setSheet(false);
        setChatTarget(t);
      }}
      onClose={onClose}
      className={className}
    />
  );
  const chat = compact ? chatEl('h-[40dvh] border-0 shadow-none') : chatEl('h-[360px] w-[364px]', () => setChatOpen(false));
  const toggleChat = () => (compact ? setSheet(true) : setChatOpen(!chatOpen));
  const chatPressed = compact ? sheet : chatOpen;

  // The one real way out; links elsewhere in the room come through the LeaveRoomGuard dialog first
  const leave = (href?: string) => {
    if (pomo.phase === 'focus') pomo.stop();
    setConnection(null);
    music.pause();
    router.push(href ?? (guest ? '/' : '/home'));
  };

  const dock = (className?: string) => (
    <nav className={cn('dock flex items-center gap-1.5 p-1.5', className)} aria-label="Controls">
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
      {canStage && (
        <button
          onClick={() => {
            if (!stage) {
              setDeaf(false);
              setMic(true);
              toast('📢 Everyone in the room hears you now, wherever they are');
            }
            setStage(!stage);
          }}
          aria-pressed={stage}
          aria-label={stage ? 'Stop talking to everyone' : 'Talk to everyone'}
          className={cn('dock-btn', compact && 'min-w-0 px-3', stage && 'dock-btn-live')}
        >
          <Megaphone className="size-5" />
          {!compact && (stage ? 'On air' : 'Everyone')}
        </button>
      )}
      <DockBtn icon={MessageCircle} label="Chat" compact={compact} pressed={chatPressed} onClick={toggleChat} />
      <DockBtn icon={Camera} label="Photo" compact={compact} onClick={() => setPhoto(true)} />
      <DockBtn icon={Sparkles} label="Activities" compact={compact} pressed={activities} onClick={() => setActivities(!activities)} />
    </nav>
  );
  const [clickToWalk, setClickToWalk] = useClickToWalk();
  // Battery saver is the one thing that's yours alone: the time of day is the room's (owner's) choice
  const view = (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setSaver(!saver)}
        aria-pressed={saver}
        className={cn(
          'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-extrabold',
          saver ? 'bg-mint text-mint-ink' : 'bg-card text-muted-foreground hover:text-foreground',
        )}
      >
        <Leaf className="size-3.5" /> Battery saver
        <span className="ml-auto">{saver ? 'On' : 'Off'}</span>
      </button>
      <button
        onClick={() => setClickToWalk(!clickToWalk)}
        aria-pressed={clickToWalk}
        className={cn(
          'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-extrabold',
          clickToWalk ? 'bg-mint text-mint-ink' : 'bg-card text-muted-foreground hover:text-foreground',
        )}
      >
        <MousePointerClick className="size-3.5" /> Click to walk
        <span className="ml-auto">{clickToWalk ? 'On' : 'Off'}</span>
      </button>
    </div>
  );

  return (
    <LeaveRoomGuard roomName={server.name} focusing={pomo.phase === 'focus'} onLeave={leave}>
      <div
        className="fixed inset-0 flex overflow-hidden transition-[background] duration-1000"
        style={{ background: `linear-gradient(180deg, ${light.background[0]}, ${light.background[1]})` }}
      >
        {/* The 3D view */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
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
            zoomRequest={zoomRequest}
            onZoom={setZoom}
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
              deafened: new Set(realPeople.filter((p) => p.deafened).map((p) => p.id)),
              sharing: sharing && seated ? new Set(['me']) : new Set(),
              away: away ? new Set(['me']) : new Set(),
              stage: stage ? new Set(['me']) : new Set(),
            }}
            clockOffset={0}
            npcIds={npcIds}
            npcs={room.state.npcs}
            reactions={[]}
          />

          {photo ? (
            <PhotoMode roomName={roomDef.name} onClose={() => setPhoto(false)} />
          ) : (
            <div>
              {/* Room card, top left: the room itself (invite, settings, your view, Leave) */}
              <RoomCard
                server={server}
                room={roomDef}
                here={people.length}
                guest={guest}
                view={view}
                onLeave={() => leave()}
                className={cn('absolute top-3 left-3 z-30', compact && 'right-3')}
              />

              {/* Top right: who's here, folded into a pill of faces; guests get a way in */}
              <div className={cn('absolute right-3 flex items-start gap-2', compact ? 'top-[80px]' : 'top-3')}>
                {guest && (
                  <LeaveRoomLink
                    href="/login?from=guest"
                    className="panel px-3 py-2 text-xs font-extrabold text-primary hover:bg-secondary"
                  >
                    Join {server.name} ✨
                  </LeaveRoomLink>
                )}
                {!compact && <PeoplePill {...peopleProps} />}
              </div>

              {/* My tools (left rail), and Chat at the bottom left */}
              <RoomTools
                study={study}
                pomo={pomo}
                music={music}
                touch={touch}
                className={cn('absolute left-3 z-20', compact ? 'top-[132px]' : 'top-[88px]')}
              />
              {!compact && chatOpen && <div className="absolute bottom-3 left-3">{chat}</div>}

              <MapMove lookId={lookId} mapId={look.mapId} onArrive={arrive} />

              {/* Top centre: you're in a private zone, or talking to everyone */}
              {(zone || stage) && (
                <div className="pointer-events-none absolute top-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 max-sm:top-[136px]">
                  {stage && (
                    <button
                      onClick={() => setStage(false)}
                      className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-extrabold text-primary-foreground shadow-soft"
                    >
                      📢 Everyone hears you · Stop
                    </button>
                  )}
                  {zone && (
                    <span className="panel rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap">
                      🔒 {zone.emoji} {zone.name} · only people here can hear you
                    </span>
                  )}
                </div>
              )}

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

              {dock('absolute bottom-3 left-1/2 -translate-x-1/2')}

              {/* Bottom right: zoom (V1). Touch screens pinch, and the tablet joystick has this corner */}
              {!touch && <ZoomControl percent={zoom} onZoom={(z) => (zoomRequest.current = z)} className="absolute right-3 bottom-3" />}

              {touch && (
                <Joystick
                  onMove={(x, z) => driverRef.current?.setStick(x, z)}
                  className={cn('absolute', compact ? 'bottom-[84px] left-4' : 'right-6 bottom-6')}
                />
              )}
            </div>
          )}
        </div>

        <ChannelOverlay server={server} target={chatTarget} onClose={() => setChatTarget(null)} />

        {/* Phones: people and chat share one sheet */}
        <Sheet open={sheet} onOpenChange={setSheet}>
          <SheetContent side="bottom" className="gap-2 rounded-t-3xl p-3">
            <SheetTitle className="sr-only">People and chat</SheetTitle>
            <RoomPeople {...peopleProps} className="h-[48dvh] max-h-none w-full rounded-none border-0 shadow-none" />
            {chat}
          </SheetContent>
        </Sheet>
      </div>
    </LeaveRoomGuard>
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
