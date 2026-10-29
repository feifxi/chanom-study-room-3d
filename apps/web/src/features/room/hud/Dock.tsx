import { MessageCircle, Mic, MicOff, MonitorUp, MonitorX, Volume2 } from 'lucide-react';
import type { Voice } from '../../voice/useVoice';

interface Props {
  voice: Voice;
  /** You can only share your screen while seated (with your table). */
  seated: boolean;
  chatOpen: boolean;
  onChat: () => void;
}

/** The control dock at the bottom: mic, screen share and chat. */
export function Dock({ voice, seated, chatOpen, onChat }: Props) {
  const ready = voice.status === 'connected';
  return (
    <div className="dock absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 p-2">
      <button
        onClick={voice.toggleMic}
        disabled={!ready}
        aria-pressed={voice.micOn}
        title={ready ? undefined : voice.status === 'error' ? 'Voice unavailable' : 'Voice connecting…'}
        className={`dock-btn ${voice.micOn ? '!bg-[#2f8f62]' : '!bg-[#7a3442]'}`}
      >
        {voice.micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        {voice.micOn ? 'Mic on' : 'Mic off'}
      </button>
      <button
        onClick={voice.toggleShare}
        disabled={!ready || (!seated && !voice.sharing)}
        title={seated ? 'Share your screen with your table' : 'Sit down to share your screen with your table'}
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
      {voice.needsAudioUnlock && (
        <button onClick={voice.unlockAudio} className="dock-btn !bg-tea">
          <Volume2 className="size-5" />
          Hear room
        </button>
      )}
    </div>
  );
}
