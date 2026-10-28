'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GACHA_MACHINE, SPAWN } from '@study/shared';
import { FocusPanel } from '../focus/FocusPanel';
import { ScreenShareTextures, TableScreens, VoiceBar } from '../voice/ScreenShares';
import { RoomSidebar } from './RoomSidebar';
import { useDayLight } from './dayCycle';
import { useVoice } from '../voice/useVoice';
import { loadProfile } from '@/lib/profile';
import { Avatar, type LocalMotion } from './Avatar';
import { LabelBoard, LabelLayer, LabelProjector } from './labels';
import { Library } from './Library';
import { LocalController, type Hint } from './LocalController';
import { BuddyMachinePanel } from '../npc/BuddyMachinePanel';
import { GachaMachine } from '../npc/GachaMachine';
import { NpcAvatar } from '../npc/NpcAvatar';
import { npcKey } from './roomSession';
import { useStudyRoom } from './useStudyRoom';
import { useRoomLabel, useSeated } from './roomHooks';
import { ChatPanel } from '../chat/ChatPanel';

export default function StudyRoomView({ roomId }: { roomId: string | null }) {
  const { room, status, error, playerIds, npcIds, chat, bubbles, reactions, spins, gachaError, clockOffset } = useStudyRoom(
    roomId,
    joinOptions,
  );
  const motion = useRef<LocalMotion>({ x: SPAWN.x, z: SPAWN.z, yaw: 0, moving: false });
  const [hint, setHint] = useState<Hint | null>(null);
  const [machineOpen, setMachineOpen] = useState(false);
  const openMachine = useCallback(() => setMachineOpen(true), []);

  // Walking away from the Buddy Machine closes its panel
  useEffect(() => {
    if (!machineOpen) return;
    const id = setInterval(() => {
      const m = motion.current;
      if (Math.hypot(m.x - GACHA_MACHINE.x, m.z - GACHA_MACHINE.z) > GACHA_MACHINE.reach + 1.2) setMachineOpen(false);
    }, 300);
    return () => clearInterval(id);
  }, [machineOpen]);
  const seated = useSeated(room);
  const label = useRoomLabel(room?.roomId);
  const board = useMemo(() => new LabelBoard(), []);
  const voice = useVoice(room, motion);
  const light = useDayLight();

  // Dev-only handle for automated browser tests (stripped from production builds)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !room) return;
    const w = window as unknown as { __study?: Record<string, unknown> };
    w.__study = { ...(w.__study ?? {}), room, motion };
  }, [room]);
  const sharingIds = useMemo(() => new Set(voice.shares.map((s) => s.identity)), [voice.shares]);

  return (
    <div
      className="fixed inset-0 transition-[background] duration-1000"
      style={{ background: `linear-gradient(180deg, ${light.background[0]}, ${light.background[1]})` }}
    >
      <Canvas
        shadows="percentage"
        orthographic
        dpr={[1, 2]}
        camera={{ position: [SPAWN.x + 20, 18, SPAWN.z + 20], zoom: 62, near: 0.1, far: 200 }}
      >
        <Library light={light} />
        <OrbitControls
          makeDefault
          target={[SPAWN.x, 0.6, SPAWN.z]}
          enablePan={false}
          enableDamping
          minZoom={32}
          maxZoom={150}
          minPolarAngle={0.35}
          maxPolarAngle={1.2}
        />
        {room && <LocalController room={room} motion={motion} onHint={setHint} onOpenMachine={openMachine} />}
        <GachaMachine lastSpin={spins.at(-1)} />
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

      <header className="panel absolute top-4 left-4 flex items-center gap-3 px-4 py-2.5">
        <Link href="/" className="text-sm font-bold text-muted hover:text-ink">
          ← Leave
        </Link>
        <span className="h-4 w-px bg-line" />
        <div>
          <p className="text-sm font-extrabold leading-tight">{label ?? 'Chanom Study Room'}</p>
          <p className="text-xs text-muted">
            {status === 'connected'
              ? `${playerIds.length} ${playerIds.length === 1 ? 'person' : 'people'} here`
              : statusText(status, error)}
          </p>
        </div>
      </header>

      {room && <RoomSidebar room={room} />}

      {room && <FocusPanel room={room} clockOffset={clockOffset} />}
      {room && <VoiceBar voice={voice} seated={seated} />}
      {room && <TableScreens voice={voice} localId={room.sessionId} names={(id) => room.state.players?.get(id)?.name ?? 'Someone'} />}

      {(hint || seated) && !machineOpen && (
        <div className="panel absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 text-sm font-bold">
          {seated ? '📖 Studying · press E or walk to stand up' : hintText(hint!)}
        </div>
      )}

      {room && machineOpen && (
        <BuddyMachinePanel room={room} npcIds={npcIds} spins={spins} error={gachaError} onClose={() => setMachineOpen(false)} />
      )}

      {room && <ChatPanel room={room} messages={chat} />}

      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center bg-black/20">
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
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __study?: Record<string, unknown> };
    w.__study = { ...(w.__study ?? {}), scene, camera };
  }, [scene, camera]);
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

function hintText(hint: Hint) {
  switch (hint.kind) {
    case 'pet':
      return `Press E to pet ${hint.name} 🐾`;
    case 'talk':
      return `Press E to chat with ${hint.name}`;
    case 'machine':
      return 'Press E to open the Buddy Machine 🎰';
    default:
      return 'Press E to sit';
  }
}

function statusText(status: string, error: string | null) {
  if (status === 'connecting') return 'Connecting…';
  if (status === 'closed') return 'Disconnected';
  return error ?? '';
}
