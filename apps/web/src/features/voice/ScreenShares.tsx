'use client';

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayerView } from '@study/shared';
import type { ScreenShare, Voice } from './useVoice';

/** Puts each screen share on the laptop at the sharer's desk (inside the Canvas). */
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

/** Mic / screen-share controls and the list of people sharing. */
export function VoiceBar({ voice, names, seated, localId }: { voice: Voice; names: (id: string) => string; seated: boolean; localId: string }) {
  const [viewing, setViewing] = useState<ScreenShare | null>(null);
  const others = voice.shares.filter((s) => s.identity !== localId);

  // Close the viewer when that share ends
  useEffect(() => {
    if (viewing && !voice.shares.some((s) => s.track === viewing.track)) setViewing(null);
  }, [voice.shares, viewing]);

  return (
    <>
      <div className="panel absolute right-4 bottom-4 flex w-72 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold tracking-wider text-muted uppercase">เสียง & จอ</span>
          <span className="text-[11px] text-muted">
            {voice.status === 'connected' ? 'ยิ่งใกล้ยิ่งได้ยินชัด' : voice.status === 'connecting' ? 'กำลังเชื่อมต่อ…' : voice.status === 'error' ? 'เชื่อมต่อเสียงไม่ได้' : ''}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={voice.toggleMic}
            disabled={voice.status !== 'connected'}
            className={`rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40 ${voice.micOn ? 'bg-accent text-white' : 'border border-line bg-white'}`}
          >
            🎙️ {voice.micOn ? 'ไมค์เปิด' : 'ไมค์ปิด'}
          </button>
          <button
            onClick={voice.toggleShare}
            disabled={voice.status !== 'connected'}
            title={seated ? '' : 'นั่งที่โต๊ะก่อน'}
            className={`rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40 ${voice.sharing ? 'bg-accent text-white' : 'border border-line bg-white'} ${!seated && !voice.sharing ? 'opacity-60' : ''}`}
          >
            🖥️ {voice.sharing ? 'หยุดแชร์' : 'แชร์จอ'}
          </button>
        </div>
        {voice.needsAudioUnlock && (
          <button onClick={voice.unlockAudio} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-bold text-white">
            🔈 แตะเพื่อเปิดเสียงเพื่อนๆ
          </button>
        )}
        {voice.error && <p className="text-xs text-accent-ink">{voice.error}</p>}
        {others.length > 0 && (
          <ul className="flex flex-col gap-1 border-t border-line pt-2">
            {others.map((s) => (
              <li key={s.track.sid ?? s.identity} className="flex items-center justify-between text-sm">
                <span className="truncate">🖥️ {names(s.identity)} แชร์จออยู่</span>
                <button onClick={() => setViewing(s)} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-bold">
                  ดู
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {viewing && <ShareViewer share={viewing} name={names(viewing.identity)} onClose={() => setViewing(null)} />}
    </>
  );
}

function ShareViewer({ share, name, onClose }: { share: ScreenShare; name: string; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    share.track.attach(el);
    return () => {
      share.track.detach(el);
    };
  }, [share]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-6" onClick={onClose}>
      <div className="panel flex max-h-full w-full max-w-5xl flex-col gap-2 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">🖥️ จอของ {name}</span>
          <button onClick={onClose} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-bold">
            ปิด (Esc)
          </button>
        </div>
        <video ref={video} autoPlay playsInline muted className="max-h-[75vh] w-full rounded-lg bg-black object-contain" />
      </div>
    </div>
  );
}
