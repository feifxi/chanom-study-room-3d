'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Room as LiveKitRoom,
  RoomEvent,
  Track,
  type Participant,
  type RemoteAudioTrack,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client';
import { VOICE_FAR, VOICE_MAX, VOICE_NEAR } from '@connecta/shared';
import type { LiveRoom } from '@/features/room3d/liveRoom';

/** Where you are right now (the local motion the 3D view drives) */
interface Here {
  x: number;
  z: number;
}

export interface VoiceOptions {
  /** The room; null for no voice */
  room: LiveRoom | null;
  motion: RefObject<Here>;
  /** Your mic should be on (it's still off while the server says you can't talk) */
  mic: boolean;
  deaf: boolean;
  /** Talk to everyone: heard everywhere, private zones too */
  stage: boolean;
  /** The private zone at a spot, if any */
  zoneOf: (x: number, z: number) => string | undefined;
  /** Accounts you muted for yourself */
  mutedForMe: ReadonlySet<string>;
  /** The mic couldn't start (no permission, no device): the caller turns its switch back off */
  onMicFailed: (message: string) => void;
  /** Your screen share's capture while the game server has you sharing; null otherwise */
  share: MediaStream | null;
  /** Whether someone standing or sitting like `p` watches a share at `share` ('tv', 'table:…') */
  watches: (share: string, p: { x: number; z: number; seatId: string }) => boolean;
}

export interface Voice {
  connected: boolean;
  /** Who's talking right now, by room id ('me' or a session id) */
  speaking: Set<string>;
  /** Whose mic is on */
  micOn: ReadonlySet<string>;
  /** Screen shares you're watching, by sharer (a session id): picture and, if shared, sound */
  screens: ReadonlyMap<string, MediaStream>;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));
const EMPTY: Set<string> = new Set();
const NO_SCREENS: ReadonlyMap<string, MediaStream> = new Map();
const SCREEN_SOURCES = [Track.Source.ScreenShare, Track.Source.ScreenShareAudio];

/** RMS level above which a voice counts as talking, and how long the mark lingers after. */
const TALK_LEVEL = 0.03;
const TALK_HANGOVER_MS = 450;
/** The camera looks along (-1, -1) on the floor, so screen right is (1, -1): voices pan along it */
const PAN_METRES = 6;

/**
 * Proximity voice over LiveKit (docs/features/05-room-3d.md), grown up for crowds:
 *
 * - **Hearing:** full volume within 2.5 m, silent at 9 m, panned left and right by where people
 *   stand; only the 12 nearest you can hear are streamed. Talk to everyone is full volume anywhere.
 * - **Private zones are enforced by LiveKit, not hidden:** your own client tells LiveKit who may
 *   receive your voice (people in your zone when you're in one; people outside zones when you're
 *   not), so a tampered client outside can't receive voices from inside.
 * - **Who may talk** is the game server's call (guests, Mute for everyone, time outs): it sets
 *   LiveKit's publish permission, and this only turns the mic on when that allows it.
 * - **Screen shares** (part 4) go the same way: the sharer's client lets only the people on the TV
 *   rug or at its table receive the picture and sound, and those people subscribe to it.
 */
