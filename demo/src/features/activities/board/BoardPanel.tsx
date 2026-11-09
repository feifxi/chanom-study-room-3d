'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Eraser, Maximize2, MessageCircle, Minimize2, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDismiss } from '../../room/useDismiss';
import { ASPECT, COLORS, ERASER, SIZES, boardPng, drawBoard, type BoardStore } from './board';

/**
 * The whiteboard up close (feature 11): everyone in front of the board draws on the same picture,
 * live, while the wall shows it to the room. Pen, six colours, three sizes, eraser, undo (your own
 * strokes), clear (asks first), save or share to Room chat.
 *
 * Like the watch panel: a press anywhere else shrinks it to the corner (that press doesn't walk you),
 * and a click on the small board makes it big again.
 */
export function BoardPanel({
  board,
  people,
  name,
  mini,
  onMini,
}: {
  board: BoardStore;
  /** Who's at the board right now. */
  people: string[];
  name: (id: string) => string;
  mini: boolean;
  onMini: (mini: boolean) => void;
}) {
  const panel = useDismiss<HTMLElement>(!mini, () => onMini(true));

  const save = async () => {
    const png = await boardPng(board.strokes);
    if (!png) return toast.error('Couldn’t save the board. Try again?');
    downloadPng(png, 'connecta-whiteboard.png');
  };

  return (
    <section
      ref={panel}
      className={cn('panel flex flex-col gap-2 p-2.5', mini ? 'w-[300px]' : 'max-w-[calc(100vw-1.5rem)]')}
      style={mini ? undefined : { width: 'min(1040px, calc(100vw - 160px), calc((100dvh - 250px) * 16 / 9))' }}
      aria-label="Whiteboard"
    >
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-black">🎨 Whiteboard</span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
          {people.length > 1
            ? `drawing with ${people
                .filter((id) => id !== 'me')
                .map(name)
                .join(', ')}`
            : 'everyone in front of the board draws here'}
        </span>
        {!mini && (
          <>
            <ToolBtn label="Save as image" onClick={save}>
              <Download className="size-4" />
            </ToolBtn>
            <ToolBtn
              label="Share to Room chat"
              onClick={() => {
                // The demo has no upload: the real app posts the PNG to Room chat
                toast.success('🎨 Board shared to Room chat');
              }}
            >
              <MessageCircle className="size-4" />
            </ToolBtn>
          </>
        )}
        <ToolBtn label={mini ? 'Make it bigger' : 'Shrink to the corner'} onClick={() => onMini(!mini)}>
          {mini ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
        </ToolBtn>
      </div>
      <DrawingPad
        board={board}
        active={!mini}
        clearText="Clear the whole board for everyone?"
        overlay={mini && <button onClick={() => onMini(false)} aria-label="Make it bigger" className="absolute inset-0 hover:bg-black/5" />}
      />
    </section>
  );
}

export function downloadPng(png: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(png);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * A drawing surface with the board's tools under it: colours, sizes, eraser, undo (your own last
 * stroke, also Ctrl/Cmd+Z) and clear (asks first). The whiteboard and Draw & Guess share it.
 */
export function DrawingPad({
  board,
  active,
  clearText,
  overlay,
}: {
  board: BoardStore;
  /** Off: just the picture (the small board in the corner). */
  active: boolean;
  clearText: string;
  overlay?: React.ReactNode;
}) {
  const [color, setColor] = useState(COLORS[0]!);
  const [size, setSize] = useState(1);
  const [erasing, setErasing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        board.undo('me');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [board, active]);

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border-2 border-[#c9ced6]" style={{ aspectRatio: ASPECT }}>
        <BoardCanvas
          board={board}
          pen={active ? { color: erasing ? ERASER.color : color, size: erasing ? ERASER.size : SIZES[size]! } : null}
        />
        {overlay}
      </div>
      {active &&
        (confirmClear ? (
          <div className="flex items-center justify-center gap-2 rounded-full bg-destructive/10 py-1.5 text-xs font-bold">
            {clearText}
            <button
              onClick={() => {
                board.clear();
                setConfirmClear(false);
              }}
              className="rounded-full bg-destructive px-3 py-1 text-white"
            >
              Clear
            </button>
            <button onClick={() => setConfirmClear(false)} className="rounded-full px-3 py-1 hover:bg-card">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex gap-1" role="group" aria-label="Colour">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setErasing(false);
                  }}
                  aria-label={`Colour ${c}`}
                  aria-pressed={!erasing && color === c}
                  className={cn(
                    'size-7 rounded-full border-[3px] border-card',
                    !erasing && color === c ? 'ring-2 ring-primary' : 'ring-1 ring-border',
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            <span className="mx-1 h-6 w-px bg-border" />
            <div className="flex gap-1" role="group" aria-label="Size">
              {SIZES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSize(i);
                    setErasing(false);
                  }}
                  aria-label={['Thin', 'Medium', 'Thick'][i]}
                  aria-pressed={!erasing && size === i}
                  className={cn('grid size-8 place-items-center rounded-full', !erasing && size === i ? 'bg-secondary' : 'hover:bg-muted')}
                >
                  <span className="rounded-full bg-foreground" style={{ width: 4 + i * 5, height: 4 + i * 5 }} />
                </button>
              ))}
            </div>
            <ToolBtn label="Eraser" onClick={() => setErasing(!erasing)} pressed={erasing}>
              <Eraser className="size-4" />
            </ToolBtn>
            <span className="ml-auto" />
            <ToolBtn label="Undo my last stroke (Ctrl+Z)" onClick={() => board.undo('me')}>
              <Undo2 className="size-4" />
            </ToolBtn>
            <ToolBtn label="Clear" onClick={() => setConfirmClear(true)}>
              <Trash2 className="size-4" />
            </ToolBtn>
          </div>
        ))}
    </>
  );
}

export function ToolBtn({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn('grid size-8 flex-none place-items-center rounded-full', pressed ? 'bg-secondary' : 'hover:bg-muted')}
    >
      {children}
    </button>
  );
}

let strokeCount = 0;

/**
 * The drawing surface: redraws the whole board when it changes (once per animation frame, however
 * many strokes arrived), at the screen's pixel density. With a pen, pointer moves become strokes.
 */
export function BoardCanvas({ board, pen }: { board: BoardStore; pen: { color: string; size: number } | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<string | null>(null);

  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext('2d')!;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(c.clientWidth * dpr);
      const h = Math.round(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h });
      drawBoard(g, board.strokes, w, h);
    };
    const later = () => {
      raf ||= requestAnimationFrame(draw);
    };
    draw();
    const off = board.subscribe(later);
    const ro = new ResizeObserver(later);
    ro.observe(c);
    return () => {
      off();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [board]);

  const at = (e: React.PointerEvent | PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  return (
    <canvas
      ref={ref}
      className={cn('absolute inset-0 size-full touch-none', pen && 'cursor-crosshair')}
      onPointerDown={(e) => {
        if (!pen || e.button > 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const id = `me-${Date.now()}-${strokeCount++}`;
        drawing.current = id;
        board.start({ id, by: 'me', color: pen.color, size: pen.size, pts: at(e) });
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        // Coalesced events keep fast strokes smooth on high-rate pens and mice
        const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
        board.add(
          drawing.current,
          events.flatMap((ev) => at(ev)),
        );
      }}
      onPointerUp={() => (drawing.current = null)}
      onPointerCancel={() => (drawing.current = null)}
    />
  );
}
