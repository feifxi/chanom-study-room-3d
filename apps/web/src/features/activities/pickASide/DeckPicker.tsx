'use client';

import { useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { BUILT_IN, type Deck, type DeckKind, type DeckShelf, type Question, type ShelfDeck } from './decks';

type Tab = 'built-in' | 'room';

/**
 * The host's deck choice in the lobby: built-in topics or the room's own decks (written by its
 * members). Only decks that fit the mode show (two answers for Would you rather, four for the
 * quizzes). AI decks come with Plus later.
 */
export function DeckPicker({ deck, kind, onPick, shelf }: { deck: Deck; kind: DeckKind; onPick: (d: Deck) => void; shelf: DeckShelf }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(deck.source === 'room' ? 'room' : 'built-in');
  const [editing, setEditing] = useState<ShelfDeck | 'new' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const mine = shelf.decks.filter((d) => d.kind === kind);
  const tabs = [
    ['built-in', 'Built in'],
    ['room', 'This room'],
  ] as const;
  const pick = (d: Deck) => {
    onPick(d);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex h-8 w-full items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-bold hover:bg-muted">
            <span className="text-muted-foreground">Deck</span>
            <span className="min-w-0 flex-1 truncate text-left">
              {deck.emoji} {deck.name}
            </span>
            <span className="text-muted-foreground">{deck.questions.length} Qs</span>
            <ChevronDown className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-[340px] rounded-2xl p-2">
          <div className={cn('mb-2 grid gap-1 rounded-full bg-muted p-1 text-xs font-bold', 'grid-cols-2')} role="tablist">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn('rounded-full py-1', tab === id ? 'bg-card shadow-sm' : 'text-muted-foreground')}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'built-in' && (
            <div className="grid grid-cols-2 gap-1">
              {BUILT_IN.filter((d) => d.kind === kind).map((d) => (
                <DeckButton key={d.id} d={d} on={d.id === deck.id} onClick={() => pick(d)} />
              ))}
            </div>
          )}

          {tab === 'room' && (
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {mine.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {shelf.canAdd
                    ? 'Write questions for this room: your inside jokes, your class notes. Everyone here can play them.'
                    : 'No decks in this room yet. Members can write some.'}
                </p>
              )}
              {mine.map((d) => (
                <div key={d.id} className="flex items-center gap-1">
                  <DeckButton d={d} by={d.by} on={d.id === deck.id} onClick={() => pick(d)} />
                  {d.mine ? (
                    <button
                      onClick={() => setEditing(d)}
                      aria-label={`Edit ${d.name}`}
                      className="grid size-8 flex-none place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  ) : (
                    d.canDelete &&
                    (deleting === d.id ? (
                      <button
                        onClick={() => {
                          setDeleting(null);
                          void shelf.remove(d.id);
                        }}
                        className="h-8 flex-none rounded-lg bg-destructive/10 px-2 text-[11px] font-extrabold text-destructive"
                      >
                        Delete?
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleting(d.id)}
                        aria-label={`Delete ${d.name}`}
                        className="grid size-8 flex-none place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ))
                  )}
                </div>
              ))}
              {shelf.canAdd && (
                <button
                  onClick={() => setEditing('new')}
                  className="flex items-center justify-center gap-1 rounded-xl border border-dashed py-2 text-xs font-extrabold hover:bg-muted"
                >
                  <Plus className="size-3.5" /> New deck
                </button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {editing && (
        <DeckEditor
          deck={editing === 'new' ? null : editing}
          kind={kind}
          shelf={shelf}
          onClose={() => setEditing(null)}
          onSaved={(d) => {
            setEditing(null);
            pick(d);
          }}
        />
      )}
    </>
  );
}

function DeckButton({ d, on, onClick, by }: { d: Deck; on: boolean; onClick: () => void; by?: string | null }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-bold hover:bg-muted',
        on && 'bg-secondary hover:bg-secondary',
      )}
    >
      <span className="text-base">{d.emoji}</span>
      <span className="min-w-0 flex-1 truncate">
        {d.name}
        {by && <span className="block truncate text-[10px] font-semibold text-muted-foreground">by {by}</span>}
      </span>
      <span className="text-[10px] text-muted-foreground">{d.questions.length}</span>
    </button>
  );
}

