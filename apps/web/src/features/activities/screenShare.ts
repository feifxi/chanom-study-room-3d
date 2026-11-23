/**
 * Your own screen share on the big screen (feature 10). The stream stays in this module, never in
 * the hub's state: in the app it's a LiveKit track, and room state only says who is sharing.
 *
 * Sound comes with it where the browser allows: Chrome and Edge share a tab's sound everywhere and
 * the whole computer's sound on Windows; Safari and Firefox share no sound. The browser's picker
 * shows the "Share audio" box, so people see what they're sending.
 */

let stream: MediaStream | null = null;

export const myShareStream = () => stream;

/** Ask the browser for a screen, tab or window. Null when the person cancels or the browser refuses. */
/** `height`: the room's plan (720p, 1080p when its owner has Plus) */
export async function startMyShare(onEnded: () => void, height = 720): Promise<{ audio: boolean } | null> {
  stopMyShare();
  try {
    // `systemAudio` is a newer Chrome option (whole-screen sound on Windows); other browsers ignore it
    const options = { video: { height: { ideal: height, max: height } }, audio: true, systemAudio: 'include' } as DisplayMediaStreamOptions;
    const s = await navigator.mediaDevices.getDisplayMedia(options);
    stream = s;
    // The browser's own "Stop sharing" bar ends the share too
    s.getVideoTracks()[0]?.addEventListener('ended', () => {
      if (stream === s) {
        stopMyShare();
        onEnded();
      }
    });
    return { audio: s.getAudioTracks().length > 0 };
  } catch {
    return null;
  }
}

export function stopMyShare() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}
