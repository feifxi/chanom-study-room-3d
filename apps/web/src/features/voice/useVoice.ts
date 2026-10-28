'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Room as LiveKitRoom, RoomEvent, Track, type Participant, type RemoteTrack, type RemoteTrackPublication, type VideoTrack,
} from 'livekit-client';
import { VOICE_FAR, VOICE_NEAR } from '@study/shared';
import type { LocalMotion } from '../room/Avatar';
import type { StudyRoom } from '../room/useStudyRoom';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface ScreenShare {
  /** Session id of the person sharing. */
  identity: string;
  track: VideoTrack;
}

export interface Voice {
  status: VoiceStatus;
  error: string | null;
  micOn: boolean;
  sharing: boolean;
  /** Browsers block audio until a click; true while we're waiting for one. */
  needsAudioUnlock: boolean;
  speaking: Set<string>;
  micEnabled: Set<string>;
  shares: ScreenShare[];
  toggleMic: () => Promise<void>;
  toggleShare: () => Promise<void>;
  unlockAudio: () => Promise<void>;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** RMS level above which a voice counts as talking, and how long the indicator lingers after. */
const TALK_LEVEL = 0.03;
const TALK_HANGOVER_MS = 450;

/**
 * Client-side voice activity: a tiny analyser per audio stream. Reacts faster than
 * the server's smoothed active-speaker list and doesn't depend on server tuning.
 */
class TalkDetector {
  private ctx: AudioContext | null = null;
  private meters = new Map<string, { analyser: AnalyserNode; buf: Float32Array<ArrayBuffer>; lastLoud: number; source: MediaStreamAudioSourceNode }>();

  watch(identity: string, track: MediaStreamTrack) {
    this.unwatch(identity);
    try {
      this.ctx ??= new AudioContext();
      const source = this.ctx.createMediaStreamSource(new MediaStream([track]));
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser); // analysis only: not connected to the speakers
      this.meters.set(identity, { analyser, buf: new Float32Array(analyser.fftSize), lastLoud: 0, source });
    } catch {
      // No WebAudio: fall back to the server's active speakers only
    }
  }

  unwatch(identity: string) {
    const m = this.meters.get(identity);
    if (!m) return;
    m.source.disconnect();
    this.meters.delete(identity);
  }