let nextId = 0;
const blankQuestion = (kind: DeckKind): Question => ({
  id: `q-${Date.now()}-${nextId++}`,
  q: '',
  answers: Array<string>(kind === 'quiz' ? 4 : 2).fill(''),
  right: kind === 'quiz' ? 0 : undefined,
});

/** Write or change one of your decks for this room. Needs a name and at least 3 finished questions. */
function DeckEditor({
  deck,
  kind,
  shelf,
  onClose,
  onSaved,
}: {
  deck: ShelfDeck | null;
  kind: DeckKind;
  shelf: DeckShelf;
  onClose: () => void;
  onSaved: (d: Deck) => void;
}) {
  const blank = () => blankQuestion(kind);
  const [name, setName] = useState(deck?.name ?? '');
  const [qs, setQs] = useState<Question[]>(deck?.questions ?? [blank(), blank(), blank()]);
  const done = qs.filter((q) => q.q.trim() && q.answers.every((a) => a.trim()));
  const [busy, setBusy] = useState(false);
  const ok = name.trim() && done.length >= 3 && !busy;
  const edit = (i: number, change: Partial<Question>) => setQs(qs.map((q, j) => (j === i ? { ...q, ...change } : q)));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3 rounded-3xl sm:max-w-xl">
        <DialogTitle>{deck ? 'Edit deck' : 'New deck'}</DialogTitle>
        <DialogDescription>
          {kind === 'quiz' ? 'Four answers each; tick the right one.' : 'Two answers each, no right one.'} It stays in this room: everyone
          here can play it.
        </DialogDescription>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Deck name, e.g. Our friend group"
          maxLength={40}
          className="h-9 rounded-full border bg-card px-3 text-sm font-bold"
          aria-label="Deck name"
        />
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1">
          {qs.map((q, i) => (
            <div key={q.id} className="flex flex-col gap-1.5 rounded-2xl bg-muted/60 p-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 text-center text-xs font-black text-muted-foreground">{i + 1}</span>
                <input
                  value={q.q}
                  onChange={(e) => edit(i, { q: e.target.value })}
                  placeholder={kind === 'quiz' ? 'Question' : 'Would you rather…'}
                  maxLength={120}
                  className="h-8 min-w-0 flex-1 rounded-full border bg-card px-3 text-sm"
                  aria-label={`Question ${i + 1}`}
                />
                <button
                  onClick={() => setQs(qs.filter((_, j) => j !== i))}
                  aria-label={`Remove question ${i + 1}`}
                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-card"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pl-6">
                {q.answers.map((a, k) => (
                  <label key={k} className="flex items-center gap-1.5">
                    {kind === 'quiz' && (
                      <input
                        type="radio"
                        name={`right-${q.id}`}
                        checked={q.right === k}
                        onChange={() => edit(i, { right: k })}
                        aria-label={`Answer ${k + 1} is right`}
                        className="accent-[var(--primary)]"
                      />
                    )}
                    <input
                      value={a}
                      onChange={(e) => edit(i, { answers: q.answers.map((x, j) => (j === k ? e.target.value : x)) })}
                      placeholder={`Answer ${'ABCD'[k]}`}
                      maxLength={40}
                      className="h-8 min-w-0 flex-1 rounded-full border bg-card px-3 text-xs"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setQs([...qs, blank()])}
            className="flex items-center justify-center gap-1 rounded-xl border border-dashed py-2 text-xs font-extrabold hover:bg-muted"
          >
            <Plus className="size-3.5" /> Add a question
          </button>
        </div>
        <div className="flex items-center gap-2">
          {deck && (
            <button
              onClick={async () => {
                await shelf.remove(deck.id);
                onClose();
              }}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-extrabold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground">{done.length} ready · needs 3</span>
          <button
            disabled={!ok}
            onClick={async () => {
              setBusy(true);
              const saved = await shelf.save({ id: deck?.id, name: name.trim(), kind, questions: done });
              setBusy(false);
              if (saved) onSaved(saved);
            }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground hover:bg-primary-ink disabled:opacity-45"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
