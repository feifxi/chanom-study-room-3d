import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import type { VoicePass } from '@connecta/shared';
import { log } from './log.js';

/**
 * Proximity voice through LiveKit (feature 6). The LiveKit room is named after the Connecta room and
 * each person joins as their game session id, so voices match characters. This side decides who may
 * talk (guests, Mute for everyone, time outs) and enforces it in LiveKit itself; who hears whom by
 * distance and private zones is each client's job (see apps/web/src/features/voice/useVoice.ts).
 */
export interface Voice {
  /** A pass to join the room's voice; `talk` false joins listening only */
  pass(room: string, identity: string, name: string, talk: boolean): Promise<VoicePass>;
  /** Allow or stop talking, at once (LiveKit unpublishes the mic when it's taken away) */
  allow(room: string, identity: string, talk: boolean): void;
  /** Turn their mic off (they went away); they turn it back on themselves */
  muteMic(room: string, identity: string): void;
  /** Out of voice too (kicked, banned, replaced by a newer tab, left) */
  remove(room: string, identity: string): void;
}

export interface VoiceConfig {
  /** LiveKit's API, from the game server (http) */
  url: string;
  /** LiveKit's WebSocket URL, as browsers reach it */
  publicUrl: string;
  key: string;
  secret: string;
}

/** Microphone, and the screen share of part 4; never cameras (Connecta has no video calls). */
const SOURCES = [TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];
const permission = (talk: boolean) => ({
  canSubscribe: true,
  canPublish: talk,
  canPublishData: false,
  canPublishSources: talk ? SOURCES : [],
});

export function liveKitVoice(config: VoiceConfig): Voice {
  const api = new RoomServiceClient(config.url, config.key, config.secret);
  // A participant who hasn't connected yet isn't there to change: their pass already says it
  const quietly = (what: string, call: () => Promise<unknown>) =>
    void call().catch((e: unknown) => log.debug({ err: e instanceof Error ? e.message : e }, `voice: ${what} skipped`));
  return {
    async pass(room, identity, name, talk) {
      // Short-lived: it's only for connecting, and LiveKit refreshes it while you stay connected
      const at = new AccessToken(config.key, config.secret, { identity, name, ttl: '10m' });
      at.addGrant({ roomJoin: true, room, ...permission(talk) });
      return { url: config.publicUrl, token: await at.toJwt() };
    },
    allow(room, identity, talk) {
      quietly('allow', () => api.updateParticipant(room, identity, { permission: permission(talk) }));
    },
    muteMic(room, identity) {
      quietly('mute', async () => {
        const p = await api.getParticipant(room, identity);
        for (const t of p.tracks)
          if (t.source === TrackSource.MICROPHONE && !t.muted) await api.mutePublishedTrack(room, identity, t.sid, true);
      });
    },
    remove(room, identity) {
      quietly('remove', () => api.removeParticipant(room, identity));
    },
  };
}

/** Set by the entry point (tests swap in their own). */
export const voice: { current: Voice | null } = { current: null };
