'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dices, Download, MessageCircle, Pause, Play, Send, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BoardStore, drawBoard, type Stroke } from '../board/board';
import { BoardCanvas, DrawingPad, downloadPng } from '../board/BoardPanel';
import type { ActivityHub, SpotState } from '../hub';
import { randomPrompt } from './content';
import { REACTIONS, chainOf, sourceFor, stepKind, type Entry, type TelGame } from './game';

/**
 * Drawing telephone happens entirely in this panel, like Gartic Phone: your turn (write, draw,
 * describe, or copy from memory), then the album. The room and voice carry on around it.
 */
export function TelephonePanel({
  hub,
  game,
  st,
  name,
  now,
}: {
  hub: ActivityHub;
  game: TelGame;
  st: SpotState;
  name: (id: string) => string;
  now: number;
}) {
  return (
    <section
      className="panel flex max-h-[calc(100dvh-170px)] max-w-[calc(100vw-1.5rem)] flex-col gap-2.5 p-3"
      style={{ width: 'min(860px, calc(100vw - 160px))' }}
      aria-label={game.mode === 'tel' ? 'Drawing telephone' : 'Copycat'}
    >
      {game.stage === 'turn' ? (
        <Turn key={game.step} hub={hub} game={game} st={st} now={now} />
      ) : (
        <Album hub={hub} game={game} isHost={st.hostId === 'me'} name={name} />
      )}
    </section>
  );
}

const LABEL = { write: 'Write a prompt', draw: 'Draw it', describe: 'What is it?', copy: 'Copy it from memory' };

function Turn({ hub, game, st, now }: { hub: ActivityHub; game: TelGame; st: SpotState; now: number }) {
  const kind = stepKind(game.mode, game.step);
  const src = sourceFor(game, 'me');
  const [text, setText] = useState('');
  const pad = useMemo(() => new BoardStore(), []);
  // What you have so far: sent as it is when the time runs out
  useEffect(() => {
    const sync = () => hub.setTelDraft(text, pad.strokes);
    sync();
    const off = pad.subscribe(sync);
    return () => void off();
  }, [hub, pad, text]);

  const playing = st.players.includes('me') && chainOf(game, 'me') >= 0;
  const left = Math.max(0, Math.ceil((game.until - now) / 1000));
  const sentCount = game.order.filter((id) => game.sent[id] && st.players.includes(id)).length;
  const looking = kind === 'copy' && now < game.lookUntil;
  const send = () =>
    hub.telSend('me', kind === 'write' || kind === 'describe' ? { kind: 'text', text } : { kind: 'drawing', strokes: [...pad.strokes] });

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm font-black">{game.mode === 'tel' ? '✏️ Drawing telephone' : '🐱 Copycat'}</span>
        <span className="text-[11px] font-bold text-muted-foreground">
          Step {game.step + 1} of {game.steps} · {LABEL[kind]}
        </span>
        <span className="ml-auto text-[11px] font-bold text-muted-foreground">
          {sentCount} of {game.order.filter((id) => st.players.includes(id)).length} done
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-xs font-black tabular-nums',
            left <= 10 ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </span>
      </div>

      {!playing ? (
        <Note>💀 You’re out of this round. Stay for the album at the end.</Note>
      ) : game.sent.me ? (
        <Note>✓ Sent. Waiting for the others…</Note>
      ) : kind === 'write' ? (
        <TextTurn
          prompt="Write something for someone else to draw"
          placeholder="e.g. a cat stuck in a bubble tea"
          text={text}
          setText={setText}
          onSend={send}
          dice
        />
      ) : kind === 'describe' ? (
        <>
          <Picture entry={src} />
          <TextTurn prompt="What is this? Describe it" placeholder="It’s a…" text={text} setText={setText} onSend={send} />
        </>
      ) : looking ? (
        <>
          <p className="text-center text-sm font-black">Remember it! It hides in {Math.ceil((game.lookUntil - now) / 1000)} s</p>
          <Picture entry={src} />
        </>
      ) : (
        <>
          <p className="text-center text-base font-black">
            {kind === 'copy' ? (
              'Now draw it from memory'
            ) : src?.text ? (
              <>
                Draw: <span className="text-primary">{src.text}</span>
              </>
            ) : (
              <>
                Draw anything <span className="text-xs font-bold text-muted-foreground">(idea: {firstIdea(game)})</span>
              </>
            )}
          </p>
          <DrawingPad board={pad} active clearText="Clear your drawing?" />
          <button
            onClick={send}
            className="flex items-center justify-center gap-1.5 self-end rounded-full bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink"
          >
            <Send className="size-4" /> Done
          </button>
        </>
      )}
    </>
  );
}

/** Copycat's first drawing: a fixed idea per round, so it doesn't change while you draw. */
const firstIdea = (g: TelGame) => ['a cat in a box', 'a house on a hill', 'a happy sun', 'a fish', 'a flower'][g.order.length % 5];

function TextTurn({
  prompt,
  placeholder,
  text,
  setText,
  onSend,
  dice,
}: {
  prompt: string;
  placeholder: string;
  text: string;
  setText: (t: string) => void;
  onSend: () => void;
  dice?: boolean;
}) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend();
      }}
    >
      <p className="text-center text-base font-black">{prompt}</p>
      <div className="flex gap-1.5">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={80}
          className="h-11 min-w-0 flex-1 rounded-full border bg-card px-4 text-base"
          aria-label={prompt}
        />
        {dice && (
          <button
            type="button"
            onClick={() => setText(randomPrompt())}
            aria-label="Random idea"
            title="Random idea"
            className="grid size-11 place-items-center rounded-full border hover:bg-muted"
          >
            <Dices className="size-5" />
          </button>
        )}
        <button
          disabled={!text.trim()}
          className="flex items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary-ink disabled:opacity-45"
        >
          <Send className="size-4" /> Done
        </button>
      </div>
    </form>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-muted py-10 text-center text-sm font-bold text-muted-foreground">{children}</p>;
}

