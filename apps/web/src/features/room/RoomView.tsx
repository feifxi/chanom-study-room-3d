'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { HeadphoneOff, Headphones, MessageCircle, Mic, MicOff, MonitorUp, Sparkles, Tv, X } from 'lucide-react';
import { toast } from 'sonner';
import { activeMap, mapDefFor, setActiveMap } from '../map/active';
import { areaEdgePoint, areaInnerPoint, inArea, type Area } from '../map/types';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SettingsDialog, type SettingsTab } from '@/components/app/SettingsDialog';
import { setConnection } from '@/lib/connection';
import { DMS, USERS, type Server } from '@/lib/mock';
import type { PlaceRoom } from '@/features/place/model';
import { useMe, useMeAsUser } from '@/features/account/useMe';
import { useWardrobe } from '@/features/shop/useWardrobe';
import { AWAY_EVENT, crowdPeople, useCrowd } from '@/lib/demoCrowd';
import { GUEST_LOOK, loadGuest } from '@/lib/guest';
import { getMyLook, useMyLook } from '@/lib/myLook';
import { useCompactScreen, useTouchScreen, useWideScreen, isTouchScreen } from '@/lib/screen';
import { useNow } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useMusic } from '../music/useMusic';
import type { LocalMotion } from '../room3d/Avatar';
import { readLook, saveLook, useRoomLook } from '@/features/place/roomLook';
import { MapMove } from './MapMove';
import { useDayLight } from '../room3d/dayCycle';
import { Joystick } from '../room3d/Joystick';
import { LabelBoard, LabelLayer, type SpotTag } from '../room3d/labels';
import type { Hint } from '../room3d/LocalController';
import type { LocalPlayerDriver } from '../room3d/LocalPlayerDriver';
import { useFriendIds } from '@/features/friends/useFriends';
import { useMutedForMe } from '@/features/voice/mutedForMe';
import { useVoice } from '@/features/voice/useVoice';
import { planOf } from '@connecta/shared';
import { watchesShare } from '@connecta/shared/maps';
import { MockRoom, type MockPerson } from '../room3d/mockRoom';
import { LiveRoom } from '../room3d/liveRoom';
import type { GameRoom } from '@/features/game/useGame';
import { QUALITY } from '../room3d/quality';
import { RoomCanvas } from '../room3d/RoomCanvas';
import { usePerfOverlay } from '../room3d/perf';
import { PerfOverlay } from '../room3d/PerfOverlay';
import { ZoomControl } from '../room3d/ZoomControl';
import { bubbleMs, npcKey, type Bubble, type Reaction, type Summon } from '../room3d/roomSession';
import { zoneAt, type Zone } from '../room3d/zones';
import { ActivitiesPanel } from './ActivitiesPanel';
import { BuddyMachinePanel, type MachineSummon } from '../npc/BuddyMachinePanel';
import { RoomAdmin } from './RoomAdmin';
import { ActivityHub, type SpotState } from '../activities/hub';
import { ActivityLayer3D } from '../activities/Activity3D';
import { CommonNoticeBanner } from '../common/CommonNoticeBanner';
import { AwayBanner, InviteStack, LobbyCard, NextRoundCard, PlayStrip, ResultsCard, type Who } from '../activities/ActivityHud';
import type { SideGame } from '../activities/pickASide/game';
import { BoardPanel } from '../activities/board/BoardPanel';
import { DeckPicker } from '../activities/pickASide/DeckPicker';
import { deckKindFor, useLocalShelf } from '../activities/pickASide/decks';
import { useRoomDecks } from '../activities/pickASide/useRoomDecks';
import { sidesFor, zoneAt as sideZoneAt } from '../activities/pickASide/game';
import { SideHud, list } from '../activities/pickASide/SideHud';
import { TelephonePanel } from '../activities/telephone/TelephonePanel';
import { ChessPanel } from '../activities/chess/ChessPanel';
import { SlavePanel } from '../activities/slave/SlavePanel';
import { TITLE, type SlaveGame } from '../activities/slave/game';
import { END_TEXT, type ChessGame } from '../activities/chess/game';
import { SPOTS, isGameSeat, spotById, type Spot } from '../activities/spots';
import { AddVideo, SharePanel, ShareScreenButton, WatchPanel } from '../activities/WatchPanel';
import { myShareStream, startMyShare, stopMyShare } from '../activities/screenShare';
import { ChannelOverlay, type ChatTarget } from './ChannelOverlay';
import { PhotoMode } from './PhotoMode';
import { ChatPanel, type RoomLine } from './ChatPanel';
import { PeoplePill, RoomPeople, type RoomPerson, type RoomRole } from './RoomPeople';
import { RoomTools } from './RoomTools';
import { StudyPanel } from './StudyPanel';
import { useClickToWalk } from '@/lib/controls';
import { useHideInvitesWhileFocusing } from '@/features/account/useNotifications';
import { LeaveRoomGuard, LeaveRoomLink } from './LeaveRoom';
import { type Phase } from './usePomodoro';
import { useFocusTimer } from '../focus/useFocusTimer';
import { useRoomToday } from '../focus/useRoomToday';
import { RoomCard } from './RoomCard';
import { MoreMenu } from './MoreMenu';
import { postPhoto } from '@/features/chat/useRoomChat';
import { problem } from '@/features/rooms/useRooms';

/** Scripted crowd: where each mock person sits or walks. */
const PRESETS: Record<string, Omit<MockPerson, 'id' | 'name' | 'look'>> = {
  mai: { seatId: 't00-b0', status: 'focus', subject: 'Calculus', focusMin: 32 },
  jod: { seatId: 'l0-f1', status: 'focus', subject: 'Kuy pawa', focusMin: 9 },
  ploy: {
    path: [
      { x: -6.5, z: 1.3 },
      { x: 6.8, z: 1.3 },
      { x: 6.8, z: 8.0 },
      { x: 0.8, z: 7.2 },
    ],
  },
  ken: { seatId: 'lounge-1' },
  nam: { seatId: 't10-b1', status: 'focus', subject: 'Physics', focusMin: 18 },
  pim: { at: { x: 0.5, z: 3.0 } },
  bow: { seatId: 'fire-0' },
};
const GUEST_COLOR = '#9c8aa0';
/** No keys, clicks or moves for this long: you're away (💤, mic off). */
const AWAY_MS = 10 * 60_000;

/**
 * The room screen, five named parts:
 * - **Room card** (top left): the room itself: invite, room settings, Leave
 * - **My tools** (left rail): study, music, help; only you
 * - **Chat** (bottom left): Room chat, Bubbles and Messages in one panel
 * - **People** (top right): a pill of faces that opens who's here
 * - **Dock** (bottom centre): mic, sound, chat, activities, room tools (owner and mods), and More
 *   (photo mode and your own settings). Screen share only shows once you sit at a desk, because
 *   that's the only place it works.
 */
