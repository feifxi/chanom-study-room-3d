'use client';

import { useState } from 'react';
import { ChevronDown, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  AI_PER_DAY,
  BUILT_IN,
  aiUsedToday,
  makeAiDeck,
  type Deck,
  type DeckKind,
  type DeckShelf,
  type Question,
  type ShelfDeck,
} from './decks';

type Tab = 'built-in' | 'room' | 'ai';

/**
 * The host's deck choice in the lobby: built-in topics, the room's own decks (written by its
 * members), or (the demo, and after Plus) an AI deck made from a topic. Only decks that fit the mode
 * show (two answers for Would you rather, four for the quizzes).
 */
export function DeckPicker({ deck, kind, onPick, shelf }: { deck: Deck; kind: DeckKind; onPick: (d: Deck) => void; shelf: DeckShelf }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(deck.source === 'ai' && !shelf.ai ? 'built-in' : deck.source);
  const [editing, setEditing] = useState<ShelfDeck | 'new' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const mine = shelf.decks.filter((d) => d.kind === kind);
  const tabs = (
    [
      ['built-in', 'Built in'],
      ['room', 'This room'],
      ['ai', '✨ AI'],
    ] as const
  ).filter(([id]) => id !== 'ai' || shelf.ai);
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
          <div
            className={cn('mb-2 grid gap-1 rounded-full bg-muted p-1 text-xs font-bold', tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}
            role="tablist"
          >
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

          {tab === 'ai' && shelf.ai && <AiDeck kind={kind} onUse={pick} shelf={shelf} />}
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

/** Type a topic, get 15 questions, glance over them, use them (and keep them if you like). */
function AiDeck({ kind, onUse, shelf }: { kind: DeckKind; onUse: (d: Deck) => void; shelf: DeckShelf }) {
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<Deck | null>(null);
  const [saved, setSaved] = useState(false);
  const used = aiUsedToday();
  const left = Math.max(0, AI_PER_DAY - used);
  const make = async () => {
    if (!topic.trim() || busy || !left) return;
    setBusy(true);
    setMade(await makeAiDeck(topic, kind));
    setSaved(false);
    setBusy(false);
  };

  if (made)
    return (
      <div className="flex flex-col gap-2">
        <p className="px-1 text-xs font-black">
          ✨ {made.name} · {made.questions.length} questions
        </p>
        <ol className="flex max-h-48 list-decimal flex-col gap-1 overflow-y-auto rounded-xl bg-muted/60 py-2 pr-2 pl-7 text-[11px]">
          {made.questions.map((q) => (
            <li key={q.id}>
              <span className="font-bold">{q.q}</span> <span className="text-muted-foreground">{q.answers.join(' / ')}</span>
            </li>
          ))}
        </ol>
        <p className="px-1 text-[10px] text-muted-foreground">Demo: the real AI writes these about your topic.</p>
        <div className="flex gap-1.5">
          <button onClick={() => setMade(null)} className="rounded-full border px-3 py-1.5 text-xs font-extrabold hover:bg-muted">
            Try again
          </button>
          <button
            onClick={async () => {
              if (await shelf.save({ name: made.name, kind: made.kind, questions: made.questions })) setSaved(true);
            }}
            disabled={saved}
            className="rounded-full border px-3 py-1.5 text-xs font-extrabold hover:bg-muted disabled:text-muted-foreground"
          >
            {saved ? 'Saved ✓' : 'Save to this room'}
          </button>
          <button
            onClick={() => onUse(made)}
            className="flex-1 rounded-full bg-primary py-1.5 text-xs font-extrabold text-primary-foreground hover:bg-primary-ink"
          >
            Use it
          </button>
        </div>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void make();
      }}
    >
      <p className="px-1 text-xs text-muted-foreground">
        Type a topic and AI writes 15 {kind === 'quiz' ? 'quiz questions' : '“would you rather” questions'}.
      </p>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={kind === 'quiz' ? 'e.g. Thai history, chapter 3 biology' : 'e.g. school trips, K-pop'}
        maxLength={60}
        className="h-9 rounded-full border bg-card px-3 text-sm"
        aria-label="Topic"
      />
      <button
        type="submit"
        disabled={!topic.trim() || busy || !left}
        className="flex items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-xs font-extrabold text-primary-foreground hover:bg-primary-ink disabled:opacity-45"
      >
        <Sparkles className="size-3.5" /> {busy ? 'Writing questions…' : 'Make 15 questions'}
      </button>
      <p className="text-center text-[10px] text-muted-foreground">
        {left} of {AI_PER_DAY} AI decks left today{AI_PER_DAY < 10 && ' · more with Plus'}
      </p>
    </form>
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
