'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CHAT_MAX, SPAWN, type RoomListing } from '@study/shared';
import { GAME_URL } from '@/lib/config';
import { FocusPanel } from '../focus/FocusPanel';
import { ScreenShareTextures, VoiceBar } from '../voice/ScreenShares';
import { useVoice } from '../voice/useVoice';
import { loadProfile, type Profile } from '@/lib/profile';
import { Avatar, type LocalMotion } from './Avatar';
import { LabelBoard, LabelLayer, LabelProjector } from './labels';
import { Library } from './Library';
import { LocalController } from './LocalController';
import { useStudyRoom, type StudyRoom } from './useStudyRoom';

export default function StudyRoomView({ roomId }: { roomId: string | null }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => setProfile(loadProfile()), []);
  const options = useMemo(
    () => (profile ? { name: profile.name || 'Guest', look: profile.look, visitorId: profile.visitorId } : null),
    [profile],
  );

  const { room, status, error, playerIds, chat, bubbles, clockOffset } = useStudyRoom(roomId, options);
  const motion = useRef<LocalMotion>({ x: SPAWN.x, z: SPAWN.z, yaw: 0, moving: false });
  const [nearSeat, setNearSeat] = useState<string | null>(null);
  const seated = useSeated(room);
  const label = useRoomLabel(room?.roomId);
  const board = useMemo(() => new LabelBoard(), []);
  const voice = useVoice(room, motion);

  // Dev-only handle for automated browser tests (stripped from production builds)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !room) return;
    const w = window as unknown as { __study?: Record<string, unknown> };
    w.__study = { ...(w.__study ?? {}), room, motion };
  }, [room]);
  const sharingIds = useMemo(() => new Set(voice.shares.map((s) => s.identity)), [voice.shares]);

  return (
    <div className="fixed inset-0">
      <Canvas shadows orthographic dpr={[1, 2]} camera={{ position: [SPAWN.x + 20, 18, SPAWN.z + 20], zoom: 62, near: 0.1, far: 200 }}>
        <Library />
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
        {room && <LocalController room={room} motion={motion} onNearSeat={setNearSeat} />}
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
        />
      )}

      <header className="panel absolute top-4 left-4 flex items-center gap-3 px-4 py-2.5">
        <Link href="/" className="text-sm font-bold text-muted hover:text-ink">← ออก</Link>
        <span className="h-4 w-px bg-line" />
        <div>
          <p className="text-sm font-extrabold leading-tight">{label ?? 'Chanom Study Room'}</p>
          <p className="text-xs text-muted">{status === 'connected' ? `${playerIds.length} คนในห้อง` : statusText(status, error)}</p>
        </div>
      </header>

      <p className="absolute top-20 left-4 hidden rounded-full bg-white/60 px-3 py-1 text-xs text-muted sm:block">
        WASD / ลูกศร เดิน · Shift วิ่ง · E นั่ง/ลุก · Enter แชท · ลากเมาส์หมุนกล้อง
      </p>

      {room && <FocusPanel room={room} clockOffset={clockOffset} />}
      {room && (
        <VoiceBar
          voice={voice}
          seated={seated}
          localId={room.sessionId}
          names={(id) => room.state.players?.get(id)?.name ?? 'ใครบางคน'}
        />
      )}

      {(nearSeat || seated) && (
        <div className="panel absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 text-sm font-bold">
          {seated ? '📖 กำลังอ่านหนังสือ · กด E หรือเดินเพื่อลุก' : 'กด E เพื่อนั่ง'}
        </div>
      )}

      {room && <ChatPanel room={room} messages={chat} />}

      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center bg-black/20">
          <div className="panel max-w-sm p-6 text-center">
            <p className="font-extrabold">เข้าห้องไม่ได้</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <Link href="/" className="mt-4 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white">กลับไปหน้าแรก</Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dev-only: expose the scene to automated browser tests. */
function DevSceneHandle() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __study?: Record<string, unknown> };
    w.__study = { ...(w.__study ?? {}), scene };
  }, [scene]);
  return null;
}

function statusText(status: string, error: string | null) {
  if (status === 'connecting') return 'กำลังเชื่อมต่อ…';
  if (status === 'closed') return 'หลุดการเชื่อมต่อ';
  return error ?? '';
}

/** Re-render when our own seat changes (cheap polling of synced state). */
function useSeated(room: StudyRoom | null) {
  const [seated, setSeated] = useState(false);
  useEffect(() => {
    if (!room) return;
    const timer = setInterval(() => setSeated(!!room.state.players.get(room.sessionId)?.seatId), 150);
    return () => clearInterval(timer);
  }, [room]);
  return seated;
}

function useRoomLabel(roomId: string | undefined) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!roomId) return;
    fetch(`${GAME_URL}/rooms`)
      .then((r) => r.json() as Promise<RoomListing[]>)
      .then((list) => setLabel(list.find((r) => r.roomId === roomId)?.label ?? null))
      .catch(() => {});
  }, [roomId]);
  return label;
}

function ChatPanel({ room, messages }: { room: StudyRoom; messages: { id: string; name: string; text: string; sessionId: string }[] }) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const typingSent = useRef({ on: false, at: 0 });

  // Tell the room we're typing: on change of state, and as a heartbeat while keys keep coming.
  const signalTyping = (on: boolean) => {
    const now = Date.now();
    const last = typingSent.current;
    if (on === last.on && (!on || now - last.at < 2500)) return;
    room.send('typing', { on });
    typingSent.current = { on, at: now };
  };
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length]);

  return (
    <div className="panel absolute bottom-4 left-4 flex w-[min(340px,calc(100%-32px))] flex-col gap-2 p-3">
      <ol ref={list} className="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm">
        {messages.length === 0 && <li className="text-xs text-muted">ทักทายเพื่อนๆ ในห้องได้เลย 👋</li>}
        {messages.map((m) => (
          <li key={m.id} className="leading-snug">
            <b className={m.sessionId === room.sessionId ? 'text-accent-ink' : ''}>{m.name}</b>{' '}
            <span className="break-words">{m.text}</span>
          </li>
        ))}
      </ol>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (value) room.send('chat', { text: value });
          else signalTyping(false);
          typingSent.current = { on: false, at: 0 }; // the server clears typing when a message arrives
          setText('');
          input.current?.blur();
        }}
      >
        <input
          ref={input}
          value={text}
          maxLength={CHAT_MAX}
          onChange={(e) => {
            setText(e.target.value);
            signalTyping(e.target.value.trim().length > 0);
          }}
          onBlur={() => signalTyping(false)}
          onKeyDown={(e) => e.key === 'Escape' && input.current?.blur()}
          placeholder="พิมพ์ข้อความ… (Enter)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-white">ส่ง</button>
      </form>
    </div>
  );
}
