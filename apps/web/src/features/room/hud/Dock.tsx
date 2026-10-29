import { MessageCircle, Mic, MicOff, MonitorUp, MonitorX, Volume2 } from 'lucide-react';
import { canShareScreen } from '@/lib/screen';
import type { Voice } from '../../voice/useVoice';

interface Props {
  voice: Voice;
  /** You can only share your screen while seated (with your table). */
  seated: boolean;
  chatOpen: boolean;
  onChat: () => void;
  /** Phone layout: icons only. */
  compact?: boolean;
}

/** The control dock at the bottom: mic, screen share and chat. */
export function Dock({ voice, seated, chatOpen, onChat, compact = false }: Props) {
  const ready = voice.status === 'connected';
  const label = (text: string) => (compact ? null : text);
  return (
    <div className={`dock absolute left-1/2 flex -translate-x-1/2 items-center gap-2 p-2 ${compact ? 'bottom-2' : 'bottom-4'}`}>
      <button
        onClick={voice.toggleMic}
        disabled={!ready}
        aria-pressed={voice.micOn}
        title={ready ? undefined : voice.status === 'error' ? 'Voice unavailable' : 'Voice connecting…'}
        aria-label={voice.micOn ? 'Mic on' : 'Mic off'}
        className={`dock-btn ${compact ? 'dock-btn-compact' : ''} ${voice.micOn ? '!bg-[#2f8f62]' : '!bg-[#7a3442]'}`}
      >
        {voice.micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        {label(voice.micOn ? 'Mic on' : 'Mic off')}
      </button>
      {canShareScreen() && (
        <button
          onClick={voice.toggleShare}
          disabled={!ready || (!seated && !voice.sharing)}
          title={seated ? 'Share your screen with your table' : 'Sit down to share your screen with your table'}
          aria-pressed={voice.sharing}
          aria-label={voice.sharing ? 'Stop sharing' : 'Share'}
          className={`dock-btn ${compact ? 'dock-btn-compact' : ''} ${voice.sharing ? '!bg-accent' : ''}`}
        >
          {voice.sharing ? <MonitorX className="size-5" /> : <MonitorUp className="size-5" />}
          {label(voice.sharing ? 'Stop' : 'Share')}
        </button>
      )}
      <button
        onClick={onChat}
        aria-pressed={chatOpen}
        aria-label="Chat"
        className={`dock-btn ${compact ? 'dock-btn-compact' : ''} ${chatOpen ? '!bg-white/20' : ''}`}
      >
        <MessageCircle className="size-5" />
        {label('Chat')}
      </button>
      {voice.needsAudioUnlock && (
        <button onClick={voice.unlockAudio} aria-label="Hear room" className={`dock-btn !bg-tea ${compact ? 'dock-btn-compact' : ''}`}>
          <Volume2 className="size-5" />
          {label('Hear room')}
        </button>
      )}
    </div>
  );
}
