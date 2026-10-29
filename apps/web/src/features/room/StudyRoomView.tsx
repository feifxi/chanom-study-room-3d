'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GACHA_MACHINE, SEAT_BY_ID, SPAWN } from '@study/shared';
import { loadProfile } from '@/lib/profile';
import { ChatPanel } from '../chat/ChatPanel';
import { useMusic } from '../music/useMusic';
import { shouldAskFeedback } from '../feedback/askPolicy';
import { LeaveFeedback } from '../feedback/LeaveFeedback';
import { FocusPanel } from '../focus/FocusPanel';
import { BuddyMachinePanel } from '../npc/BuddyMachinePanel';
import { GachaMachine } from '../npc/GachaMachine';
import { NpcAvatar } from '../npc/NpcAvatar';
import { ScreenShareTextures, TableScreens } from '../voice/ScreenShares';
import { useVoice } from '../voice/useVoice';
import { Avatar, type LocalMotion } from './Avatar';
import { useDayLight, useThemeMode } from './dayCycle';
import { FrameDriver } from './FrameDriver';
import { QUALITY, useQualityMode } from './quality';
import { StaticShadows } from './StaticShadows';
import { Dock } from './hud/Dock';
import { RoomHeader } from './hud/RoomHeader';
import { TopRight } from './hud/TopRight';
import { ZOOM, ZoomBridge, ZoomControl } from './hud/ZoomControl';
import { LabelBoard, LabelLayer, LabelProjector } from './labels';
import { Library } from './Library';
import { LocalController, type Hint } from './LocalController';
import { useMySeat, useRoomLabel } from './roomHooks';
import { RoomSidebar } from './RoomSidebar';
import { npcKey } from './roomSession';
import { useStudyRoom } from './useStudyRoom';

