'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AdminTitle } from '@/features/admin/AdminFrame';
import { WORDS } from '@/features/admin/adminData';

/**
 * The moderation step (plan: one `moderate()` with layers that switch on or off). Cheap first: a
 * word list, limits, report-based actions, and OpenAI's free moderation for pictures and smarter
 * text. Paid AI checks only if these aren't enough.
 */
const LAYERS: [string, string, boolean][] = [
  ['Word filter', 'The obscenity list plus ours below (Thai included). Rooms can turn it off; Common rooms can’t.', true],
  ['Limits', 'Slow mode and link caps where a room asks for them; always on in Common rooms.', true],
  ['Report actions', 'The automatic steps below, from reports by different accounts.', true],
  ['Picture check', 'OpenAI moderation on every picture before it shows (free tier; check it’s still free).', true],
  ['Smarter text check', 'OpenAI moderation on text the word filter lets through. Off until needed.', false],
];

export default function ModerationPage() {
  const [words, setWords] = useState(WORDS);
  const [word, setWord] = useState('');
  const add = () => {
    const w = word.trim();
    if (!w) return;
    if (words.includes(w)) return toast('Already on the list');
    setWords([w, ...words]);
    setWord('');
    toast.success(`“${w}” is filtered everywhere from now on`);
  };

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <AdminTitle title="Moderation" note="Every message and picture goes through these layers, in this order." />

      <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
        {LAYERS.map(([label, hint, on], i) => (
          <label key={label} className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-bold">
                {i + 1}. {label}
              </span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
            <Switch defaultChecked={on} />
          </label>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border bg-card p-4">
        <h2 className="font-black">Automatic steps from reports</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          <li className="rounded-2xl bg-muted/60 px-3 py-2">
            <b>In any room:</b> 3 reports in 10 min → muted 15 min, and flagged here.
          </li>
          <li className="rounded-2xl bg-muted/60 px-3 py-2">
            <b>In Common rooms:</b> 5 reports in 30 min from different accounts → out of Common rooms for 1 hour, and flagged here.
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing else is automatic: warnings, suspensions and bans are always a person’s call.
        </p>
      </section>

      <section className="mt-6 rounded-3xl border bg-card p-4">
        <h2 className="font-black">Our word list</h2>
        <p className="text-xs text-muted-foreground">On top of the standard list. Matches are hidden as ••• for everyone.</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Add a word or link" className="rounded-full" />
          <Button type="submit" className="rounded-full font-extrabold">
            Add
          </Button>
        </form>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {words.map((w) => (
            <li key={w} className="flex items-center gap-1 rounded-full border bg-muted/60 py-0.5 pr-1 pl-3 text-xs font-bold">
              {w}
              <button
                onClick={() => setWords(words.filter((x) => x !== w))}
                aria-label={`Remove ${w}`}
                className="rounded-full p-0.5 hover:bg-card"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
