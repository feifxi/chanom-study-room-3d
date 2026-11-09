'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Footprints, History, Lock, Plus, RotateCw, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FUTURE_MAPS, MAP_SIZES, MAPS, type MapSize } from '@/lib/mock';
import {
  CATALOG,
  checkKit,
  footprint,
  initialDrafts,
  MAP_DIMENSIONS,
  newId,
  pieceOf,
  VERSIONS,
  type Draft,
  type Placed,
  type Zone,
  type ZoneKind,
} from './mapDraft';

/** Pixels per metre on the top-down grid. */
const PX = 32;
const SNAP = 0.2;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Selection = { type: 'piece' | 'zone'; id: string } | null;
type Drag = { type: 'piece' | 'zone' | 'resize'; id: string; dx: number; dz: number };

/**
 * The map editor (feature 7): Connecta team only. Owners never see it; they pick a template and
 * dress it in Room settings. A map is a top-down grid of catalog pieces plus zones. Publish stays
 * off until the standard kit is complete, so every published map can do everything.
 *
 * Mouse: pick a piece in the catalog, then click the grid to place it. Drag to move, R rotates,
 * Delete removes. Zones resize from their corner.
 */
export function MapEditor() {
  const [mapId, setMapId] = useState(MAPS[1]!.id);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [sizes, setSizes] = useState<Record<string, MapSize>>({ library: 'cosy', cafe: 'cosy', rooftop: 'cosy' });
  const [versions, setVersions] = useState(VERSIONS);
  const [live, setLive] = useState<Record<string, number>>({ library: 3, cafe: 2, rooftop: 1 });
  const [armed, setArmed] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const drag = useRef<Drag | null>(null);
  const board = useRef<HTMLDivElement>(null);

  const draft = drafts[mapId]!;
  const size = sizes[mapId]!;
  const dims = MAP_DIMENSIONS[size];
  const kit = checkKit(draft, size);
  const ready = kit.every((k) => k.ok);
  const map = MAPS.find((m) => m.id === mapId)!;
  const draftVersion = versions[mapId]![0]!.version + 1;

  const update = (fn: (d: Draft) => Draft) => setDrafts((all) => ({ ...all, [mapId]: fn(all[mapId]!) }));
  const piece = selected?.type === 'piece' ? draft.pieces.find((p) => p.id === selected.id) : undefined;
  const zone = selected?.type === 'zone' ? draft.zones.find((z) => z.id === selected.id) : undefined;

  const rotate = (id: string) =>
    update((d) => ({ ...d, pieces: d.pieces.map((p) => (p.id === id ? { ...p, rot: ((p.rot + 1) % 4) as Placed['rot'] } : p)) }));
  const remove = (sel: NonNullable<Selection>) => {
    update((d) =>
      sel.type === 'piece'
        ? { ...d, pieces: d.pieces.filter((p) => p.id !== sel.id) }
        : { ...d, zones: d.zones.filter((z) => z.id !== sel.id) },
    );
    setSelected(null);
  };
  const duplicate = (p: Placed) => {
    const copy = { ...p, id: newId(p.kind), x: clamp(p.x + 0.6, 0, dims.w - 0.4), z: clamp(p.z + 0.6, 0, dims.d - 0.4) };
    update((d) => ({ ...d, pieces: [...d.pieces, copy] }));
    setSelected({ type: 'piece', id: copy.id });
  };
  const addZone = (kind: ZoneKind) => {
    const z: Zone = {
      id: newId('zone'),
      name: kind === 'private' ? 'New private zone' : 'Open floor',
      kind,
      x: dims.w / 2 - 1.5,
      z: dims.d / 2 - 1.5,
      w: 3,
      d: 3,
    };
    update((d) => ({ ...d, zones: [...d.zones, z] }));
    setSelected({ type: 'zone', id: z.id });
    setArmed(null);
  };

  // Keyboard: R rotates, Delete/Backspace removes, Esc drops the armed piece and the selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') {
        setArmed(null);
        setSelected(null);
      } else if (selected && (e.key === 'Delete' || e.key === 'Backspace')) remove(selected);
      else if (selected?.type === 'piece' && e.key.toLowerCase() === 'r') rotate(selected.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const metres = (e: React.PointerEvent | React.MouseEvent) => {
    const r = board.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / PX, z: (e.clientY - r.top) / PX };
  };

  const onBoardClick = (e: React.MouseEvent) => {
    if (!armed) return setSelected(null);
    const c = pieceOf(armed);
    const m = metres(e);
    const p: Placed = {
      id: newId(armed),
      kind: armed,
      x: clamp(snap(m.x - c.w / 2), 0, dims.w - c.w),
      z: clamp(snap(m.z - c.d / 2), 0, dims.d - c.d),
      rot: 0,
    };
    update((d) => ({ ...d, pieces: [...d.pieces, p] }));
    setSelected({ type: 'piece', id: p.id });
    // Shift keeps the piece armed to place several
    if (!e.shiftKey) setArmed(null);
  };

  const startDrag = (e: React.PointerEvent, type: Drag['type'], id: string, x: number, z: number) => {
    e.stopPropagation();
    board.current!.setPointerCapture(e.pointerId);
    const m = metres(e);
    drag.current = { type, id, dx: m.x - x, dz: m.z - z };
    setSelected({ type: type === 'piece' ? 'piece' : 'zone', id });
  };

  const onMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g) return;
    const m = metres(e);
    if (g.type === 'piece')
      update((d) => ({
        ...d,
        pieces: d.pieces.map((p) => {
          if (p.id !== g.id) return p;
          const f = footprint(p);
          return { ...p, x: clamp(snap(m.x - g.dx), 0, dims.w - f.w), z: clamp(snap(m.z - g.dz), 0, dims.d - f.d) };
        }),
      }));
    else
      update((d) => ({
        ...d,
        zones: d.zones.map((z) => {
          if (z.id !== g.id) return z;
          if (g.type === 'resize')
            return { ...z, w: clamp(snap(m.x - z.x), 1.4, dims.w - z.x), d: clamp(snap(m.z - z.z), 1.4, dims.d - z.z) };
          return { ...z, x: clamp(snap(m.x - g.dx), 0, dims.w - z.w), z: clamp(snap(m.z - g.dz), 0, dims.d - z.d) };
        }),
      }));
  };

  const publish = () => {
    const note = `Edited ${new Date().toISOString().slice(0, 10)}`;
    setVersions((all) => ({
      ...all,
      [mapId]: [{ version: draftVersion, when: new Date().toISOString().slice(0, 10), note }, ...all[mapId]!],
    }));
    setLive((l) => ({ ...l, [mapId]: draftVersion }));
    toast.success(`${map.name} v${draftVersion} published. Rooms using it get a 60-second heads-up, then move over live.`);
  };

  const sources = [...new Set(CATALOG.map((c) => c.source))];

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-muted-foreground uppercase">
            <Lock className="size-3" /> Connecta team · map editor
          </p>
          <h1 className="text-lg font-black">
            {map.emoji} {map.name}{' '}
            <span className="text-sm font-bold text-muted-foreground">
              draft v{draftVersion} · live v{live[mapId]}
            </span>
          </h1>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {MAPS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMapId(m.id);
                setSelected(null);
                setArmed(null);
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-extrabold',
                mapId === m.id ? 'bg-card shadow-sm' : 'text-muted-foreground',
              )}
            >
              {m.emoji} {m.name}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {MAP_SIZES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSizes((all) => ({ ...all, [mapId]: s.id }))}
              className={cn('rounded-full px-3 py-1 text-xs font-extrabold', size === s.id ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              {s.name} · {MAP_DIMENSIONS[s.id].w}×{MAP_DIMENSIONS[s.id].d} m
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" className="rounded-full font-extrabold">
            <Link
              href="/servers/chanom/rooms/library"
              onClick={() => toast('Walk test: the draft opens in a test room only the team can see (the demo opens the Library)')}
            >
              <Footprints /> Walk test
            </Link>
          </Button>
          <Button
            className="rounded-full font-extrabold"
            disabled={!ready}
            onClick={publish}
            title={ready ? undefined : 'Finish the standard kit first'}
          >
            <Upload /> Publish v{draftVersion}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Catalog */}
        <aside className="flex w-full flex-none flex-col gap-3 overflow-y-auto border-b p-3 lg:w-60 lg:border-r lg:border-b-0">
          <div>
            <p className="mb-1.5 text-xs font-black">Zones</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => addZone('private')}
                className="rounded-xl border-2 border-dashed border-lavender-ink/40 bg-lavender p-2 text-left text-xs font-extrabold text-lavender-ink"
              >
                <Plus className="mb-0.5 size-3.5" /> Private zone
              </button>
              <button
                onClick={() => addZone('floor')}
                className="rounded-xl border-2 border-dashed border-mint-ink/40 bg-mint p-2 text-left text-xs font-extrabold text-mint-ink"
              >
                <Plus className="mb-0.5 size-3.5" /> Open floor
              </button>
            </div>
          </div>
          {sources.map((src) => (
            <div key={src}>
              <p className="mb-1.5 text-xs font-black">{src}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {CATALOG.filter((c) => c.source === src).map((c) => (
                  <button
                    key={c.kind}
                    onClick={() => setArmed(armed === c.kind ? null : c.kind)}
                    aria-pressed={armed === c.kind}
                    className={cn(
                      'rounded-xl border-2 p-1.5 text-left text-[11px] leading-tight font-bold',
                      armed === c.kind ? 'border-primary bg-secondary' : 'border-border hover:border-primary/40',
                    )}
                  >
                    <span className="block text-lg">{c.emoji}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            New CC0 packs are added by a developer (models checked for licence and size); then they show up here.
          </p>
        </aside>

        {/* The grid */}
        <main className="flex min-w-0 flex-1 flex-col gap-2 p-3">
          <p className="text-xs font-bold text-muted-foreground">
            {armed
              ? `Click the floor to place: ${pieceOf(armed).name}. Shift-click to place several, Esc to stop.`
              : 'Pick a piece on the left, then click the floor. Drag to move · R rotates · Delete removes.'}
          </p>
          <div className="overflow-auto rounded-2xl border bg-muted/40 p-3">
            <div
              ref={board}
              onClick={onBoardClick}
              onPointerMove={onMove}
              onPointerUp={() => (drag.current = null)}
              className={cn('relative rounded-lg bg-[#efe3cf] select-none dark:bg-[#4a3f33]', armed && 'cursor-crosshair')}
              style={{
                width: dims.w * PX,
                height: dims.d * PX,
                backgroundImage: 'linear-gradient(#0001 1px, transparent 1px), linear-gradient(90deg, #0001 1px, transparent 1px)',
                backgroundSize: `${PX}px ${PX}px`,
              }}
            >
              {draft.zones.map((z) => (
                <div
                  key={z.id}
                  onPointerDown={(e) => startDrag(e, 'zone', z.id, z.x, z.z)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'absolute cursor-move rounded-lg border-2 border-dashed p-1 text-[10px] font-black',
                    z.kind === 'private'
                      ? 'border-[#8a6fc9] bg-[#8a6fc9]/15 text-[#5b3f9a]'
                      : 'border-[#3f9a6b] bg-[#3f9a6b]/12 text-[#2a6b4a]',
                    selected?.id === z.id && 'ring-2 ring-primary',
                  )}
                  style={{ left: z.x * PX, top: z.z * PX, width: z.w * PX, height: z.d * PX }}
                >
                  {z.kind === 'private' ? '🔒' : '🟩'} {z.name}
                  <span
                    onPointerDown={(e) => startDrag(e, 'resize', z.id, z.x, z.z)}
                    className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-sm bg-primary"
                    aria-label="Resize"
                  />
                </div>
              ))}
              {draft.pieces.map((p) => {
                const c = pieceOf(p.kind);
                const f = footprint(p);
                return (
                  <div
                    key={p.id}
                    onPointerDown={(e) => startDrag(e, 'piece', p.id, p.x, p.z)}
                    onClick={(e) => e.stopPropagation()}
                    title={c.name}
                    className={cn(
                      'absolute grid cursor-move place-items-center rounded-md border bg-card/90 shadow-sm',
                      c.kit ? 'border-primary/40' : 'border-border',
                      selected?.id === p.id && 'ring-2 ring-primary',
                    )}
                    style={{ left: p.x * PX, top: p.z * PX, width: f.w * PX, height: f.d * PX, fontSize: Math.min(f.w, f.d) * PX * 0.6 }}
                  >
                    {c.emoji}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected item */}
          {piece && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-2 text-sm shadow-sm">
              <span className="font-extrabold">
                {pieceOf(piece.kind).emoji} {pieceOf(piece.kind).name}
              </span>
              <span className="text-xs text-muted-foreground">
                {piece.x.toFixed(1)}, {piece.z.toFixed(1)} m · {pieceOf(piece.kind).kit ? `counts as ${pieceOf(piece.kind).kit}` : 'decor'}
              </span>
              <span className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => rotate(piece.id)}>
                  <RotateCw /> Rotate
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => duplicate(piece)}>
                  <Copy /> Duplicate
                </Button>
                <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={() => remove(selected!)}>
                  <Trash2 /> Delete
                </Button>
              </span>
            </div>
          )}
          {zone && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-2 text-sm shadow-sm">
              <Input
                value={zone.name}
                maxLength={24}
                onChange={(e) =>
                  update((d) => ({ ...d, zones: d.zones.map((z) => (z.id === zone.id ? { ...z, name: e.target.value } : z)) }))
                }
                className="h-8 w-48 rounded-xl"
                aria-label="Zone name"
              />
              <span className="text-xs text-muted-foreground">
                {zone.kind === 'private'
                  ? 'Private: only people inside hear each other'
                  : 'Open floor: where Pick a Side and dancing happen'}{' '}
                · {zone.w.toFixed(1)}×{zone.d.toFixed(1)} m
              </span>
              <Button size="sm" variant="outline" className="ml-auto rounded-full text-destructive" onClick={() => remove(selected!)}>
                <Trash2 /> Delete
              </Button>
            </div>
          )}
        </main>

        {/* Kit check and versions */}
        <aside className="flex w-full flex-none flex-col gap-4 overflow-y-auto border-t p-3 lg:w-72 lg:border-t-0 lg:border-l">
          <section>
            <p className="mb-1.5 flex items-center justify-between text-xs font-black">
              Standard kit
              <span className={cn('rounded-full px-2 py-0.5 text-[10px]', ready ? 'bg-mint text-mint-ink' : 'bg-peach text-peach-ink')}>
                {ready ? 'Ready to publish' : `${kit.filter((k) => !k.ok).length} missing`}
              </span>
            </p>
            <ul className="flex flex-col gap-1">
              {kit.map((k) => (
                <li
                  key={k.id}
                  className={cn('flex items-start gap-2 rounded-xl px-2 py-1.5 text-xs', k.ok ? 'bg-muted/50' : 'bg-peach text-peach-ink')}
                >
                  {k.ok ? <Check className="mt-0.5 size-3.5 flex-none text-primary" /> : <X className="mt-0.5 size-3.5 flex-none" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{k.name}</span>
                    <span className="opacity-75">{map.look[k.id]}</span>
                  </span>
                  <span className="flex-none font-mono text-[10px]">{k.have}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Every map gets every piece, so every activity works anywhere.</p>
          </section>

          <section>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black">
              <History className="size-3.5" /> Versions
            </p>
            <ul className="flex flex-col gap-1">
              {versions[mapId]!.map((v) => (
                <li key={v.version} className="flex items-center gap-2 rounded-xl bg-muted/50 px-2 py-1.5 text-xs">
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">
                      v{v.version}{' '}
                      {live[mapId] === v.version && (
                        <span className="ml-1 rounded-full bg-mint px-1.5 text-[10px] text-mint-ink">live</span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {v.when} · {v.note}
                    </span>
                  </span>
                  {live[mapId] !== v.version && (
                    <button
                      onClick={() => {
                        setLive((l) => ({ ...l, [mapId]: v.version }));
                        toast(`Rolled back to v${v.version}. Rooms get a 60-second heads-up, then move over live.`);
                      }}
                      className="rounded-full border bg-card px-2 py-0.5 text-[10px] font-extrabold hover:bg-muted"
                    >
                      Roll back
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-black">Ideas for later</p>
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {FUTURE_MAPS.map((f) => (
                <li key={f.name}>
                  {f.emoji} <span className="font-bold text-foreground">{f.name}</span> · {f.idea}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