export default function StudyRoomView({ roomId }: { roomId: string | null }) {
  const session = useStudyRoom(roomId, joinOptions);
  const { room, status, error, playerIds, npcIds, chat, bubbles, reactions, summons, summonError, clockOffset } = session;
  const motion = useRef<LocalMotion>({ x: SPAWN.x, z: SPAWN.z, yaw: 0, moving: false });
  const [hint, setHint] = useState<Hint | null>(null);
  const [machineOpen, setMachineOpen] = useState(false);
  const openMachine = useCallback(() => setMachineOpen(true), []);
  const [chatOpen, setChatOpen] = useState(true);
  const openChat = useCallback(() => setChatOpen(true), []);
  const [zoomPercent, setZoomPercent] = useState(100);
  const zoomRequest = useRef<number | null>(null);
  const [themeMode, setThemeMode] = useThemeMode();
  const light = useDayLight(themeMode);
  // Quality: smooth by default; battery saver when chosen, or when this device can't keep up
  const [qualityMode, setQualityMode] = useQualityMode();
  const [struggling, setStruggling] = useState(false);
  const onSlowFrames = useCallback(() => setStruggling(true), []);
  const quality = QUALITY[qualityMode === 'saver' || struggling ? 'saver' : 'smooth'];
  const mySeat = useMySeat(room);
  const label = useRoomLabel(room?.roomId);
  const board = useMemo(() => new LabelBoard(), []);
  const voice = useVoice(room, motion);
  const router = useRouter();
  const [leaveContext, setLeaveContext] = useState<LeaveContext | null>(null);
  const joinedAt = useRef(0);
  const usedVoice = useRef(false);
  useEffect(() => {
    if (room) joinedAt.current = Date.now();
  }, [room]);
  useEffect(() => {
    if (voice.micOn) usedVoice.current = true;
  }, [voice.micOn]);

  /** Leave goes through a short feedback card the first time; after that it's instant. */
  // Next keeps this page alive (hidden) after you leave, so close anything that was open on the way out;
  // otherwise it would still be there when you come back in
  const exitToLobby = () => {
    setLeaveContext(null);
    setMachineOpen(false);
    router.push('/');
  };

  const leave = () => {
    if (!room || !shouldAskFeedback()) return exitToLobby();
    const profile = loadProfile();
    setLeaveContext({
      visitorId: profile.visitorId,
      name: room.state.players.get(room.sessionId)?.name ?? profile.name,
      roomLabel: label ?? '',
      minutesInRoom: Math.round(((Date.now() - joinedAt.current) / 60_000) * 10) / 10,
      usedVoice: usedVoice.current,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
  };

  // Personal lo-fi; dips while anyone in voice is talking
  const music = useMusic(voice.speaking.size > 0);
  const sharingIds = useMemo(() => new Set(voice.shares.map((s) => s.identity)), [voice.shares]);

  // Walking away from the Buddy Machine closes its panel
  useEffect(() => {
    if (!machineOpen) return;
    const id = setInterval(() => {
      const m = motion.current;
      if (Math.hypot(m.x - GACHA_MACHINE.x, m.z - GACHA_MACHINE.z) > GACHA_MACHINE.reach + 1.2) setMachineOpen(false);
    }, 300);
    return () => clearInterval(id);
  }, [machineOpen]);

  // Dev-only handle for automated browser tests (stripped from production builds)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !room) return;
    const w = window as unknown as { __study?: Record<string, unknown> };
    w.__study = { ...(w.__study ?? {}), room, motion };
  }, [room]);

  return (
    <div
      className="fixed inset-0 transition-[background] duration-1000"
      style={{ background: `linear-gradient(180deg, ${light.background[0]}, ${light.background[1]})` }}
    >
      <Canvas
        shadows="percentage"
        orthographic
        dpr={[1, quality.dpr]}
        frameloop="never"
        camera={{ position: [SPAWN.x + 20, 18, SPAWN.z + 20], zoom: ZOOM.base, near: 0.1, far: 200 }}
      >
        <FrameDriver fps={quality.fps} onSlow={qualityMode === 'auto' && !struggling ? onSlowFrames : undefined} />
        <StaticShadows lightKey={`${light.sunPosition.join(',')}|${light.sunIntensity.toFixed(2)}|${quality.shadows}`} />
        <Library light={light} shadows={quality.shadows} />
        <OrbitControls
          makeDefault
          target={[SPAWN.x, 0.6, SPAWN.z]}
          enablePan={false}
          enableDamping
          minZoom={ZOOM.min}
          maxZoom={ZOOM.max}
          minPolarAngle={0.35}
          maxPolarAngle={1.2}
        />
        {room && <LocalController room={room} motion={motion} onHint={setHint} onOpenMachine={openMachine} />}
        <GachaMachine lastSummon={summons.at(-1)} />
        {room &&
          npcIds.map((id) => {
            const npc = room.state.npcs?.get(id);
            return npc ? <NpcAvatar key={id} id={id} npc={npc} board={board} bubble={bubbles[npcKey(id)]} /> : null;
          })}
        {room &&
          playerIds.map((id) => {
            const player = room.state.players.get(id);
            return player ? (
              <Avatar key={id} id={id} player={player} isLocal={id === room.sessionId} local={motion} bubble={bubbles[id]} board={board} />
            ) : null;
          })}
        <ScreenShareTextures shares={voice.shares} players={room?.state.players} />
        <ZoomBridge request={zoomRequest} onZoom={setZoomPercent} />
        <LabelProjector board={board} />
        <DevSceneHandle />
      </Canvas>

      {room && (
        <LabelLayer
          board={board}
          ids={playerIds}
          players={room.state.players}
          localId={room.sessionId}
          bubbles={bubbles}
          voice={{ speaking: voice.speaking, micEnabled: voice.micEnabled, sharing: sharingIds }}
          clockOffset={clockOffset}
          npcIds={npcIds}
          npcs={room.state.npcs}
          reactions={reactions}
        />
      )}

      <RoomHeader
        onLeave={leave}
        label={label ?? 'Chanom Study Room'}
        people={playerIds.length}
        statusText={status === 'connected' ? null : statusText(status, error)}
      />
      <TopRight
        status={status}
        mode={themeMode}
        onMode={setThemeMode}
        saver={qualityMode === 'saver' || struggling}
        saverIsAuto={qualityMode === 'auto' && struggling}
        onSaver={() => {
          // From auto-saver, a click makes it the viewer's own choice; otherwise it toggles
          if (qualityMode === 'auto' && struggling) setQualityMode('saver');
          else {
            setStruggling(false);
            setQualityMode(qualityMode === 'saver' ? 'auto' : 'saver');
          }
        }}
      />
      <ZoomControl percent={zoomPercent} onZoom={(z) => (zoomRequest.current = z)} />

      {room && (
        <>
          <RoomSidebar room={room} music={music} />
          <FocusPanel room={room} clockOffset={clockOffset} />
          <TableScreens voice={voice} localId={room.sessionId} names={(id) => room.state.players?.get(id)?.name ?? 'Someone'} />
          <ChatPanel room={room} messages={chat} open={chatOpen} onOpen={openChat} />
          <Dock voice={voice} seated={!!mySeat.seatId} chatOpen={chatOpen} onChat={() => setChatOpen((o) => !o)} />
        </>
      )}

      {(hint || mySeat.seatId) && !machineOpen && (
        <div className="panel absolute bottom-[104px] left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap">
          {mySeat.seatId ? seatedText(mySeat.seatId) : hintText(hint!)}
        </div>
      )}

      {room && machineOpen && (
        <BuddyMachinePanel room={room} npcIds={npcIds} summons={summons} error={summonError} onClose={() => setMachineOpen(false)} />
      )}

      {leaveContext && <LeaveFeedback context={leaveContext} onLeave={exitToLobby} onStay={() => setLeaveContext(null)} />}

      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center bg-cocoa/30">
          <div className="panel max-w-sm p-6 text-center">
            <p className="font-extrabold">Couldn&apos;t join the room</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <Link href="/" className="mt-4 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white">
              Back to the lobby
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dev-only: expose the scene to automated browser tests. */
function DevSceneHandle() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __study?: Record<string, unknown> };
    w.__study = { ...(w.__study ?? {}), scene, camera, gl };
  }, [scene, camera, gl]);
  return null;
}

/**
 * Read the profile at the moment we join, not from component state: Next keeps
 * this page alive (hidden in <Activity>) after you leave, so state could be stale
 * when you come back with a new outfit.
 */
function joinOptions() {
  const profile = loadProfile();
  return { name: profile.name || 'Guest', look: profile.look, visitorId: profile.visitorId };
}

type LeaveContext = React.ComponentProps<typeof LeaveFeedback>['context'];

function hintText(hint: Hint) {
  switch (hint.kind) {
    case 'pet':
      return `Press E to pet ${hint.name} 🐾`;
    case 'machine':
      return 'Press E to open the Buddy Machine';
    case 'seat':
      return SEAT_BY_ID.get(hint.seatId)?.kind === 'sofa' ? 'Press E to sit on the sofa' : 'Press E to sit';
  }
}

function seatedText(seatId: string) {
  return SEAT_BY_ID.get(seatId)?.kind === 'sofa'
    ? '🛋️ Lounging on the sofa · press E or walk to get up'
    : '📖 Studying · press E or walk to stand up';
}

function statusText(status: string, error: string | null) {
  if (status === 'connecting') return 'Connecting…';
  if (status === 'closed') return 'Disconnected';
  return error ?? '';
}