export function useVoice({ room, motion, mic, deaf, stage, zoneOf, mutedForMe, onMicFailed, share, watches }: VoiceOptions): Voice {
  const [connected, setConnected] = useState(false);
  const [speaking, setSpeaking] = useState<Set<string>>(EMPTY);
  const [micOn, setMicOn] = useState<Set<string>>(EMPTY);
  const [screens, setScreens] = useState<ReadonlyMap<string, MediaStream>>(NO_SCREENS);
  const lk = useRef<LiveKitRoom | null>(null);
  // The loop reads the latest settings without reconnecting
  const live = useRef({ deaf, stage, zoneOf, mutedForMe, watches });
  useEffect(() => {
    live.current = { deaf, stage, zoneOf, mutedForMe, watches };
  });

  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    const ctx = new AudioContext();
    const lkRoom = new LiveKitRoom({ adaptiveStream: true, dynacast: true, webAudioMix: { audioContext: ctx } });
    lk.current = lkRoom;
    if (process.env.NODE_ENV !== 'production') {
      // Browser tests read who's subscribed (see RoomView's __connecta)
      const w = window as unknown as { __connecta?: Record<string, unknown> };
      w.__connecta = { ...w.__connecta, voice: lkRoom };
    }
    const panners = new Map<string, StereoPannerNode>();
    const meters = new Map<string, { analyser: AnalyserNode; buf: Float32Array<ArrayBuffer>; lastLoud: number }>();
    const idOf = (identity: string) => (identity === room.voiceId ? 'me' : identity);

    const watch = (identity: string, track: MediaStreamTrack) => {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(new MediaStream([track])).connect(analyser); // measured, never played
      meters.set(identity, { analyser, buf: new Float32Array(analyser.fftSize), lastLoud: 0 });
    };
    const everyone = (): Participant[] => [lkRoom.localParticipant, ...lkRoom.remoteParticipants.values()];
    const syncMics = () => {
      const on = new Set(
        everyone()
          .filter((p) => p.isMicrophoneEnabled)
          .map((p) => idOf(p.identity)),
      );
      setMicOn((prev) => (sameSet(prev, on) ? prev : on));
    };
    // One stream per share, kept while its tracks stay the same (a new object would restart the video)
    const streams = new Map<string, { key: string; stream: MediaStream }>();
    const syncScreens = () => {
      const next = new Map<string, MediaStream>();
      for (const p of lkRoom.remoteParticipants.values()) {
        const [video, audio] = SCREEN_SOURCES.map((src) => {
          const pub = p.getTrackPublication(src);
          return pub?.isSubscribed ? pub.track?.mediaStreamTrack : undefined;
        });
        if (!video) continue;
        const key = `${video.id}:${audio?.id ?? ''}`;
        let got = streams.get(p.identity);
        if (got?.key !== key) {
          got = { key, stream: new MediaStream(audio ? [video, audio] : [video]) };
          streams.set(p.identity, got);
        }
        next.set(p.identity, got.stream);
      }
      setScreens((prev) => (prev.size === next.size && [...next].every(([k, v]) => prev.get(k) === v) ? prev : next));
    };

    lkRoom
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        // A share's picture and sound play in its panel, not through the room's voices
        if (pub.source !== Track.Source.Microphone) return syncScreens();
        const panner = ctx.createStereoPanner();
        panners.set(participant.identity, panner);
        (track as RemoteAudioTrack).setWebAudioPlugins([panner]);
        track.attach();
        watch(participant.identity, track.mediaStreamTrack);
        syncMics();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (pub.source !== Track.Source.Microphone) return syncScreens();
        track.detach();
        panners.delete(participant.identity);
        meters.delete(participant.identity);
        syncMics();
      })
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.source === Track.Source.Microphone && pub.track) watch(lkRoom.localParticipant.identity, pub.track.mediaStreamTrack);
        syncMics();
      })
      .on(RoomEvent.TrackMuted, syncMics)
      .on(RoomEvent.TrackUnmuted, syncMics)
      .on(RoomEvent.TrackPublished, syncMics)
      .on(RoomEvent.TrackUnpublished, syncMics)
      .on(RoomEvent.LocalTrackUnpublished, syncMics)
      .on(RoomEvent.ParticipantDisconnected, () => {
        syncMics();
        syncScreens();
      })
      .on(RoomEvent.Disconnected, () => !cancelled && setConnected(false));

    void room.voicePass().then(async ({ url, token }) => {
      if (cancelled) return;
      try {
        // Nobody is heard until the loop below picks them, and nobody may receive you until it says who
        await lkRoom.connect(url, token, { autoSubscribe: false });
        lkRoom.localParticipant.setTrackSubscriptionPermissions(false, []);
        if (!cancelled) setConnected(true);
        syncMics();
      } catch {
        // No voice server: the room still works, just without voice
      }
    });

    // Browsers hold audio back until you press something
    const unlock = () => {
      void ctx.resume();
      void lkRoom.startAudio();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    let allowed = '';
    const loop = setInterval(() => {
      if (lkRoom.state !== 'connected') return;
      const { deaf, stage, zoneOf, mutedForMe, watches } = live.current;
      const me = motion.current;
      const myZone = zoneOf(me.x, me.z);
      const meNow = { x: me.x, z: me.z, seatId: room.state.players.get('me')?.seatId ?? '' };
      const myShare = room.state.players.get('me')?.share ?? '';

      // Who may receive my voice and my screen: enforced by LiveKit
      const local = lkRoom.localParticipant;
      const micSid = local.getTrackPublication(Track.Source.Microphone)?.trackSid;
      const screenSids = SCREEN_SOURCES.map((src) => local.getTrackPublication(src)?.trackSid).filter((sid): sid is string => !!sid);
      const perms: { participantIdentity: string; allowedTrackSids: string[] }[] = [];
      for (const p of lkRoom.remoteParticipants.values()) {
        const other = room.state.players.get(p.identity);
        if (!other) continue;
        const sids = [
          ...(micSid && (stage || zoneOf(other.x, other.z) === myZone) ? [micSid] : []),
          ...(myShare && watches(myShare, other) ? screenSids : []),
        ];
        if (sids.length) perms.push({ participantIdentity: p.identity, allowedTrackSids: sids.sort() });
      }
      perms.sort((a, b) => a.participantIdentity.localeCompare(b.participantIdentity));
      const key = JSON.stringify(perms);
      if (key !== allowed) {
        allowed = key;
        local.setTrackSubscriptionPermissions(false, perms);
      }

      // Screens: the share at your TV rug or your table
      for (const p of lkRoom.remoteParticipants.values()) {
        const other = room.state.players.get(p.identity);
        const want = !!other?.share && watches(other.share, meNow);
        for (const src of SCREEN_SOURCES) {
          const pub = p.getTrackPublication(src);
          if (pub && pub.isDesired !== want) pub.setSubscribed(want);
        }
      }

      // Whom I hear: the nearest I can hear, at their distance's volume
      const audible: { pub: RemoteTrackPublication; p: RemoteParticipant; d: number; volume: number; pan: number }[] = [];
      for (const p of lkRoom.remoteParticipants.values()) {
        const pub = p.getTrackPublication(Track.Source.Microphone);
        const other = room.state.players.get(p.identity);
        if (!pub || !other) continue;
        const dx = other.x - me.x;
        const dz = other.z - me.z;
        const d = Math.hypot(dx, dz);
        const theirZone = zoneOf(other.x, other.z);
        const near = other.stage || (myZone ? theirZone === myZone : !theirZone && d < VOICE_FAR);
        if (deaf || pub.isMuted || mutedForMe.has(other.userId) || !near) {
          if (pub.isDesired) pub.setSubscribed(false);
          continue;
        }
        const volume = other.stage || myZone ? 1 : clamp(1 - (d - VOICE_NEAR) / (VOICE_FAR - VOICE_NEAR), 0, 1);
        audible.push({ pub, p, d: other.stage ? -1 : d, volume, pan: clamp((dx - dz) / Math.SQRT2 / PAN_METRES, -0.8, 0.8) });
      }
      audible.sort((a, b) => a.d - b.d);
      audible.forEach(({ pub, p, volume, pan }, i) => {
        const want = i < VOICE_MAX;
        // isDesired is what we asked for (isSubscribed is also false while a track connects)
        if (pub.isDesired !== want) pub.setSubscribed(want);
        if (!want) return;
        p.setVolume(volume);
        const panner = panners.get(p.identity);
        if (panner) panner.pan.value = pan;
      });
    }, 250);

    // Who's talking: a small level meter per voice (quicker than LiveKit's own speaker list)
    const talk = setInterval(() => {
      const now = performance.now();
      const on = new Set<string>();
      for (const [identity, m] of meters) {
        m.analyser.getFloatTimeDomainData(m.buf);
        let sum = 0;
        for (const v of m.buf) sum += v * v;
        if (Math.sqrt(sum / m.buf.length) > TALK_LEVEL) m.lastLoud = now;
        const p = identity === lkRoom.localParticipant.identity ? lkRoom.localParticipant : lkRoom.remoteParticipants.get(identity);
        if (now - m.lastLoud < TALK_HANGOVER_MS && p?.isMicrophoneEnabled) on.add(idOf(identity));
      }
      setSpeaking((prev) => (sameSet(prev, on) ? prev : on));
    }, 120);

    return () => {
      cancelled = true;
      clearInterval(loop);
      clearInterval(talk);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      void lkRoom.disconnect().then(() => ctx.close());
      lk.current = null;
      setConnected(false);
      setSpeaking(EMPTY);
      setMicOn(EMPTY);
      setScreens(NO_SCREENS);
    };
  }, [room, motion]);

  // Your mic follows the switch, as far as the server allows
  const hushed = !!room?.state.players.get('me')?.hushed;
  const failed = useRef(onMicFailed);
  useEffect(() => {
    failed.current = onMicFailed;
  });
  useEffect(() => {
    const local = lk.current?.localParticipant;
    if (!connected || !local) return;
    const want = mic && !deaf && !hushed;
    if (local.isMicrophoneEnabled === want) return;
    local.setMicrophoneEnabled(want).catch((e: unknown) => {
      if (want)
        failed.current(e instanceof Error && e.name === 'NotAllowedError' ? 'Your browser blocked the mic' : 'Couldn’t start your mic');
    });
  }, [connected, mic, deaf, hushed]);

  // Deafened shows by your name for everyone
  useEffect(() => {
    if (connected) room?.setDeaf(deaf);
  }, [connected, room, deaf]);

  // Your share goes out while the server has you sharing (the capture belongs to the caller)
  useEffect(() => {
    const local = lk.current?.localParticipant;
    if (!connected || !local || !share) return;
    const tracks = share.getTracks();
    for (const t of tracks)
      local
        .publishTrack(t, { source: t.kind === 'video' ? Track.Source.ScreenShare : Track.Source.ScreenShareAudio })
        .catch(() => undefined);
    return () => {
      for (const t of tracks) void local.unpublishTrack(t, false).catch(() => undefined);
    };
  }, [connected, share]);

  return { connected, speaking, micOn, screens };
}
