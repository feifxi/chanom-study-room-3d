'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AdminTitle } from '@/features/admin/AdminFrame';
import { useModeration, useModerationChange, type Moderation } from '@/features/admin/useAdmin';
import { problem } from '@/features/rooms/useRooms';

type Layer = 'wordFilter' | 'reportSteps' | 'pictureCheck';

/**
 * The moderation layers (feature 14), cheap first: a word list, report-based steps, and OpenAI's free
 * moderation for pictures. Each switch applies everywhere at once (the API and the game servers)
 * and goes in the audit log.
 */
export default function ModerationPage() {
  const { data } = useModeration();
  const change = useModerationChange();
  const [word, setWord] = useState('');
  const run = (v: Parameters<typeof change.mutate>[0], done: string) =>
    change.mutate(v, { onSuccess: () => toast.success(done), onError: (e) => toast.error(problem(e)) });

  if (!data) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  const layers: [Layer | null, string, string][] = [
    [
      'wordFilter',
      'Word filter',
      'The English list plus ours below (Thai included). Rooms can turn it off for themselves; Common rooms can’t.',
    ],
    [null, 'Limits', 'Slow mode where a room asks for it; always on in Common rooms. Not a switch.'],
    ['reportSteps', 'Report steps', 'The automatic steps below. Off: reports still reach the team, nothing happens by itself.'],
    [
      'pictureCheck',
      'Picture check',
      data.pictureCheckReady
        ? 'OpenAI moderation on every chat picture before it shows.'
        : 'OpenAI moderation on every chat picture. Needs OPENAI_API_KEY on the API, which isn’t set, so pictures aren’t checked.',
    ],
  ];
  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <AdminTitle title="Moderation" note="Every message and picture goes through these layers, in this order." />

      <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
        {layers.map(([id, label, hint], i) => (
          <label key={label} className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-bold">
                {i + 1}. {label}
              </span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
            {id ? (
              <Switch
                checked={data[id as keyof Moderation] as boolean}
                disabled={change.isPending}
                onCheckedChange={(on) => run({ switches: { [id]: on } }, `${label} ${on ? 'on' : 'off'} everywhere`)}
              />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">always</span>
            )}
          </label>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border bg-card p-4">
        <h2 className="font-black">Automatic steps from reports</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          <li className="rounded-2xl bg-muted/60 px-3 py-2">
            <b>In any room:</b> 3 reports in 10 min → muted 15 min, and flagged in Reports.
          </li>
          <li className="rounded-2xl bg-muted/60 px-3 py-2">
            <b>In Common rooms:</b> 5 reports in 30 min from different accounts → out of Common rooms for 1 hour, and flagged in Reports.
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing else is automatic: warnings, suspensions and bans are always a person’s call.
        </p>
      </section>

      <section className="mt-6 rounded-3xl border bg-card p-4">
        <h2 className="font-black">Our word list</h2>
        <p className="text-xs text-muted-foreground">
          On top of the standard English list. Masked as *** in chat and bubbles, refused in names and room text. Thai words match inside
          other text, so add only words that can’t be part of an ordinary word.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const w = word.trim();
            if (!w) return;
            change.mutate(
              { add: w },
              {
                onSuccess: () => {
                  toast.success(`“${w}” is filtered everywhere from now on`);
                  setWord('');
                },
                onError: (err) => toast.error(problem(err)),
              },
            );
          }}
        >
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            maxLength={60}
            placeholder="Add a word or link"
            className="rounded-full"
          />
          <Button type="submit" disabled={!word.trim() || change.isPending} className="rounded-full font-extrabold">
            Add
          </Button>
        </form>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {data.words.map((w) => (
            <li key={w} className="flex items-center gap-1 rounded-full border bg-muted/60 py-0.5 pr-1 pl-3 text-xs font-bold">
              {w}
              <button
                onClick={() => run({ remove: w }, `“${w}” is allowed again`)}
                aria-label={`Remove ${w}`}
                className="rounded-full p-0.5 hover:bg-card"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
          {!data.words.length && <li className="text-xs text-muted-foreground">Only the English list for now.</li>}
        </ul>
      </section>
    </div>
  );
}
