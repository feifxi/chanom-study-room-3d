'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
  X,
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
import { usePerfOverlay } from '../room3d/perf';
import { PerfOverlay } from '../room3d/PerfOverlay';
import { ZoomControl } from '../room3d/ZoomControl';
import { bubbleMs, type Bubble } from '../room3d/roomSession';
import { zoneAt, type Zone } from '../room3d/zones';
import { ActivitiesPanel } from './ActivitiesPanel';
import { ActivityHub, type SpotState } from '../activities/hub';
import { ActivityLayer3D } from '../activities/Activity3D';
import { AwayBanner, InviteStack, LobbyCard, NextRoundCard, PlayStrip, ResultsCard, type Who } from '../activities/ActivityHud';
import { GamePlaceholder } from '../activities/GamePlaceholder';
import type { SideGame } from '../activities/pickASide/game';
import { DeckPicker } from '../activities/pickASide/DeckPicker';
import { deckKindFor } from '../activities/pickASide/decks';
import { sidesFor, zoneAt as sideZoneAt } from '../activities/pickASide/game';
import { SideHud, list } from '../activities/pickASide/SideHud';
import { isGameSeat, spotById, type Spot } from '../activities/spots';
import { PICK_A_SIDE_EVENT, WATCH_EVENT } from '@/lib/demoCrowd';
import { AddVideo, WatchPanel } from '../activities/WatchPanel';
import { ChannelOverlay, type ChatTarget } from './ChannelOverlay';
import { PhotoMode } from './PhotoMode';
import { ChatPanel, type RoomLine } from './ChatPanel';
import { PeoplePill, RoomPeople, type RoomPerson, type RoomRole } from './RoomPeople';
import { RoomTools } from './RoomTools';
import { StudyPanel } from './StudyPanel';
import { useClickToWalk, useHideInvitesWhileFocusing } from '@/lib/controls';
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

  // Demo only: fill the room up to a crowd of 50 or 100, in 3D and in the people list
  const crowd = useCrowd();
  const room = useMemo(() => {
    const regulars = roomDef.people.length ? roomDef.people : ['ploy', 'ken'];
    const people: MockPerson[] = regulars.map((id) => ({ id, name: USERS[id]!.name, look: USERS[id]!.look, ...PRESETS[id] }));
    if (roomDef.allowGuests && !guest)
      people.push({
        id: 'guest-mint',
        name: 'Mint',
        look: { hair: '#8fdcc0', outfit: '#12a37f', accessory: 'none' },
        at: { x: -6.8, z: 5.6 },
      });
    // A guest walks in with the character they picked on the invite page (client-only, so storage is safe here)
    const extra = crowd ? crowdPeople(Math.max(0, crowd - people.length - 1)) : [];
    return new MockRoom({ name: myName, look: guest ? (loadGuest()?.look ?? GUEST_LOOK) : ME.look }, people, extra);
  }, [roomDef, guest, myName, crowd]);

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
  const perfOn = usePerfOverlay();
  // A device that can't keep up switches itself to battery saver, once, and says so
  const goSaver = useCallback(() => {
    setSaver(true);
    toast('🍃 Switched to battery saver to keep things smooth. You can turn it off in the room card.');
  }, []);
  const quality = QUALITY[saver ? 'saver' : 'smooth'];
  const compact = useCompactScreen();
  const touch = useTouchScreen();
  const now = useNow(1000);

  // Activities (feature 9): one framework for every game; the demo's hub plays the server
  const hub = useMemo(() => new ActivityHub(room, roomDef.roomWideGames, (text) => toast(text)), [room, roomDef.roomWideGames]);
  useSyncExternalStore(hub.subscribe, hub.getVersion, hub.getVersion);
  // Pick a Side's timer and "you're on B" need more than once a second
  const sideNow = useNow(hub.side && hub.spots.floor.phase === 'playing' ? 250 : 5000);
  useEffect(() => {
    const id = setInterval(() => hub.tick(Date.now()), 250);
    // Demo: someone starts Pick a Side a little after you arrive (or from the Demo tab)
    const t = setTimeout(() => hub.scriptPickASide(), 25_000);
    const onDemo = () => hub.scriptPickASide();
    const onWatch = () => hub.scriptWatch();
    window.addEventListener(PICK_A_SIDE_EVENT, onDemo);
    window.addEventListener(WATCH_EVENT, onWatch);
    return () => {
      clearInterval(id);
      clearTimeout(t);
      window.removeEventListener(PICK_A_SIDE_EVENT, onDemo);
      window.removeEventListener(WATCH_EVENT, onWatch);
      hub.dispose();
    };
  }, [hub]);

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
  // Your lo-fi fades while people talk, and while you're watching the big screen
  const watchingTv = hub.mine('me')?.id === 'tv';
  const music = useMusic(speaking.size > 0 || watchingTv);
  const [watchMini, setWatchMini] = useState(false);
  const [puttingOn, setPuttingOn] = useState(false);

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
  // The demo crowd's list rows come from crowdPeople (statuses, mics); their avatars walk in 3D
  const realPeople: RoomPerson[] = ids
    .filter((id) => !id.startsWith('crowd-'))
    .map((id) => {
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
  const atGameTable = isGameSeat(me.seatId);

  const who = (id: string): Who => {
    const p = room.state.players.get(id);
    return {
      name: p?.name ?? 'Someone',
      color: id === 'me' ? (guest ? GUEST_COLOR : ME.color) : (USERS[id]?.color ?? GUEST_COLOR),
    };
  };
  const mySpot = hub.mine('me');
  const myState = mySpot ? hub.spots[mySpot.id] : undefined;
  // In the round, or knocked out and watching from the spot
  const inGame = !!myState && myState.phase === 'playing' && (myState.players.includes('me') || myState.out.includes('me'));
  const side = hub.side;
  const sideZone = (x: number, z: number) => (side ? sideZoneAt(spotById('floor').area, sidesFor(side.mode), x, z) : null);
  const sideCounts = side
    ? Array.from(
        { length: sidesFor(side.mode) },
        (_, i) =>
          hub.spots.floor.players.filter((id) => {
            const p = room.state.players.get(id);
            return p && sideZone(p.x, p.z) === i;
          }).length,
      )
    : [];
  const [hideInvites] = useHideInvitesWhileFocusing();
  const invites = hideInvites && pomo.phase === 'focus' ? [] : hub.invites(now);
  const anyLive = Object.values(hub.spots).some((st) => st.phase === 'gathering' || st.phase === 'playing');
  // Standing spots start with E (tables start when you sit): you're in the ring and it's free
  const floor = spotById('floor');
  const atFreeFloor =
    !seated &&
    roomDef.roomWideGames &&
    hub.spots.floor.phase === 'free' &&
    Math.hypot(me.x - floor.area.x, me.z - floor.area.z) <= floor.area.r;
  const tv = spotById('tv');
  const atFreeTv = !seated && hub.spots.tv.phase === 'free' && Math.hypot(me.x - tv.area.x, me.z - tv.area.z) <= tv.area.r;
  // Walked away from the screen with the "put something on" card open: close it
  const showPutOn = puttingOn && atFreeTv;

  /** "Go there": run to a free seat (then sit yourself), or into the ring (being there is joining). */
  const goThere = (spot: Spot) => {
    setActivities(false);
    const d = driverRef.current;
    if (!d) return;
    if (spot.seats) {
      const free = spot.seats
        .map((id) => SEAT_BY_ID.get(id)!)
        .filter((st) => room.seatFree(st.id))
        .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
      if (!free) return toast(`${spot.name} is full. Watch from nearby, you’ll see the game on the table.`);
      d.goTo(free.out.x, free.out.z, true);
    } else {
      const a = Math.atan2(me.x - spot.area.x, me.z - spot.area.z);
      d.goTo(spot.area.x + Math.sin(a) * spot.area.r * 0.4, spot.area.z + Math.cos(a) * spot.area.r * 0.4, true);
    }
  };
  /** Leave an activity: seats stand you up (the hub does it); out of a ring, you step outside it. */
  const leaveActivity = (spot: Spot) => {
    hub.leave(spot.id, 'me');
    if (!spot.seats) {
      const a = Math.atan2(me.x - spot.area.x, me.z - spot.area.z) || Math.PI;
      driverRef.current?.goTo(spot.area.x + Math.sin(a) * (spot.area.r + 0.8), spot.area.z + Math.cos(a) * (spot.area.r + 0.8));
    }
  };
  useEffect(() => {
    if (!atFreeFloor && !atFreeTv) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code !== 'KeyE' || e.repeat || (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) return;
      if (atFreeFloor) hub.start('floor', 'me');
      else setPuttingOn(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [atFreeFloor, atFreeTv, hub]);

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
      <DockBtn
        icon={Sparkles}
        label="Activities"
        compact={compact}
        pressed={activities}
        dot={anyLive}
        onClick={() => setActivities(!activities)}
      />
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
            onSlow={saver ? undefined : goSaver}
          >
            <ActivityLayer3D spots={hub.spots} watch={hub.watch} side={hub.side} />
          </RoomCanvas>
          {/* Photos never show names: labels hide in photo mode so the preview matches the photo */}
          <div className={cn(photo && 'hidden')}>
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
          </div>

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
              <div className={cn('absolute right-3 z-20', compact ? 'top-[132px]' : 'top-[72px]')}>
                <InviteStack
                  invites={invites}
                  spots={spotById}
                  states={(id) => hub.spots[id]}
                  who={who}
                  now={now}
                  onGo={(inv) => {
                    hub.dismiss(inv.key);
                    goThere(spotById(inv.spotId));
                  }}
                  onDismiss={(inv) => hub.dismiss(inv.key)}
                />
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

              {perfOn && (
                <div className={cn('pointer-events-none absolute left-[84px] z-30', compact ? 'top-[132px]' : 'top-[88px]')}>
                  <PerfOverlay fpsCap={quality.fps} mode={saver ? 'battery saver' : 'smooth'} />
                </div>
              )}

              {/* Top centre: you're in a private zone, or talking to everyone */}
              {(zone || stage || inGame) && (
                <div className="pointer-events-none absolute top-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5 max-sm:top-[136px]">
                  {mySpot && myState && inGame && (
                    <div className="pointer-events-auto flex flex-col items-center gap-1.5">
                      <PlayStrip
                        st={myState}
                        verb={mySpot.kind === 'drop-in' ? 'watching' : 'playing'}
                        isHost={myState.hostId === 'me'}
                        onLeave={() => leaveActivity(mySpot)}
                        onEnd={() => hub.end(mySpot.id)}
                      />
                      {myState.awaySince.me && <AwayBanner since={myState.awaySince.me} now={now} />}
                      {mySpot.id === 'floor' && side && (
                        <SideHud
                          game={side}
                          st={myState}
                          myZone={sideZone(me.x, me.z)}
                          liveCounts={sideCounts}
                          name={(id) => who(id).name}
                          now={sideNow}
                        />
                      )}
                      {mySpot.id === 'cards' && (
                        <GamePlaceholder
                          spot={mySpot}
                          st={myState}
                          onFinish={() => hub.finish(mySpot.id)}
                          onSomeoneLeaves={() => hub.someoneLeaves(mySpot.id)}
                        />
                      )}
                    </div>
                  )}
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
              {/* Above the dock: your activity's lobby, results or "next round" card (the same for every game) */}
              {mySpot && myState && !inGame && (
                <div className="absolute bottom-[100px] left-1/2 z-20 -translate-x-1/2">
                  {myState.phase === 'gathering' ? (
                    <LobbyCard
                      spot={mySpot}
                      st={myState}
                      who={who}
                      now={now}
                      isHost={myState.hostId === 'me'}
                      onPickGame={(g) => hub.pickGame(mySpot.id, g)}
                      extra={
                        mySpot.id === 'floor' &&
                        (myState.hostId === 'me' ? (
                          <DeckPicker deck={hub.floorDeck} kind={deckKindFor(myState.game.id)} onPick={(d) => hub.pickDeck(d)} />
                        ) : (
                          <p className="truncate px-1 text-xs font-bold">
                            <span className="text-muted-foreground">Deck</span> {hub.floorDeck.emoji} {hub.floorDeck.name}
                          </p>
                        ))
                      }
                      onCall={() => {
                        hub.call(mySpot.id, 'me');
                        toast(`📣 Everyone in ${roomDef.name} got an invite`);
                      }}
                      onStart={() => hub.begin(mySpot.id)}
                      onLeave={() => leaveActivity(mySpot)}
                    />
                  ) : myState.phase === 'results' ? (
                    <ResultsCard
                      st={myState}
                      who={who}
                      {...(mySpot.id === 'floor' && side ? sideResults(side, myState, (id) => who(id).name) : {})}
                      isHost={myState.hostId === 'me'}
                      now={now}
                      onAgain={() => hub.begin(mySpot.id)}
                      onLeave={() => leaveActivity(mySpot)}
                    />
                  ) : (
                    <NextRoundCard st={myState} />
                  )}
                </div>
              )}
              {/* Watch together: the big panel under the strip, or a small player in the corner */}
              {watchingTv && hub.watch.now && (
                <div
                  className={cn(
                    'absolute z-20',
                    watchMini ? 'right-3 bottom-[72px]' : 'top-[60px] left-1/2 -translate-x-1/2 max-sm:top-[180px]',
                  )}
                >
                  <WatchPanel
                    watch={hub.watch}
                    who={(id) => who(id).name}
                    mini={watchMini}
                    onMini={setWatchMini}
                    onPause={(p) => hub.setPaused(p)}
                    onSeek={(sec) => hub.seek(sec)}
                    onSkip={() => hub.next()}
                    onEnded={(id) => hub.watch.now?.id === id && hub.next()}
                    onAdd={(v) => hub.putOn({ ...v, by: 'me' })}
                    onRemove={(i) => hub.removeQueued(i)}
                  />
                </div>
              )}
              {!mySpot && atFreeTv && (
                <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2">
                  {showPutOn ? (
                    <div className="panel flex w-[360px] max-w-[calc(100vw-1.5rem)] flex-col gap-2 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📺</span>
                        <span className="flex-1 text-sm font-black">Put something on</span>
                        <button
                          onClick={() => setPuttingOn(false)}
                          aria-label="Close"
                          className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <AddVideo
                        onAdd={(v) => {
                          hub.putOn({ ...v, by: 'me' });
                          setPuttingOn(false);
                          setWatchMini(false);
                        }}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Everyone in front of the screen watches in sync. YouTube only (Shorts too).
                      </p>
                    </div>
                  ) : (
                    <button onClick={() => setPuttingOn(true)} className="panel rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap">
                      {touch ? 'Tap' : 'Press E'} to put something on 📺
                    </button>
                  )}
                </div>
              )}
              {!mySpot && atFreeFloor && (
                <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <button onClick={() => hub.start('floor', 'me')} className="panel rounded-full px-4 py-2 text-sm font-bold">
                    {touch ? 'Tap' : 'Press E'} to start Pick a Side 🗳️
                  </button>
                </div>
              )}
              {(hint || seated) && !atGameTable && !atFreeFloor && !atFreeTv && (
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
                        ? isGameSeat(hint.seatId)
                          ? `${touch ? 'Tap' : 'Press E'} to ${
                              hub.spots.cards.phase === 'free'
                                ? 'sit and start a game 🃏'
                                : hub.spots.cards.phase === 'playing'
                                  ? 'sit · you’ll play next round'
                                  : `join ${hub.spots.cards.game.name} 🃏`
                            }`
                          : `${touch ? 'Tap' : 'Press E'} to sit`
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
                  <ActivitiesPanel
                    states={hub.spots}
                    roomWideGames={roomDef.roomWideGames}
                    watchTitle={hub.watch.now?.title}
                    hostName={(id) => who(id).name}
                    onGo={goThere}
                  />
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
  dot,
}: {
  icon: typeof Mic;
  label: string;
  onClick: () => void;
  compact?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  /** Something's live (an activity gathering or playing). */
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      className={cn('dock-btn relative', compact && 'min-w-0 px-3')}
    >
      {dot && <span className="absolute top-1.5 right-2 size-2 rounded-full bg-online ring-2 ring-card" />}
      <Icon className="size-5" />
      {!compact && label}
    </button>
  );
}

/** Pick a Side's results: who agreed with you (Would you rather), scores (Quiz), who's left standing. */
function sideResults(g: SideGame, st: SpotState, name: (id: string) => string) {
  const names = (ids: string[]) => list(ids.map((id) => (id === 'me' ? 'You' : name(id))));
  if (g.mode === 'wyr') {
    const best = Object.entries(g.agree).sort(([, a], [, b]) => b - a)[0];
    return {
      title: `🤔 Would you rather · that’s a wrap!${best ? ` ${name(best[0])} thinks most like you` : ''}`,
      medals: false,
      detail: (id: string) => (id === 'me' ? '' : `with you ${g.agree[id] ?? 0}×`),
    };
  }
  const n = g.winners.length;
  const title =
    g.mode === 'quiz'
      ? `🧠 ${n > 1 ? `${names(g.winners)} tie!` : `${names(g.winners)} won!`}`
      : `💀 ${n > 1 ? `${names(g.winners)} made it to the end!` : `${names(g.winners)} ${g.winners[0] === 'me' ? 'are' : 'is'} the last one standing!`}`;
  return {
    title,
    medals: true,
    detail: (id: string) => (st.out.includes(id) && g.mode === 'last' ? 'out' : `${g.scores[id] ?? 0} right`),
  };
}