  resume() {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  /** Identities talking right now. */
  talking(now: number): string[] {
    const out: string[] = [];
    for (const [id, m] of this.meters) {
      m.analyser.getFloatTimeDomainData(m.buf);
      let sum = 0;
      for (const v of m.buf) sum += v * v;
      if (Math.sqrt(sum / m.buf.length) > TALK_LEVEL) m.lastLoud = now;
      if (now - m.lastLoud < TALK_HANGOVER_MS) out.push(id);
    }
    return out;
  }

  close() {
    for (const id of [...this.meters.keys()]) this.unwatch(id);
    void this.ctx?.close();
  }
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/**
 * Proximity voice + screen share over LiveKit. Everyone in a study room joins
 * the matching LiveKit room muted; the closer someone stands, the louder they are.
 */
export function useVoice(room: StudyRoom | null, motion: React.RefObject<LocalMotion>): Voice {
  const lk = useRef<LiveKitRoom | null>(null);
  const detector = useRef<TalkDetector | null>(null);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [micEnabled, setMicEnabled] = useState<Set<string>>(new Set());
  const [shares, setShares] = useState<ScreenShare[]>([]);

  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    const audioEls = new Map<string, HTMLMediaElement>();
    const lkRoom = new LiveKitRoom({ adaptiveStream: true, dynacast: true });
    lk.current = lkRoom;
    const talk = new TalkDetector();
    detector.current = talk;
    let serverSpeakers = new Set<string>();

    const everyone = (): Participant[] => [lkRoom.localParticipant, ...lkRoom.remoteParticipants.values()];
    const syncMics = () => setMicEnabled(new Set(everyone().filter((p) => p.isMicrophoneEnabled).map((p) => p.identity)));
    const syncShares = () => {
      const list: ScreenShare[] = [];
      for (const p of everyone()) {
        const pub = p.getTrackPublication(Track.Source.ScreenShare);
        if (pub?.track && !pub.isMuted) list.push({ identity: p.identity, track: pub.track as VideoTrack });
      }
      setShares(list);
      setSharing(lkRoom.localParticipant.isScreenShareEnabled);
    };

    lkRoom
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.dataset.voice = participant.identity;
          document.body.appendChild(el);
          audioEls.set(track.sid ?? participant.identity, el);
          talk.watch(participant.identity, track.mediaStreamTrack);
        }
        syncShares();
        syncMics();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant) => {
        for (const el of track.detach()) el.remove();
        if (track.kind === Track.Kind.Audio) talk.unwatch(participant.identity);
        audioEls.delete(track.sid ?? '');
        syncShares();
        syncMics();
      })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        serverSpeakers = new Set(speakers.map((s) => s.identity));
      })
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudioUnlock(!lkRoom.canPlaybackAudio))
      .on(RoomEvent.TrackMuted, syncMics)
      .on(RoomEvent.TrackUnmuted, syncMics)
      .on(RoomEvent.TrackPublished, syncMics)
      .on(RoomEvent.TrackUnpublished, () => {
        syncMics();
        syncShares();
      })
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.source === Track.Source.Microphone && pub.track) talk.watch(lkRoom.localParticipant.identity, pub.track.mediaStreamTrack);
        syncMics();
        syncShares();
      })
      .on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.source === Track.Source.Microphone) talk.unwatch(lkRoom.localParticipant.identity);
        syncMics();
        syncShares();
      })
      .on(RoomEvent.ParticipantDisconnected, () => {
        syncMics();
        syncShares();
      })
      .on(RoomEvent.Disconnected, () => !cancelled && setStatus('idle'));

    const onToken = async ({ url, token }: { url: string; token: string }) => {
      try {
        await lkRoom.connect(url, token);
        if (cancelled) return;
        setStatus('connected');
        setNeedsAudioUnlock(!lkRoom.canPlaybackAudio);
        syncMics();
        syncShares();
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    };
    const offToken = room.onMessage('voice:token', onToken);
    setStatus('connecting');
    room.send('voice:token', {});

    // Proximity: scale each voice by how far away its avatar stands
    const proximity = setInterval(() => {
      const me = motion.current;
      if (!me || lkRoom.state !== 'connected') return;
      for (const p of lkRoom.remoteParticipants.values()) {
        const other = room.state.players?.get(p.identity);
        if (!other) continue;
        const d = Math.hypot(other.x - me.x, other.z - me.z);
        p.setVolume(clamp01(1 - (d - VOICE_NEAR) / (VOICE_FAR - VOICE_NEAR)));
      }
    }, 200);

    // Who's talking: server speakers plus local analysers, muted mics excluded
    const talkTimer = setInterval(() => {
      const now = performance.now();
      const live = new Set<string>();
      for (const id of [...serverSpeakers, ...talk.talking(now)]) {
        const p = id === lkRoom.localParticipant.identity ? lkRoom.localParticipant : lkRoom.remoteParticipants.get(id);
        if (p?.isMicrophoneEnabled) live.add(id);
      }
      setSpeaking((prev) => (sameSet(prev, live) ? prev : live));
    }, 120);

    return () => {
      cancelled = true;
      offToken?.();
      clearInterval(proximity);
      clearInterval(talkTimer);
      talk.close();
      detector.current = null;
      for (const el of audioEls.values()) el.remove();
      void lkRoom.disconnect();
      lk.current = null;
      setStatus('idle');
      setMicOn(false);
      setSharing(false);
      setShares([]);
    };
  }, [room, motion]);

  // Screen share is a desk activity: stop it when you stand up
  useEffect(() => {
    if (!room || !sharing) return;
    const id = setInterval(() => {
      if (!room.state.players?.get(room.sessionId)?.seatId) void lk.current?.localParticipant.setScreenShareEnabled(false);
    }, 500);
    return () => clearInterval(id);
  }, [room, sharing]);

  return {
    status,
    error,
    micOn,
    sharing,
    needsAudioUnlock,
    speaking,
    micEnabled,
    shares,
    async toggleMic() {
      const local = lk.current?.localParticipant;
      if (!local) return;
      try {
        await lk.current!.startAudio();
        detector.current?.resume();
        await local.setMicrophoneEnabled(!micOn);
        setMicOn(local.isMicrophoneEnabled);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? `ไมค์: ${e.message}` : 'เปิดไมค์ไม่ได้');
      }
    },
    async toggleShare() {
      const local = lk.current?.localParticipant;
      if (!local || !room) return;
      if (!sharing && !room.state.players?.get(room.sessionId)?.seatId) {
        setError('นั่งที่โต๊ะก่อนนะ แล้วจอจะขึ้นบนโน้ตบุ๊กของคุณ');
        return;
      }
      try {
        await local.setScreenShareEnabled(!sharing, { audio: false });
        setSharing(local.isScreenShareEnabled);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? `แชร์จอ: ${e.message}` : 'แชร์จอไม่ได้');
      }
    },
    async unlockAudio() {
      await lk.current?.startAudio();
      detector.current?.resume();
      setNeedsAudioUnlock(!(lk.current?.canPlaybackAudio ?? true));
    },
  };
}
