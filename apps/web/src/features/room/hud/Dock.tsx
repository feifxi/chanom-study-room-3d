import { MessageCircle, Mic, MicOff, MonitorUp, MonitorX, Volume2 } from 'lucide-react';
import type { Voice } from '../../voice/useVoice';

interface Props {
  voice: Voice;
  /** Your seat group ("Table 3", "Sofa"), or null while walking around. */
  place: string | null;
  /** People sitting in the same group, you included. */
  placeCount: number;
  chatOpen: boolean;
  onChat: () => void;
}

/** The dark control dock at the bottom: mic, screen share, chat and where you are. */
export function Dock({ voice, place, placeCount, chatOpen, onChat }: Props) {
  const ready = voice.status === 'connected';
  const status =
    voice.status === 'connecting'
      ? 'Voice connecting…'
      : voice.status === 'error'
        ? 'Voice unavailable'
        : place
          ? `${place} · ${placeCount} ${placeCount === 1 ? 'person' : 'people'} here`
          : 'Walking · voices fade with distance';

  return (
    <div className="dock absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 p-2">
      <button
        onClick={voice.toggleMic}
        disabled={!ready}
        aria-pressed={voice.micOn}
        className={`dock-btn ${voice.micOn ? '!bg-[#2f8f62]' : '!bg-[#7a3442]'}`}
      >
        {voice.micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        {voice.micOn ? 'Mic on' : 'Mic off'}
      </button>
      <button
        onClick={voice.toggleShare}
        disabled={!ready || (!place && !voice.sharing)}
        title={place ? `Share your screen with ${place}` : 'Sit down to share your screen with your table'}
        aria-pressed={voice.sharing}
        className={`dock-btn ${voice.sharing ? '!bg-accent' : ''}`}
      >
        {voice.sharing ? <MonitorX className="size-5" /> : <MonitorUp className="size-5" />}
        {voice.sharing ? 'Stop' : 'Share'}
      </button>
      <button onClick={onChat} aria-pressed={chatOpen} className={`dock-btn ${chatOpen ? '!bg-white/20' : ''}`}>
        <MessageCircle className="size-5" />
        Chat
      </button>
      <span className="mx-1 h-9 w-px bg-white/15" />
      <span className="flex items-center gap-2 px-2 text-sm font-semibold whitespace-nowrap text-white">
        <span className={`size-2 rounded-full ${ready ? 'bg-[#5fd39a]' : 'bg-tea'}`} />
        {status}
      </span>
      {voice.needsAudioUnlock && (
        <>
          <span className="mx-1 h-9 w-px bg-white/15" />
          <button onClick={voice.unlockAudio} className="dock-btn !bg-tea">
            <Volume2 className="size-5" />
            Hear room
          </button>
        </>
      )}
    </div>
  );
}