/** Someone's drawing (or nothing, when they skipped). */
function Picture({ entry, className }: { entry?: Entry; className?: string }) {
  const store = useMemo(() => {
    const s = new BoardStore();
    s.strokes = entry?.strokes ?? [];
    return s;
  }, [entry]);
  return (
    <div className={cn('relative overflow-hidden rounded-xl border-2 border-[#c9ced6]', className)} style={{ aspectRatio: 16 / 9 }}>
      <BoardCanvas board={store} pen={null} />
      {(!entry || entry.skipped || !entry.strokes?.length) && (
        <span className="absolute inset-0 grid place-items-center text-sm font-bold text-muted-foreground">(nothing drawn)</span>
      )}
    </div>
  );
}

/** The album: each chain, step by step, on its own. The host can pause or skip; everyone reacts. */
function Album({ hub, game, isHost, name }: { hub: ActivityHub; game: TelGame; isHost: boolean; name: (id: string) => string }) {
  const { chain, shown, paused } = game.reveal;
  const entries = game.chains[chain]!.slice(0, shown);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Braces on purpose: newer browsers return a promise here, and React would take it for a cleanup
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [shown, chain]);
  const who = (id: string) => (id === 'me' ? 'You' : name(id));

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm font-black">📖 {game.order[chain] === 'me' ? 'Your' : `${name(game.order[chain]!)}’s`} chain</span>
        <span className="text-[11px] font-bold text-muted-foreground">
          {chain + 1} of {game.chains.length}
        </span>
        <span className="ml-auto" />
        <button
          onClick={() => saveChain(game.chains[chain]!, who).catch(() => toast.error('Couldn’t save it. Try again?'))}
          aria-label="Save this chain as an image"
          title="Save this chain as an image"
          className="grid size-8 place-items-center rounded-full hover:bg-muted"
        >
          <Download className="size-4" />
        </button>
        <button
          onClick={() => toast.success('📖 Chain shared to Room chat')}
          aria-label="Share this chain to Room chat"
          title="Share to Room chat"
          className="grid size-8 place-items-center rounded-full hover:bg-muted"
        >
          <MessageCircle className="size-4" />
        </button>
        {isHost && (
          <>
            <button
              onClick={() => hub.telPause(!paused)}
              className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-extrabold hover:bg-muted"
            >
              {paused ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5 fill-current" />}
              {paused ? 'Play' : 'Pause'}
            </button>
            <button
              onClick={() => hub.telNextChain()}
              className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-extrabold hover:bg-muted"
            >
              <SkipForward className="size-3.5" /> {chain + 1 < game.chains.length ? 'Next chain' : 'Finish'}
            </button>
          </>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {entries.map((e, i) => (
          <div key={i} className={cn('flex flex-col gap-1', i % 2 ? 'items-end' : 'items-start')}>
            <span className="px-1 text-[11px] font-bold text-muted-foreground">
              {who(e.by)} {e.skipped ? 'skipped' : e.kind === 'text' ? (i === 0 ? 'wrote' : 'guessed') : 'drew'}
            </span>
            {e.kind === 'text' ? (
              <p className="max-w-[80%] rounded-2xl bg-secondary px-4 py-2 text-base font-extrabold">{e.skipped ? '…' : e.text}</p>
            ) : (
              <Picture entry={e} className="w-[min(520px,90%)]" />
            )}
            <div className="flex gap-1">
              {REACTIONS.map((r) => {
                const n = game.reactions[`${chain}:${i}`]?.[r];
                return (
                  <button
                    key={r}
                    onClick={() => hub.telReact(chain, i, r)}
                    className={cn('rounded-full px-1.5 text-sm hover:bg-muted', n && 'bg-muted')}
                    aria-label={`React ${r}`}
                  >
                    {r}
                    {n ? <span className="ml-0.5 text-[10px] font-bold">{n}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {paused && <p className="text-center text-xs font-bold text-muted-foreground">Paused by the host</p>}
    </>
  );
}

/** One chain as a tall image: who did what, the words and the drawings. */
async function saveChain(chain: Entry[], who: (id: string) => string) {
  const W = 800;
  const DH = 450;
  const heights = chain.map((e) => 34 + (e.kind === 'text' ? 70 : DH) + 16);
  const c = document.createElement('canvas');
  c.width = W + 40;
  c.height = heights.reduce((a, b) => a + b, 40);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff6fa';
  g.fillRect(0, 0, c.width, c.height);
  let y = 20;
  chain.forEach((e, i) => {
    g.fillStyle = '#8a7a85';
    g.font = '700 18px system-ui, sans-serif';
    g.fillText(`${who(e.by)} ${e.skipped ? 'skipped' : e.kind === 'text' ? (i === 0 ? 'wrote' : 'guessed') : 'drew'}`, 24, y + 22);
    y += 34;
    if (e.kind === 'text') {
      g.fillStyle = '#ffd2e3';
      g.beginPath();
      g.roundRect(20, y, W, 70, 24);
      g.fill();
      g.fillStyle = '#45323d';
      g.font = '800 26px system-ui, sans-serif';
      g.fillText(e.skipped ? '…' : (e.text ?? ''), 40, y + 44, W - 40);
      y += 70;
    } else {
      g.save();
      g.translate(20, y);
      drawBoard(g, (e.strokes ?? []) as Stroke[], W, DH);
      g.restore();
      y += DH;
    }
    y += 16;
  });
  const png = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (!png) throw new Error('no image');
  downloadPng(png, 'connecta-telephone.png');
}
