'use client';

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayerView } from '@study/shared';
import type { ScreenShare, Voice } from './useVoice';

/** Puts each visible screen share on the laptop at the sharer's desk (inside the Canvas). */
export function ScreenShareTextures({ shares, players }: { shares: ScreenShare[]; players: Map<string, PlayerView> | undefined }) {
  return (
    <>
      {shares.map((s) => {
        const seatId = players?.get(s.identity)?.seatId;
        return seatId ? <LaptopScreen key={`${s.identity}-${seatId}-${s.track.sid}`} share={s} seatId={seatId} /> : null;
      })}
    </>
  );
}

function LaptopScreen({ share, seatId }: { share: ScreenShare; seatId: string }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const mesh = scene.getObjectByName(`screen-${seatId}`) as THREE.Mesh | undefined;
    if (!mesh) return;
    const video = share.track.attach() as HTMLVideoElement;
    video.muted = true;
    video.playsInline = true;
    void video.play().catch(() => {});
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    const original = mesh.material;
    mesh.material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    return () => {
      (mesh.material as THREE.Material).dispose();
      texture.dispose();
      mesh.material = original;
      share.track.detach(video);
    };
  }, [scene, share, seatId]);
  return null;
}

/** Mic and screen-share controls, bottom right. */
export function VoiceBar({ voice, seated }: { voice: Voice; seated: boolean }) {
  return (
    <div className="panel absolute right-4 bottom-4 flex w-72 flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Voice & screen</span>
        <span className="text-[11px] text-muted">
          {voice.status === 'connected' ? 'Closer = louder' : voice.status === 'connecting' ? 'Connecting…' : voice.status === 'error' ? 'Voice unavailable' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={voice.toggleMic}
          disabled={voice.status !== 'connected'}
          className={`rounded-lg px-2 py-2 text-sm font-bold whitespace-nowrap disabled:opacity-40 ${voice.micOn ? 'bg-accent text-white' : 'border border-line bg-white'}`}
        >
          🎙️ {voice.micOn ? 'Mic on' : 'Mic off'}
        </button>
        <button
          onClick={voice.toggleShare}
          disabled={voice.status !== 'connected' || (!seated && !voice.sharing)}
          title={seated ? 'Share with the people at your table' : 'Sit at a table to share'}
          className={`rounded-lg px-2 py-2 text-sm font-bold whitespace-nowrap disabled:opacity-40 ${voice.sharing ? 'bg-accent text-white' : 'border border-line bg-white'}`}
        >
          🖥️ {voice.sharing ? 'Stop' : 'Share'}
        </button>
      </div>
      {!seated && !voice.sharing && <p className="text-[11px] text-muted">Sit at a table to share your screen with that table.</p>}
      {voice.needsAudioUnlock && (
        <button onClick={voice.unlockAudio} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-bold text-white">
          🔈 Click to hear everyone
        </button>
      )}
      {voice.error && <p className="text-xs text-accent-ink">{voice.error}</p>}
    </div>
  );
}

/**
 * Zoom-style tiles for the screens shared at your table. Only table-mates are
 * subscribed to these tracks, so nobody else in the room can see them.
 */
export function TableScreens({ voice, localId, names }: { voice: Voice; localId: string; names: (id: string) => string }) {
  const [minimised, setMinimised] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [enlarged, setEnlarged] = useState<ScreenShare | null>(null);

  const others = voice.shares.filter((s) => s.identity !== localId);
  const visible = others.filter((s) => !hidden.has(s.track.sid ?? s.identity));
  const hiddenCount = others.length - visible.length;

  // Forget hidden/enlarged screens once their share ends
  useEffect(() => {
    const live = new Set(others.map((s) => s.track.sid ?? s.identity));
    setHidden((h) => (Array.from(h).every((id) => live.has(id)) ? h : new Set(Array.from(h).filter((id) => live.has(id)))));
    if (enlarged && !others.some((s) => s.track === enlarged.track)) setEnlarged(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.shares]);

  if (others.length === 0 && !voice.sharing) return null;

  return (
    <>
      <div className="absolute top-4 left-1/2 flex w-[min(440px,calc(100vw-680px))] min-w-80 -translate-x-1/2 flex-col gap-2">
        {voice.sharing && (
          <div className="panel flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="font-bold">🟢 You&apos;re sharing your screen with your table</span>
            <button onClick={voice.toggleShare} className="rounded-lg bg-accent px-3 py-1 text-xs font-bold text-white">
              Stop
            </button>
          </div>
        )}
        {others.length > 0 &&
          (minimised ? (
            <button onClick={() => setMinimised(false)} className="panel self-center px-3 py-1.5 text-sm font-bold">
              🖥️ {others.length} {others.length === 1 ? 'screen' : 'screens'} at your table · Show
            </button>
          ) : (
            <section className="panel flex flex-col gap-2 p-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Screens at your table</span>
                <div className="flex gap-1.5">
                  {hiddenCount > 0 && (
                    <button onClick={() => setHidden(new Set())} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-bold">
                      Show hidden ({hiddenCount})
                    </button>
                  )}
                  <button onClick={() => setMinimised(true)} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-bold">
                    Minimise
                  </button>
                </div>
              </div>
              {visible.length > 0 && (
                <div className={`grid gap-2 ${visible.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {visible.map((s) => (
                    <Tile
                      key={s.track.sid ?? s.identity}
                      share={s}
                      name={names(s.identity)}
                      onOpen={() => setEnlarged(s)}
                      onHide={() => setHidden((h) => new Set(h).add(s.track.sid ?? s.identity))}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
      </div>
      {enlarged && <ShareViewer share={enlarged} name={names(enlarged.identity)} onClose={() => setEnlarged(null)} />}
    </>
  );
}

function ShareVideo({ share, className }: { share: ScreenShare; className: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    share.track.attach(el);
    return () => {
      share.track.detach(el);
    };
  }, [share]);
  return <video ref={video} autoPlay playsInline muted className={className} />;
}

function Tile({ share, name, onOpen, onHide }: { share: ScreenShare; name: string; onOpen: () => void; onHide: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-black">
      <button onClick={onOpen} className="block w-full" aria-label={`Enlarge ${name}'s screen`}>
        <ShareVideo share={share} className="aspect-video max-h-[38vh] w-full object-contain" />
      </button>
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-bold text-white">
        🖥️ {name}
      </span>
      <button
        onClick={onHide}
        className="absolute top-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-bold text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Hide ${name}'s screen`}
      >
        ✕
      </button>
    </div>
  );
}

function ShareViewer({ share, name, onClose }: { share: ScreenShare; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-6" onClick={onClose}>
      <div className="panel flex max-h-full w-full max-w-6xl flex-col gap-2 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">🖥️ {name}&apos;s screen</span>
          <button onClick={onClose} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-bold">
            Close (Esc)
          </button>
        </div>
        <ShareVideo share={share} className="max-h-[80vh] w-full rounded-lg bg-black object-contain" />
      </div>
    </div>
  );
}