export default function RoomView({
  server,
  place,
  roomId,
  guestName,
  game,
}: {
  /** The room in the demo's old shape (asServer), until walking in is ported (build step 4) */
  server: Server;
  /** The room from the API; none for Common rooms (still mock, feature 14) */
  place?: PlaceRoom;
  roomId: string;
  guestName: string | null;
  /** The game server's room (build step 4): real people walk here. None: the demo's scripted people */
  game?: GameRoom;
}) {
  const router = useRouter();
  const serverId = server.id;
  const roomDef = server.rooms.find((r) => r.id === roomId) ?? server.rooms[0]!;
  // Screen shares follow the room's plan: 1080p when its owner has Plus
  const shareHeight = planOf(place?.ownerPlus ?? false).shareHeight;
  // `?guest=Name` from the invite page or a Common room
  const [guestAs] = useState(() => guestName ?? null);
  const guest = guestAs !== null;
  // Common rooms are safe for strangers by design (feature 14): text only, for everyone
  const common = server.id === 'public';
  // Your role before the game server says (it's live after: the owner can make you a mod)
  const [demoRole] = useState<RoomRole | undefined>(() => (guestAs !== null || server.id === 'public' ? undefined : server.roles.me));
  // Your own name from your account; the people around you are still mock until walking in is ported (step 4)
  const account = useMeAsUser();
  const { data: meAccount } = useMe();
  // Your Shop pets, for the Buddy Machine
  const { pets } = useWardrobe();
  const myName = guest ? guestAs || 'Guest' : account.name;

  // The owner sets the room's look and time of day for everyone (feature 7); Common rooms use the defaults
  const lookId = server.id === 'public' ? `public:${roomDef.id}` : server.id;
  const look = useRoomLook(lookId, roomDef.mapId);
  // Your predicted position; the driver snaps it to the server's (the map's door) on its first update
  const motion = useRef<LocalMotion>({ x: mapDefFor(roomDef.mapId).spawn.x, z: mapDefFor(roomDef.mapId).spawn.z, yaw: 0, moving: false });
  // Test tools (development only): fill the room up to a crowd of 50 or 100, in 3D and in the people list
  const crowd = useCrowd();
  const room = useMemo(() => {
    // The map first: seats, paths and the scene all come from it (a live map change rebuilds the room)
    const map = setActiveMap(look.mapId);
    // The Test tools' pretend crowd tops the room up to 50 or 100 (you and the server's people aside)
    if (game)
      return new LiveRoom(
        map,
        game,
        { name: myName, look: guest ? (loadGuest()?.look ?? GUEST_LOOK) : getMyLook() },
        crowd ? crowdPeople(Math.max(0, crowd - (game.state?.players?.size ?? 1))) : [],
      );
    const regulars = roomDef.people.length ? roomDef.people : ['ploy', 'ken'];
    const people: MockPerson[] = regulars.map((id) => ({ id, name: USERS[id]!.name, look: USERS[id]!.look, ...PRESETS[id] }));
    if (roomDef.allowGuests && !guest)
      people.push({
        id: 'guest-mint',
        name: 'Mint',
        look: { hair: '#8fdcc0', outfit: '#12a37f', accessory: 'none' },
        at: { x: -8.2, z: 0.8 },
      });
    // A guest walks in with the character they picked on the invite page (client-only, so storage is safe here)
    const extra = crowd ? crowdPeople(Math.max(0, crowd - people.length - 1)) : [];
    return new MockRoom(map, { name: myName, look: guest ? (loadGuest()?.look ?? GUEST_LOOK) : getMyLook() }, people, extra);
  }, [roomDef, guest, myName, crowd, look.mapId, game]);
  useEffect(() => (room instanceof LiveRoom ? room.attach() : undefined), [room]);
  // People coming and going (a real room's are live; the mock's never change)
  const peopleVersion = useSyncExternalStore(room.subscribe, room.getVersion, room.getVersion);
  // The owner switched maps (Room settings): the game server moved everyone; follow it here too
  useEffect(() => {
    if (!game) return;
    const follow = () => {
      const mapId = game.state?.mapId;
      if (mapId && mapId !== readLook(lookId, mapId).mapId) saveLook(lookId, { ...readLook(lookId, mapId), mapId });
    };
    game.onStateChange(follow);
    return () => game.onStateChange.remove(follow);
  }, [game, lookId]);

  const serverRole = game ? room.state.players.get('me')?.role : undefined;
  // In a Common room the Connecta team gets its own actions (feature 14); nobody else runs one
  const myRole: RoomRole | undefined = !game
    ? demoRole
    : common
      ? meAccount?.team
        ? 'Team'
        : undefined
      : serverRole === 'owner'
        ? 'Owner'
        : serverRole === 'mod'
          ? 'Mod'
          : undefined;
  // Friends get their own group in the people list
  const friendIds = useFriendIds();

  // A look saved in Settings → My character swaps your character live for everyone (no rejoin)
  const myLook = useMyLook();
  useEffect(() => {
    const me = room.state.players.get('me');
    if (!me || guest || myLook.version === 0) return;
    // A real room hears it from the API (which checked you own it); a demo room is changed here
    if (!(room instanceof LiveRoom)) me.look = JSON.stringify(myLook.look);
  }, [room, guest, myLook]);

  const driverRef = useRef<LocalPlayerDriver | null>(null);
  // Zoom buttons ask; the canvas applies it on its next frame and reports back (scroll zoom too)
  const zoomRequest = useRef<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const board = useMemo(() => new LabelBoard(), []);
  // After a live map change everyone stands up (seats belong to the old map)
  const arrive = useCallback(() => room.send('stand', {}), [room]);
  const light = useDayLight(look.time === 'clock' ? 'auto' : look.time);
  const [saver, setSaver] = useState(isTouchScreen);
  // Your own settings, opened from the dock's More menu; null = closed
  const [mySettings, setMySettings] = useState<SettingsTab | null>(null);
  const lastSaid = useRef(0);
  const perfOn = usePerfOverlay();
  // A device that can't keep up steps down quietly (no toast: it only worries people; the switch is
  // under More): first battery saver, which keeps 60 fps while you do things, and only if that's
  // still too slow, a steady 30
  const [capped, setCapped] = useState(false);
  const goLighter = useCallback(() => (saver ? setCapped(true) : setSaver(true)), [saver]);
  const quality = QUALITY[!saver ? 'smooth' : capped ? 'steady' : 'saver'];
  const compact = useCompactScreen();
  const wide = useWideScreen();
  const touch = useTouchScreen();
  const now = useNow(1000);

  // Activities (feature 9): one framework for every game; the demo's hub plays the server
  const hub = useMemo(() => {
    const h = new ActivityHub(room, roomDef.roomWideGames, (text) => toast(text));
    // A real room's big screen is the game server's (feature 10)
    if (room instanceof LiveRoom) {
      h.remote = room.watchRemote;
      // …and the spots it runs (chess for now; the others still play here until their games come over)
      h.activities = room.activityRemote;
    }
    return h;
  }, [room, roomDef.roomWideGames]);
  useSyncExternalStore(hub.subscribe, hub.getVersion, hub.getVersion);
  // Pick a Side's timer and "you're on B" need more than once a second
  const sideNow = useNow((hub.side && hub.spots.floor.phase === 'playing') || hub.tel ? 250 : 5000);
  useEffect(() => {
    const id = setInterval(() => hub.tick(Date.now()), 250);
    return () => {
      clearInterval(id);
      hub.dispose();
    };
  }, [hub]);

  const [hint, setHint] = useState<Hint | null>(null);
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});
  const [lines, setLines] = useState<RoomLine[]>([
    { id: 'j', system: true, text: `👋 You walked into ${common ? 'the ' : ''}${roomDef.name}` },
  ]);
  const [findId, setFindId] = useState<string | null>(null);
  const [photo, setPhoto] = useState(false);
  const [activities, setActivities] = useState(false);
  // The Buddy Machine: E at the machine opens it; walking away closes it
  const [machine, setMachine] = useState(false);
  const [machineError, setMachineError] = useState<string | null>(null);
  const [mySummon, setMySummon] = useState<MachineSummon | undefined>();
  const [lastSummon, setLastSummon] = useState<Summon | undefined>();
  /** Floating emotes (hearts over a petted cat) */
  const [reactions, setReactions] = useState<Reaction[]>([]);
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
  // Talk to everyone and the other Room tools are for a room's owner and mods (Common rooms have no voice)
  const canStage = myRole === 'Owner' || myRole === 'Mod';

  const onPhase = useCallback(
    (phase: Phase) => {
      // The mock rooms keep your status here; a real room's game server runs the timer itself
      room.setStatus(phase === 'idle' ? 'idle' : phase, subjectRef.current);
    },
    [room],
  );
  const pomo = useFocusTimer(room, () => subjectRef.current, onPhase);
  // "This room today" in a real room: saved minutes from the API plus the game server's live ones
  const liveToday = useRoomToday(room instanceof LiveRoom ? room : null, place?.id, now);
  // A reload that kept your running round brings its subject back into the box too
  const serverSubject = room instanceof LiveRoom ? (room.state.players.get('me')?.subject ?? '') : '';
  useEffect(() => {
    if (!serverSubject || subjectRef.current) return;
    subjectRef.current = serverSubject;
    setSubject(serverSubject);
  }, [serverSubject]);
  // While a focus timer runs you're studying, maybe in another tab: never away
  const focusing = useRef(false);
  useEffect(() => {
    focusing.current = pomo.phase === 'focus';
  }, [pomo.phase]);
  // Your lo-fi fades while people talk, and while you're watching the big screen
  const watchingTv = hub.mine('me')?.id === 'tv';
  // Each activity spot's floating name (not the whiteboard, a quiet side spot)
  // nor the spot you're playing at (a seat can sit just off its rug)
  const spotTags: SpotTag[] = SPOTS.filter((sp) => sp.built && !sp.freeZone && sp.id !== hub.mine('me')?.id).map((sp) => {
    const st = hub.spots[sp.id];
    const n = st.players.length;
    const phase = st.phase === 'results' ? 'playing' : st.phase;
    const text =
      phase === 'free'
        ? `${sp.emoji} ${sp.activity}`
        : phase === 'gathering'
          ? `${sp.emoji} ${sp.activity} · ${n} waiting`
          : sp.id === 'tv'
            ? `📺 ${hub.watch.share ? 'Screen share' : 'Watch together'} · ${n} watching`
            : `${st.game.emoji} ${st.game.name} · ${n} playing`;
    return { id: sp.id, text, phase, area: sp.area };
  });
  // Your share ended in the hub (you walked away, or Stop sharing): let the capture go too
  const sharingTv = hub.watch.share?.by === 'me';
  const sharedTv = useRef(false);
  useEffect(() => {
    // A real room's shares end through the game server (see below)
    if (game) return;
    if (sharingTv) {
      sharedTv.current = true;
      return;
    }
    stopMyShare();
    if (sharedTv.current) toast('Your screen share on the TV ended');
    sharedTv.current = false;
  }, [sharingTv, game]);

  // A real room's screen shares (step 4 part 4): the game server says who shares where; the picture
  // and sound go over LiveKit to the TV rug or the table only
  const [myShare, setMyShare] = useState<MediaStream | null>(null);
  const myShareWhere = game ? (room.state.players.get('me')?.share ?? '') : '';
  const shareWhereRef = useRef(myShareWhere);
  const sharedLive = useRef(false);
  useEffect(() => {
    shareWhereRef.current = myShareWhere;
    if (myShareWhere) sharedLive.current = true;
    else if (sharedLive.current) {
      // Walked off the rug, stood up, Stop sharing, or the browser's own Stop bar
      sharedLive.current = false;
      stopMyShare();
      setMyShare(null);
      toast('Your screen share ended');
    }
  }, [myShareWhere]);
  const stopLiveShare = () => (room instanceof LiveRoom ? room.setShare('') : undefined);
  const startLiveShare = async (where: 'tv' | 'table') => {
    if (!(room instanceof LiveRoom)) return;
    if (room.state.players.get('me')?.hushed) return void toast('You can’t share your screen in this room right now');
    const got = await startMyShare(stopLiveShare, shareHeight);
    if (!got) return;
    setMyShare(myShareStream());
    room.setShare(where, got.audio);
    if (!got.audio) toast('Sharing without sound. For sound, share a tab and tick “Share tab audio”');
    // Someone else got there first (one share at a time): let the capture go
    setTimeout(() => {
      if (shareWhereRef.current || sharedLive.current) return;
      stopMyShare();
      setMyShare(null);
      toast('Someone else is sharing here right now');
    }, 3000);
  };
  // Photo mode: 📸 by your name while it's open; Share posts to Room chat (members: guests can't post there)
  useEffect(() => {
    if (!(room instanceof LiveRoom) || !photo) return;
    room.setPhoto(true);
    return () => room.setPhoto(false);
  }, [room, photo]);
  // Photos and the whiteboard post to Room chat: members only (guests can't write there)
  const shareToChat = (done: string, failed: string) =>
    room instanceof LiveRoom && !guest && place
      ? async (blob: Blob) => {
          try {
            await postPhoto(place.id, blob);
            toast.success(done);
            return true;
          } catch (error) {
            toast.error(problem(error, failed));
            return false;
          }
        }
      : undefined;
  const sharePhoto = shareToChat('📸 Shared to Room chat', 'Couldn’t share that photo. Try again?');
  const shareBoard = shareToChat('🎨 Board shared to Room chat', 'Couldn’t share the board. Try again?');
  const shareChain = shareToChat('📖 Chain shared to Room chat', 'Couldn’t share that chain. Try again?');
  // Pick a Side's decks: the room's own in a real room, this browser's in the demo
  const roomDecks = useRoomDecks(room instanceof LiveRoom && place ? place.id : null, !!place?.myRole);
  const localDecks = useLocalShelf();
  // The whiteboard: strokes through the game server
  useEffect(() => (room instanceof LiveRoom ? room.connectBoard(hub.board) : undefined), [room, hub]);
  // A round the game server runs let you go
  useEffect(() => {
    if (!(room instanceof LiveRoom)) return;
    return room.onActivityOut(({ why }) =>
      toast(
        why === 'away'
          ? 'You were away from the game for 30 s, so you’re out'
          : why === 'idle'
            ? 'You missed two turns, so you’re out. You can still watch the album'
            : 'You left the game',
      ),
    );
  }, [room]);
  // A link the game server wouldn't put on the big screen
  useEffect(() => {
    if (!(room instanceof LiveRoom)) return;
    return room.onWatchRefused((reason) =>
      toast(
        reason === 'link'
          ? 'That doesn’t look like a YouTube link'
          : reason === 'unavailable'
            ? 'That video can’t play here: it’s private, gone, or its owner turned off embedding'
            : reason === 'full'
              ? 'Up next is full (20). Skip or remove one first'
              : 'Step onto the rug in front of the screen to put something on',
      ),
    );
  }, [room]);
  // Owners and mods: everything off the big screen, from anywhere (a real room)
  const turnOffTv =
    canStage && room instanceof LiveRoom
      ? () => {
          room.watchOff();
          toast('📺 The big screen is off');
        }
      : undefined;

  const shareOnTv = async () => {
    setPuttingOn(false);
    setWatchMini(false);
    if (game) return void startLiveShare('tv');
    const got = await startMyShare(() => hub.stopShare('me'), shareHeight);
    if (!got) return;
    hub.startShare({ by: 'me', audio: got.audio });
    if (!got.audio) toast('Sharing without sound. For sound, share a tab and tick “Share tab audio”');
  };
  // Voice in a real room (the demo fakes who's talking)
  const mutedForMe = useMutedForMe();
  const meNow = game ? room.state.players.get('me') : undefined;
  const hushed = !!meNow?.hushed;
  const voice = useVoice({
    room: room instanceof LiveRoom ? room : null,
    motion,
    mic,
    deaf,
    stage,
    zoneOf: (x, z) => zoneAt(x, z)?.id,
    mutedForMe,
    onMicFailed: (message) => {
      setMic(false);
      toast(`${message}. Check your browser’s mic permission and try again.`);
    },
    share: myShareWhere ? myShare : null,
    watches: (where, p) => watchesShare(activeMap(), where, p),
  });
  const talking = game ? voice.speaking : speaking;
  // A dev-only handle for browser tests: walk somewhere as if clicked, see where you are and the NPCs
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __connecta?: Record<string, unknown> };
    w.__connecta = {
      ...w.__connecta,
      goTo: (x: number, z: number) => driverRef.current?.goTo(x, z, true),
      here: () => ({ ...motion.current }),
      npcs: () => [...room.state.npcs].map(([id, n]) => ({ id, ...n })),
    };
  }, [room]);
  // The server took your mic (a mod, a time out): the switch follows, once
  const mutedByMod = !!meNow?.mutedByMod;
  const [wasHushed, setWasHushed] = useState(hushed);
  if (hushed !== wasHushed) {
    setWasHushed(hushed);
    if (hushed) setMic(false);
  }
  useEffect(() => {
    if (mutedByMod) toast('A mod turned your mic off for everyone in this room');
  }, [mutedByMod]);
  const music = useMusic(talking.size > 0 || watchingTv);
  const [watchMini, setWatchMini] = useState(false);
  const [puttingOn, setPuttingOn] = useState(false);
  const atBoard = hub.mine('me')?.id === 'board';
  // Walking up to the board opens it small in the corner, so passing by never fills your screen; a
  // click makes it big (the board is always on: no E)
  const [boardMini, setBoardMini] = useState(true);
  const [wasAtBoard, setWasAtBoard] = useState(atBoard);
  if (atBoard !== wasAtBoard) {
    setWasAtBoard(atBoard);
    if (atBoard) setBoardMini(true);
  }

  // Stay "connected" while browsing chats elsewhere, like a voice channel
  useEffect(() => {
    if (!guest) setConnection({ serverId, roomId: roomDef.id, micOn: mic && !deaf });
  }, [guest, serverId, roomDef.id, mic, deaf]);

  const say = useCallback((id: string, name: string, text: string) => {
    setBubbles((b) => ({ ...b, [id]: { text, until: Date.now() + bubbleMs(text) } }));
    setLines((l) => [...l, { id: `${Date.now()}-${id}`, by: id, name, text }]);
  }, []);

  // Bubbles in a real room come back from the game server (it decides who hears: private zones, time outs)
  useEffect(() => {
    if (!(room instanceof LiveRoom)) return;
    const offSaid = room.onSaid((id, text) => {
      const p = room.state.players.get(id);
      if (p) say(id, id === 'me' ? myName : p.name, text);
    });
    const offQuiet = room.onQuiet((until) =>
      toast(
        `You’re timed out until ${new Date(until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, so nobody hears you yet`,
      ),
    );
    return () => {
      offSaid();
      offQuiet();
    };
  }, [room, say, myName]);
  // The cats and study buddies are the game server's: the machine's news, their bubbles and hearts
  useEffect(() => {
    if (!(room instanceof LiveRoom)) return;
    return room.onNpc({
      summoned: (m) => {
        const at = Date.now();
        setLastSummon({ ...m, at });
        if (m.bySessionId !== room.voiceId) return;
        setMachineError(null);
        setMySummon({ kind: m.kind, name: m.name, label: m.label, at });
      },
      said: (id, text) => {
        const npc = room.state.npcs.get(id);
        if (!npc) return;
        setBubbles((b) => ({ ...b, [npcKey(id)]: { text, until: Date.now() + bubbleMs(text) } }));
        setLines((l) => [...l, { id: `${Date.now()}-${id}`, name: npc.name, text }]);
      },
      react: (id, emote) => {
        const key = `${Date.now()}-${Math.random()}`;
        setReactions((r) => [...r, { key, target: npcKey(id), emote }]);
        // As long as the float animation (globals.css .emote-float)
        setTimeout(() => setReactions((r) => r.filter((x) => x.key !== key)), 1700);
      },
      note: (text) => setLines((l) => [...l, { id: `note-${Date.now()}-${Math.random()}`, system: true, text }]),
      refused: (reason) => setMachineError(reason),
    });
  }, [room]);
  // Away and Talk to everyone show for everyone (💤 and 📢 by your name); the server lets a focus round win over away
  useEffect(() => {
    if (room instanceof LiveRoom) room.setAway(away);
  }, [room, away]);
  useEffect(() => {
    if (room instanceof LiveRoom) room.setStage(stage);
  }, [room, stage]);
  // No longer the owner or a mod: the server already turned it off, so does your own screen
  if (stage && game && !canStage) setStage(false);

  // A little life: someone talks on voice now and then, someone says hi. Demo people only: in a real
  // room it would put words in real people's mouths
  useEffect(() => {
    if (game) return;
    const ids = [...room.state.players.keys()].filter((id) => id !== 'me');
    const talker = ids.find((id) => id === 'ploy') ?? ids[0];
    const t1 = setTimeout(() => talker && say(talker, room.state.players.get(talker)!.name, 'come sit with us! 🛋️'), 2500);
    const t2 = setInterval(() => setSpeaking((s) => (s.size ? new Set() : new Set(talker ? [talker] : []))), 2600);
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, [room, say, game]);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- peopleVersion says the keys changed
  const ids = useMemo(() => [...room.state.players.keys()], [room, peopleVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- peopleVersion says the keys changed
  const npcIds = useMemo(() => [...room.state.npcs.keys()], [room, peopleVersion]);
  const me = room.state.players.get('me')!;
  // The Buddy Machine stays open while you stand by it (a new cat beside you takes over the E hint)
  const gacha = activeMap().gacha;
  const nearMachine = Math.hypot(me.x - gacha.x, me.z - gacha.z) < gacha.reach + 0.8;
  if (machine && !nearMachine) setMachine(false);
  const atMachine = machine && nearMachine;
  // The demo crowd's list rows come from crowdPeople (statuses, mics); their avatars walk in 3D
  const realPeople: RoomPerson[] = ids
    .filter((id) => !id.startsWith('crowd-'))
    .map((id) => {
      const p = room.state.players.get(id)!;
      const isGuest = game ? p.role === 'guest' : id.startsWith('guest') || (id === 'me' && guest);
      const role = game ? p.role : server.roles[id] === 'Owner' ? 'owner' : server.roles[id] === 'Mod' ? 'mod' : undefined;
      const status =
        (id === 'me' && stage) || (id !== 'me' && p.stage)
          ? '📢 Talking to everyone'
          : (id === 'me' && away) || (id !== 'me' && p.status === 'away')
            ? '💤 Away'
            : p.status === 'focus'
              ? `📖 Focusing${p.subject ? ` · ${p.subject}` : ''} · ${Math.max(1, Math.round((now - p.focusSince) / 60_000))}m`
              : p.status === 'break'
                ? '☕ On a break'
                : p.seatId
                  ? activeMap().seatById.get(p.seatId)?.kind === 'sofa'
                    ? activeMap().seatById.get(p.seatId)?.low
                      ? '🛋️ Lounging'
                      : '🛋️ On the sofa'
                    : '🪑 At a desk'
                  : p.moving
                    ? '🚶 Walking around'
                    : 'Hanging out';
      return {
        id,
        name: p.name,
        color: id === 'me' ? (guest ? GUEST_COLOR : account.color) : (USERS[id]?.color ?? GUEST_COLOR),
        status,
        guest: isGuest,
        you: id === 'me',
        friend: id !== 'me' && (game ? friendIds.has(p.userId) : !!USERS[id]),
        userId: p.userId,
        handle: p.handle,
        // Literals, not the value from server.roles: React Compiler would treat the list as aliasing the server
        role: game && common && p.team ? 'Team' : role === 'owner' ? 'Owner' : role === 'mod' ? 'Mod' : undefined,
        micOn: id === 'me' ? mic && !deaf && !hushed : game ? voice.micOn.has(id) : id === 'mai' || speaking.has(id),
        deafened: id === 'me' ? deaf : game ? p.deaf : id === 'jod',
        speaking: talking.has(id),
        mutedByMod: p.mutedByMod,
        mutedForMe: mutedForMe.has(p.userId),
      };
    });

  const people = crowd ? [...realPeople, ...crowdPeople(Math.max(0, crowd - realPeople.length))] : realPeople;
  const roomName = server.id === 'public' ? roomDef.name : server.name;
  const micIds = new Set(realPeople.filter((p) => p.micOn).map((p) => p.id));
  const seatKind = me.seatId ? activeMap().seatById.get(me.seatId)?.kind : undefined;
  const seated = !!seatKind;
  const atGameTable = isGameSeat(me.seatId);
  // The activity whose seat you're about to sit on (card table, art table), for the E hint
  const hintSpot =
    hint?.kind === 'seat' && isGameSeat(hint.seatId) ? SPOTS.find((sp) => sp.built && sp.seats?.includes(hint.seatId)) : undefined;

  const who = (id: string): Who => {
    const p = room.state.players.get(id);
    return {
      name: p?.name ?? 'Someone',
      color: id === 'me' ? (guest ? GUEST_COLOR : account.color) : (USERS[id]?.color ?? GUEST_COLOR),
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
  // The whiteboard is a free zone, not an activity: drawing there doesn't light the Activities button
  const anyLive = SPOTS.some((s) => !s.freeZone && (hub.spots[s.id].phase === 'gathering' || hub.spots[s.id].phase === 'playing'));
  // Standing spots start with E (tables start when you sit): you're in the ring and it's free
  const floor = spotById('floor');
  const atFreeFloor = !seated && roomDef.roomWideGames && hub.spots.floor.phase === 'free' && inArea(floor.area, me.x, me.z);
  const tv = spotById('tv');
  // The screen is click-only (the orange button), so it shows on the sofa too
  const atFreeTv = !common && hub.spots.tv.phase === 'free' && inArea(tv.area, me.x, me.z);
  const art = spotById('art');
  // A map with an art table seats Draw & Guess: you sit to join (the seat hint), no E on the rug
  const atFreeArt = !art.seats && !seated && hub.spots.art.phase === 'free' && inArea(art.area, me.x, me.z);
  // Walked away from the screen with the "put something on" card open: close it
  const showPutOn = puttingOn && atFreeTv;

  /** "Go there": run to a free seat (then sit yourself), or into the ring (being there is joining). */
  const goThere = (spot: Spot) => {
    setActivities(false);
    const d = driverRef.current;
    if (!d) return;
    if (spot.seats) {
      const free = spot.seats
        .map((id) => activeMap().seatById.get(id)!)
        .filter((st) => room.seatFree(st.id))
        .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
      if (!free) return toast(`${spot.name} is full. Watch from nearby, you’ll see the game on the table.`);
      d.goTo(free.out.x, free.out.z, true);
    } else {
      const to = openPointIn(spot.area, me);
      d.goTo(to.x, to.z, true);
    }
  };
  /** Leave an activity: seats stand you up (the hub does it); out of a ring, you step outside it. */
  const leaveActivity = (spot: Spot) => {
    hub.leave(spot.id, 'me');
    if (!spot.seats) {
      const a = Math.atan2(me.x - spot.area.x, me.z - spot.area.z) || Math.PI;
      const to = areaEdgePoint(spot.area, a, 0.8);
      driverRef.current?.goTo(to.x, to.z);
    }
  };
  // What E does where you're standing. Kept in a ref by an effect that runs on every commit: a single
  // listener reads it, so it never depends on an effect re-running when you arrive somewhere
  const eAction = useRef<(() => void) | null>(null);
  useEffect(() => {
    // Something to sit on, pet or use within reach wins E (the driver handles it). The screen isn't on
    // E at all: it's the orange button, so E at the TV lounge always means the sofa
    eAction.current = hint ? null : atFreeFloor ? () => hub.start('floor', 'me') : atFreeArt ? () => hub.start('art', 'me') : null;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code !== 'KeyE' || e.repeat || (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) return;
      eAction.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const study = (
    <StudyPanel
      roomId={server.id}
      guest={guest}
      pomo={pomo}
      today={room instanceof LiveRoom ? liveToday : null}
      subject={subject}
      onSubject={(s) => {
        subjectRef.current = s;
        setSubject(s);
        if (room instanceof LiveRoom) room.focusSubject(s);
        else if (pomo.phase === 'focus') room.setStatus('focus', s);
      }}
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
    myRole,
    roomId: game ? server.id : undefined,
    // Reports name where it happened: the room, or the Common copy
    place: game ? (common ? roomDef.id : server.id) : undefined,
    bubblesOf: (id: string) =>
      lines
        .filter((l) => l.by === id && !l.system)
        .slice(-10)
        .map((l) => l.text),
    youGuest: guest,
    onMuteForEveryone: room instanceof LiveRoom ? (p: RoomPerson, on: boolean) => room.muteForEveryone(p.id, on) : undefined,
    onMessage: (p: RoomPerson) => {
      setSheet(false);
      // A real person: their chat by @handle (the Messages tab opens it, made on first open if you're friends)
      if (game) return p.handle ? setChatTarget({ kind: 'dm', id: p.handle }) : undefined;
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
      onSay={(text) => {
        // Common rooms: slow mode for everyone (one bubble every 3 s), since nobody's there to moderate
        if (common && Date.now() - lastSaid.current < 3000) return toast('Slow mode: one bubble every 3 seconds');
        lastSaid.current = Date.now();
        if (room instanceof LiveRoom) room.say(text);
        else say('me', myName, text);
      }}
      onTyping={(t) => room.setTyping(t)}
      onExpand={(t) => {
        setSheet(false);
        setChatTarget(t);
      }}
      onClose={onClose}
      className={className}
    />
  );
  // Below 1080 px the dock can't sit beside the chat panel, so the panel sits above the dock instead
  // (shorter if the screen is short too); see the dock's spacers
  const chat = compact
    ? chatEl('h-[40dvh] border-0 shadow-none')
    : chatEl('h-[360px] w-[364px] max-[1079px]:h-[min(360px,calc(100dvh-400px))]', () => setChatOpen(false));
  // Watching big (theater): the player owns the screen
  const theater = watchingTv && !!(hub.watch.now || hub.watch.share) && !watchMini && !photo;
  // The whiteboard big works the same way
  const boardTheater = atBoard && !boardMini && !photo;
  // Draw & Guess plays in a panel, so while you play it's a theater too (no corner: the room comes
  // back between rounds); Pick a Side is played by walking, so it keeps the room
  const drawTheater = !!mySpot && mySpot.id === 'art' && !!hub.tel && inGame && !photo;
  // Chess: the players' board is a theater while they play; people standing by the table watch on a
  // small board in the corner, and a click makes it big
  const chessSpot = spotById('chess');
  const chessPlayer = mySpot?.id === 'chess' && inGame && !!hub.chess;
  const chessWatching =
    !mySpot && !!hub.chess && hub.spots.chess.phase === 'playing' && chessSpot.built && inArea(chessSpot.area, me.x, me.z);
  const [chessMini, setChessMini] = useState(true);
  const [wasWatchingChess, setWasWatchingChess] = useState(chessWatching);
  if (chessWatching !== wasWatchingChess) {
    setWasWatchingChess(chessWatching);
    if (chessWatching) setChessMini(true);
  }
  const chessTheater = !photo && (chessPlayer || (chessWatching && !chessMini));
  // Slave: the table and your hand are a theater while you play (the room comes back between games)
  // Slave's titles over the players' heads while the group plays on (the King's crown, the Slave's broom)
  const slaveBadges: Record<string, string> =
    hub.slave && hub.spots.cards.phase !== 'free'
      ? Object.fromEntries(
          Object.entries(hub.slave.titles)
            .filter(([id, t]) => (t === 'king' || t === 'slave') && hub.spots.cards.players.includes(id))
            .map(([id, t]) => [id, TITLE[t].emoji]),
        )
      : {};
  const slavePlayer = mySpot?.id === 'cards' && inGame && !!hub.slave;
  // Standing by the card table while a game is on (not in it): watch, like chess
  const cardsSpot = spotById('cards');
  const slaveWatching =
    !mySpot && !!hub.slave && hub.spots.cards.phase === 'playing' && cardsSpot.built && inArea(cardsSpot.area, me.x, me.z);
  const [slaveMini, setSlaveMini] = useState(true);
  const [wasWatchingSlave, setWasWatchingSlave] = useState(slaveWatching);
  if (slaveWatching !== wasWatchingSlave) {
    setWasWatchingSlave(slaveWatching);
    if (slaveWatching) setSlaveMini(true);
  }
  const slaveTheater = !photo && (slavePlayer || (slaveWatching && !slaveMini));
  // A desk share at your table (a real room): the same panel as the TV's, big until you shrink it
  const myTable = me.seatId ? activeMap().seatById.get(me.seatId)?.tableId : undefined;
  const deskSharer = game && myTable ? [...room.state.players].find(([, p]) => p.share === `table:${myTable}`) : undefined;
  const deskBy = deskSharer?.[0];
  const [deskMini, setDeskMini] = useState(false);
  const [wasDeskBy, setWasDeskBy] = useState(deskBy);
  if (deskBy !== wasDeskBy) {
    setWasDeskBy(deskBy);
    if (deskBy) setDeskMini(false);
  }
  const deskTheater = !!deskBy && !deskMini && !photo;
  const bigView = theater || boardTheater || drawTheater || chessTheater || slaveTheater || deskTheater;
  const toggleChat = () => {
    if (compact) setSheet(true);
    else setChatOpen(!chatOpen);
  };
  // Every theater (Watch together, the whiteboard, Draw & Guess, chess) opens with the chat closed, so
  // the stage is as big as it gets; Chat opens it beside the panel, which moves over. Once per visit:
  // reopening it is your choice.
  const chatClosedFor = useRef<string | null>(null);
  const drawingStage = theater
    ? 'tv'
    : deskTheater
      ? 'desk'
      : boardTheater
        ? 'board'
        : drawTheater
          ? 'art'
          : chessTheater
            ? 'chess'
            : slaveTheater
              ? 'cards'
              : null;
  useEffect(() => {
    if (!mySpot && !chessWatching && !slaveWatching) chatClosedFor.current = null;
  }, [mySpot, chessWatching, slaveWatching]);
  useEffect(() => {
    if (!drawingStage || chatClosedFor.current === drawingStage) return;
    chatClosedFor.current = drawingStage;
    setChatOpen(false);
  }, [drawingStage]);
  const chatPressed = compact ? sheet : chatOpen;

  // The one real way out; links elsewhere in the room come through the LeaveRoomGuard dialog first
  const leave = (href?: string) => {
    if (pomo.phase === 'focus') pomo.stop();
    setConnection(null);
    music.pause();
    // Guests have no Home: a Common room sends them back to Discover, an invite to the front page
    router.push(href ?? (guest ? (common ? '/discover' : '/') : '/home'));
  };

  const [clickToWalk, setClickToWalk] = useClickToWalk();
  const dock = (className?: string) => (
    // data-keep-open: in theater the dock works without shrinking the player
    <nav className={cn('dock flex items-center gap-1.5 p-2', className)} aria-label="Controls" data-keep-open>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <button
              onClick={() => (deaf ? (setDeaf(false), setMic(true)) : setMic(!mic))}
              disabled={common || (game ? hushed : guest)}
              aria-pressed={mic && !deaf}
              className={cn('dock-btn', compact && 'min-w-0 px-3', mic && !deaf ? '!bg-[#2f8f62]' : '!bg-[#7a3442]')}
            >
              {mic && !deaf ? <Mic className="size-5" /> : <MicOff className="size-5" />}
              {!compact && (mic && !deaf ? 'Mic on' : 'Mic off')}
            </button>
          </span>
        </TooltipTrigger>
        {common ? (
          <TooltipContent>Common rooms are text only: no voice, pictures or videos</TooltipContent>
        ) : game ? (
          hushed && (
            <TooltipContent>
              {meNow?.mutedByMod
                ? 'A mod turned your mic off for everyone'
                : guest
                  ? 'Guests can’t use voice in this room'
                  : 'You’re timed out, so your mic is off for now'}
            </TooltipContent>
          )
        ) : (
          guest && <TooltipContent>Guests can’t use voice in this room</TooltipContent>
        )}
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
      <DockBtn icon={MessageCircle} label="Chat" compact={compact} pressed={chatPressed} onClick={toggleChat} />
      <DockBtn
        icon={Sparkles}
        label="Activities"
        compact={compact}
        pressed={activities}
        dot={anyLive}
        onClick={() => {
          // Activities opens over the stage, so the big player steps aside to the corner
          if (theater) setWatchMini(true);
          if (deskTheater) setDeskMini(true);
          if (boardTheater) setBoardMini(true);
          if (chessWatching) setChessMini(true);
          if (slaveWatching) setSlaveMini(true);
          setActivities(!activities);
        }}
      />
      {/* Owner and mods only: their tools stay off everyone else's dock */}
      {canStage && (
        <>
          <span className="mx-0.5 h-7 w-px bg-white/20" />
          <RoomAdmin
            compact={compact}
            onAir={stage}
            onToggleAir={() => {
              if (!stage) {
                setDeaf(false);
                setMic(true);
                toast('📢 Everyone in the room hears you now, wherever they are');
              }
              setStage(!stage);
            }}
          />
        </>
      )}
      {/* Now-and-then things and your own settings, so the dock stays short */}
      <MoreMenu
        compact={compact}
        onPhoto={() => setPhoto(true)}
        onMySettings={guest ? undefined : setMySettings}
        saver={saver}
        onSaver={(on) => {
          // Your own choice starts fresh: a capped device gets measured again
          setSaver(on);
          setCapped(false);
        }}
        clickToWalk={clickToWalk}
        onClickToWalk={setClickToWalk}
      />
    </nav>
  );
  return (
    <LeaveRoomGuard
      roomName={server.name}
      focusing={pomo.phase === 'focus'}
      onLeave={leave}
      fallback={guest ? (common ? '/discover' : '/') : '/home'}
    >
      <div
        className="fixed inset-0 flex overflow-hidden transition-[background] duration-1000"
        style={{ background: `linear-gradient(180deg, ${light.background[0]}, ${light.background[1]})` }}
      >
        {/* The 3D view */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {game && common && <CommonNoticeBanner game={game} />}
          <RoomCanvas
            key={look.mapId}
            room={room}
            myLookVersion={guest ? 0 : myLook.version}
            myLook={guest || !myLook.version ? undefined : JSON.stringify(myLook.look)}
            motion={motion}
            board={board}
            light={light}
            quality={quality}
            bubbles={bubbles}
            findId={findId}
            onHint={setHint}
            onOpenMachine={() => {
              setActivities(false);
              setMachine(true);
            }}
            lastSummon={lastSummon}
            driverRef={driverRef}
            zoomRequest={zoomRequest}
            onZoom={setZoom}
            onSlow={capped ? undefined : goLighter}
          >
            <ActivityLayer3D
              spots={hub.spots}
              watch={hub.watch}
              shareName={hub.watch.share && (hub.watch.share.by === 'me' ? 'You' : who(hub.watch.share.by).name)}
              side={hub.side}
              board={hub.board}
              motion={motion}
            />
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
                speaking: talking,
                micEnabled: micIds,
                deafened: new Set(realPeople.filter((p) => p.deafened).map((p) => p.id)),
                sharing: game
                  ? new Set(ids.filter((id) => room.state.players.get(id)?.share))
                  : sharing && seated
                    ? new Set(['me'])
                    : new Set(),
                away: new Set(ids.filter((id) => (id === 'me' ? away : room.state.players.get(id)?.status === 'away'))),
                stage: new Set(ids.filter((id) => (id === 'me' ? stage : room.state.players.get(id)?.stage))),
              }}
              clockOffset={0}
              npcIds={npcIds}
              npcs={room.state.npcs}
              reactions={reactions}
              spotTags={spotTags}
              badges={slaveBadges}
            />
          </div>

          {photo ? (
            <PhotoMode roomName={roomDef.name} onClose={() => setPhoto(false)} onShare={sharePhoto} />
          ) : (
            <div>
              {/* Room card, top left: the room itself (invite, room settings, Leave) */}
              {!bigView && (
                <RoomCard
                  server={server}
                  place={place}
                  room={roomDef}
                  here={people.length}
                  guest={guest}
                  onLeave={() => leave()}
                  className={cn('absolute top-3 left-3 z-30', compact && 'right-3')}
                />
              )}

              {/* Top right: who's here, folded into a pill of faces; guests get a way in */}
              <div className={cn('absolute right-3 flex items-start gap-2', compact ? 'top-[80px]' : 'top-3', bigView && 'hidden')}>
                {guest && (
                  <LeaveRoomLink
                    href="/login?from=guest"
                    className="panel px-3 py-2 text-xs font-extrabold text-primary hover:bg-secondary"
                  >
                    {common ? 'Make an account ✨' : `Join ${server.name} ✨`}
                  </LeaveRoomLink>
                )}
                {!compact && <PeoplePill {...peopleProps} />}
              </div>
              <div className={cn('absolute right-3 z-20', compact ? 'top-[132px]' : 'top-[72px]', bigView && 'hidden')}>
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
                className={cn('absolute left-3 z-20', compact ? 'top-[132px]' : 'top-[88px]', bigView && 'hidden')}
              />
              {mySettings && <SettingsDialog open onOpenChange={(o) => !o && setMySettings(null)} initialTab={mySettings} />}
              {/* Chat: beside a theater, the panel makes room for it. Beside the big player or board, typing
                  in it mustn't count as a press outside them (that would shrink them to the corner) */}
              {!compact && chatOpen && (
                <div
                  className="absolute bottom-3 left-3 z-20 max-[1079px]:bottom-[92px]"
                  data-keep-open={theater || boardTheater || deskTheater || undefined}
                >
                  {chat}
                </div>
              )}

              {/* Theater: the room dims behind the big player; a press on it shrinks the player */}
              {bigView && <div className="absolute inset-0 z-[15] bg-[#120c18]/60" aria-hidden />}

              <MapMove lookId={lookId} mapId={look.mapId} onArrive={arrive} />

              {perfOn && (
                <div className={cn('pointer-events-none absolute left-[84px] z-30', compact ? 'top-[132px]' : 'top-[88px]')}>
                  <PerfOverlay mode={!saver ? 'smooth' : capped ? 'battery saver, capped' : 'battery saver'} />
                </div>
              )}

              {/* Top centre: you're in a private zone, or talking to everyone */}
              {(zone || stage || inGame) && (
                <div
                  className={cn(
                    'pointer-events-none absolute top-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5',
                    // Phones: under the room card, or at the very top in theater (the card steps aside)
                    !bigView && 'max-sm:top-[136px]',
                  )}
                  data-keep-open
                >
                  {mySpot && myState && inGame && (
                    <div className="pointer-events-auto flex flex-col items-center gap-1.5">
                      {/* Drop-in spots (the whiteboard, the TV) have no strip: being there is taking part, and
                          you stop by walking away. Games keep it: leaving mid-round is a loss, so it's a button */}
                      {mySpot.kind === 'rounds' && (
                        <PlayStrip
                          st={myState}
                          isHost={myState.hostId === 'me'}
                          onLeave={() => leaveActivity(mySpot)}
                          onEnd={() => hub.end(mySpot.id)}
                        />
                      )}
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
                      {mySpot.id === 'art' && hub.tel && (
                        <TelephonePanel
                          hub={hub}
                          game={hub.tel}
                          st={myState}
                          onShare={shareChain}
                          name={(id) => who(id).name}
                          now={sideNow}
                          // As big as the stage allows (height-limited on laptops: the stage less the panel's
                          // header, prompt and tools row). With the chat panel open (12 px in, 364 wide) it
                          // centres in the space to the right of it instead of keeping both sides clear
                          width={`min(1200px, calc(100vw - ${wide && chatOpen ? 400 : 24}px), calc((100dvh - 272px) * 16 / 9 + 28px))`}
                          shift={wide && chatOpen ? 188 : 0}
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
                          <DeckPicker
                            deck={hub.floorDeck}
                            kind={deckKindFor(myState.game.id)}
                            onPick={(d) => hub.pickDeck(d)}
                            shelf={room instanceof LiveRoom ? roomDecks : localDecks}
                          />
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
                      {...(mySpot.id === 'art' ? { title: '✏️ That’s a wrap!', medals: false } : {})}
                      {...(mySpot.id === 'chess' && hub.chess ? chessResults(hub.chess, (id) => who(id).name) : {})}
                      {...(mySpot.id === 'cards' && hub.slave ? slaveResults(hub.slave, (id) => who(id).name) : {})}
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
              {watchingTv && (hub.watch.now || hub.watch.share) && (
                <div
                  className={cn(
                    'absolute z-20',
                    // Theater: the whole stage above the dock, like the board (right of the chat when it's open)
                    watchMini
                      ? 'right-3 bottom-[72px]'
                      : cn('top-3 right-3 bottom-[84px] flex justify-center', wide && chatOpen ? 'left-[400px]' : 'left-3'),
                  )}
                >
                  <WatchPanel
                    watch={hub.watch}
                    who={(id) => who(id).name}
                    watchers={hub.spots.tv.players.length}
                    mini={watchMini}
                    onMini={setWatchMini}
                    onPause={(p) => hub.setPaused(p)}
                    onSeek={(sec) => hub.seek(sec)}
                    onSkip={() => hub.next()}
                    onEnded={(id) => hub.ended(id)}
                    onAdd={(v) => hub.putOn({ ...v, by: 'me' })}
                    onRemove={(i) => hub.removeQueued(i)}
                    onShare={() => void shareOnTv()}
                    onStopShare={() => (game ? stopLiveShare() : hub.stopShare('me'))}
                    shareStream={game ? (by) => voice.screens.get(by) ?? null : undefined}
                    deaf={deaf}
                    onTurnOff={turnOffTv}
                  />
                </div>
              )}
              {/* A desk share at your table: big over the room, or small in the corner */}
              {deskSharer && deskBy && (
                <div
                  className={cn(
                    'absolute z-20',
                    deskMini
                      ? 'right-3 bottom-[72px]'
                      : cn('top-3 right-3 bottom-[84px] flex justify-center', wide && chatOpen ? 'left-[400px]' : 'left-3'),
                  )}
                >
                  <SharePanel
                    share={{ by: deskBy, audio: deskSharer[1].shareAudio }}
                    name={who(deskBy).name}
                    stream={voice.screens.get(deskBy) ?? null}
                    deaf={deaf}
                    mini={deskMini}
                    onMini={setDeskMini}
                    onStop={stopLiveShare}
                  />
                </div>
              )}
              {/* Slave: the table and your hand under the strip (a theater), or a watcher's view in the corner */}
              {(slavePlayer || slaveWatching) && hub.slave && (
                <div
                  className={cn(
                    'absolute z-20',
                    slaveTheater
                      ? cn(
                          'right-3 bottom-[84px] flex justify-center',
                          slavePlayer ? 'top-[56px]' : 'top-3',
                          wide && chatOpen ? 'left-[400px]' : 'left-3',
                        )
                      : 'right-3 bottom-[72px]',
                  )}
                  data-keep-open={slavePlayer || undefined}
                >
                  <SlavePanel
                    game={hub.slave}
                    who={who}
                    now={now}
                    mini={!slaveTheater}
                    onMini={setSlaveMini}
                    onPlay={(cards) => hub.slavePlay('me', cards)}
                    onPass={() => hub.slavePass('me')}
                    onGiveBack={(cards) => hub.slaveGiveBack('me', cards)}
                  />
                </div>
              )}
              {/* Chess: the players' board under the strip (a theater), or a watcher's board in the corner */}
              {(chessPlayer || chessWatching) && hub.chess && (
                <div
                  className={cn(
                    'absolute z-20',
                    chessTheater
                      ? cn(
                          'right-3 bottom-[84px] flex justify-center',
                          chessPlayer ? 'top-[56px]' : 'top-3',
                          wide && chatOpen ? 'left-[400px]' : 'left-3',
                        )
                      : 'right-3 bottom-[72px]',
                  )}
                  data-keep-open={chessPlayer || undefined}
                >
                  <ChessPanel
                    game={hub.chess}
                    who={who}
                    mini={!chessTheater}
                    onMini={setChessMini}
                    onMove={(from, to, promotion) => hub.chessMove('me', from, to, promotion)}
                    onResign={() => hub.chessResign('me')}
                    onOfferDraw={() => hub.chessOfferDraw('me')}
                    onAnswerDraw={(accept) => hub.chessAnswerDraw('me', accept)}
                  />
                </div>
              )}
              {/* Whiteboard: the big drawing panel under the strip, or a small board in the corner */}
              {atBoard && myState && (
                <div
                  className={cn(
                    'absolute z-20',
                    // Theater: the whole stage above the dock (the board has no top strip)
                    // With the chat open beside it (wide screens), the stage starts right of the chat
                    boardMini
                      ? 'right-3 bottom-[72px]'
                      : cn('top-3 right-3 bottom-[84px] flex justify-center', wide && chatOpen ? 'left-[400px]' : 'left-3'),
                  )}
                >
                  <BoardPanel
                    board={hub.board}
                    people={myState.players}
                    name={(id) => who(id).name}
                    mini={boardMini}
                    onMini={setBoardMini}
                    onShare={shareBoard}
                  />
                </div>
              )}
              {!mySpot && atFreeTv && (
                // On phones the open card sits above the joystick
                <div className={cn('absolute left-1/2 -translate-x-1/2', showPutOn && touch ? 'bottom-[220px]' : 'bottom-[100px]')}>
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
                      <ShareScreenButton onShare={() => void shareOnTv()} />
                      <p className="text-[11px] text-muted-foreground">
                        Everyone in front of the screen watches in sync: a YouTube link (Shorts too) or your screen, with its sound.
                      </p>
                    </div>
                  ) : (
                    // Click only, anywhere in the zone (E sits on the sofa): the orange of the other click-only
                    // actions (Share screen to table); above the seat's hint when one shows
                    <button
                      onClick={() => setPuttingOn(true)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-extrabold whitespace-nowrap text-primary-foreground shadow-soft hover:bg-primary-ink',
                        (hint || seated) && '-translate-y-12',
                      )}
                    >
                      <Tv className="size-4" />
                      Put something on
                    </button>
                  )}
                </div>
              )}
              {!mySpot && atFreeFloor && !hint && (
                <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <button onClick={() => hub.start('floor', 'me')} className="panel rounded-full px-4 py-2 text-sm font-bold">
                    {touch ? 'Tap' : 'Press E'} to start Pick a Side 🗳️
                  </button>
                </div>
              )}
              {!mySpot && atFreeArt && !hint && (
                <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <button onClick={() => hub.start('art', 'me')} className="panel rounded-full px-4 py-2 text-sm font-bold">
                    {touch ? 'Tap' : 'Press E'} to start a game at the art corner 🖌️
                  </button>
                </div>
              )}
              {(hint || seated) &&
                !bigView &&
                !atGameTable &&
                !showPutOn &&
                !(atMachine && hint?.kind === 'machine') &&
                (hint || (!atFreeFloor && !atFreeArt)) && (
                  <div className="absolute bottom-[100px] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
                    <button
                      onClick={() => {
                        if (hint?.kind === 'machine') return setMachine(true);
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
                          ? hintSpot
                            ? `${touch ? 'Tap' : 'Press E'} to ${
                                hub.spots[hintSpot.id].phase === 'free'
                                  ? `sit and start a game ${hintSpot.emoji}`
                                  : hub.spots[hintSpot.id].phase === 'playing'
                                    ? 'sit · you’ll play next round'
                                    : `join ${hub.spots[hintSpot.id].game.name} ${hintSpot.emoji}`
                              }`
                            : `${touch ? 'Tap' : 'Press E'} to sit`
                          : hint?.kind === 'pet'
                            ? `${touch ? 'Tap' : 'Press E'} to pet ${hint.name} 🐾`
                            : `${touch ? 'Tap' : 'Press E'}: Buddy Machine`}
                    </button>
                    {seated && seatKind !== 'sofa' && !guest && !common && !compact && (
                      <button
                        onClick={() => {
                          if (game) return void (myShareWhere ? stopLiveShare() : startLiveShare('table'));
                          setSharing(!sharing);
                          toast(sharing ? 'Stopped sharing' : 'Sharing your screen with your table 🖥️');
                        }}
                        // One share per table: someone else's is on
                        disabled={!!deskBy && deskBy !== 'me'}
                        title={deskBy && deskBy !== 'me' ? `${who(deskBy).name} is sharing with your table` : undefined}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold shadow-soft disabled:opacity-50',
                          (game ? myShareWhere : sharing)
                            ? 'bg-destructive text-white'
                            : 'bg-primary text-primary-foreground hover:bg-primary-ink',
                        )}
                      >
                        <MonitorUp className="size-4" /> {(game ? myShareWhere : sharing) ? 'Stop sharing' : 'Share screen to table'}
                      </button>
                    )}
                  </div>
                )}

              {/* Beside the machine, not over it: the capsule rolling out is the fun part */}
              {atMachine && (
                <div className={cn('absolute z-20', compact ? 'inset-x-3 top-[132px] flex justify-center' : 'right-3 bottom-[96px]')}>
                  <BuddyMachinePanel
                    npcs={[...room.state.npcs.entries()]}
                    lastSummon={mySummon}
                    error={machineError}
                    onSummon={(kind) => {
                      const got = room.summon(kind);
                      // A real room answers through the game server (see room.onNpc above)
                      if (got === null) return;
                      if (typeof got === 'string') return setMachineError(got);
                      setMachineError(null);
                      const at = Date.now();
                      setMySummon({ kind, ...got, at });
                      setLastSummon({ npcId: '', kind, ...got, bySessionId: 'me', byName: myName, at });
                      setLines((l) => [...l, { id: `summon-${at}`, system: true, text: `✨ You summoned ${got.name} the ${got.label}` }]);
                    }}
                    onGoodbye={(id) => {
                      const n = room.state.npcs.get(id);
                      room.goodbye(id);
                      if (n && !game) setLines((l) => [...l, { id: `bye-${Date.now()}`, system: true, text: `👋 ${n.name} went home` }]);
                    }}
                    onClose={() => setMachine(false)}
                    pets={pets}
                    myUserId={room.state.players.get('me')?.userId}
                    onSummonPet={room instanceof LiveRoom ? (item) => room.summonPet(item) : undefined}
                  />
                </div>
              )}
              {activities && (
                <div className="absolute bottom-[96px] left-1/2 z-20 -translate-x-1/2">
                  <ActivitiesPanel
                    states={hub.spots}
                    roomWideGames={roomDef.roomWideGames}
                    common={common}
                    watchTitle={hub.watch.share ? `${who(hub.watch.share.by).name}’s screen` : hub.watch.now?.title}
                    hostName={(id) => who(id).name}
                    onGo={goThere}
                    onTurnOffTv={turnOffTv}
                  />
                </div>
              )}

              {/* Centred, but never under the open chat panel: the left spacer is the panel's width and
                  never shrinks, the right one mirrors it and gives way first, so on a laptop the dock
                  slides right instead of under the chat (narrower screens lift the chat instead) */}
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex justify-center">
                {!compact && chatOpen && <span className="hidden w-[376px] flex-none min-[1080px]:block" />}
                {dock('pointer-events-auto flex-none')}
                {!compact && chatOpen && <span className="hidden w-[376px] min-w-0 min-[1080px]:block" />}
              </div>

              {/* Bottom right: zoom (V1). Touch screens pinch, and the tablet joystick has this corner */}
              {!touch && !bigView && (
                <ZoomControl percent={zoom} onZoom={(z) => (zoomRequest.current = z)} className="absolute right-3 bottom-3" />
              )}

              {touch && !bigView && (
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

/** Slave's results: everyone's new title, the King first. */
function slaveResults(g: SlaveGame, name: (id: string) => string) {
  const king = g.finished[0];
  return {
    title: `👑 ${king === 'me' ? 'You’re King! 🎉' : `${name(king ?? '')} is King!`}`,
    medals: false,
    detail: (id: string) => {
      const t = g.titles[id];
      return t ? `${TITLE[t].emoji} ${TITLE[t].name}` : '';
    },
  };
}

/** Chess's results: who won and how, or how it was drawn; each player's colour. */
function chessResults(g: ChessGame, name: (id: string) => string) {
  const end = g.end;
  const winner = end?.winner;
  const title = !end
    ? '♟️ Game over'
    : winner
      ? `♟️ ${winner === 'me' ? 'You won' : `${name(winner)} won`} ${end.why === 'left' ? '· the other player left' : END_TEXT[end.why]}${winner === 'me' ? ' 🎉' : ''}`
      : `🤝 ${END_TEXT[end.why]}`;
  return { title, medals: !!winner, detail: (id: string) => (id === g.white ? 'White' : 'Black') };
}

/** Pick a Side's results: who agreed with you (Would you rather) or scores (Quiz). */
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
  // Alone: no winner, just how you did
  if (g.solo) {
    const right = g.scores.me ?? 0;
    return {
      title: `🧠 Quiz · you got ${right} of ${g.questions.length} right!`,
      medals: false,
      detail: () => '',
    };
  }
  const n = g.winners.length;
  const title = `🧠 ${n > 1 ? `${names(g.winners)} tie!` : `${names(g.winners)} won!`}`;
  return {
    title,
    medals: true,
    detail: (id: string) => `${g.scores[id] ?? 0} right`,
  };
}

/**
 * Somewhere open on a rug, on your side of it, that you can walk to. Not simply the middle: furniture
 * can stand there (the TV lounge's sofa), and a path to a blocked point stops wherever it can,
 * sometimes off the rug.
 */
function openPointIn(area: Area, from: { x: number; z: number }) {
  const nav = activeMap().nav;
  const a = Math.atan2(from.x - area.x, from.z - area.z);
  for (const da of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6])
    for (const f of [0.4, 0.6, 0.25, 0.75, 0.1]) {
      const p = areaInnerPoint(area, a + da, f);
      if (nav.isWalkable(p) && nav.findPath(from, p).length) return p;
    }
  return areaInnerPoint(area, a, 0.4);
}
