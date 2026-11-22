'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AtSign, Check, Loader2 } from 'lucide-react';
import { handleProblem } from '@connecta/shared';
import { Label } from '@/components/ui/label';
import { api, type HandleCheck } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/** ok: null while the server is being asked. */
export type HandleState = { ok: true } | { ok: null } | { ok: false; reason: string; suggestions: string[] };

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Whether a handle can be used: its shape is checked right away, then the server is asked (after a
 * short pause in typing). `taken` is the server's answer from a submit that lost a race.
 */
export function useHandleCheck(handle: string, taken: HandleCheck | null = null): HandleState {
  const problem = handleProblem(handle);
  const debounced = useDebounced(handle, 300);
  const remote = useQuery({
    queryKey: ['handle', debounced],
    queryFn: async () => (await api.GET('/api/handles/{handle}', { params: { path: { handle: debounced } } })).data ?? null,
    enabled: problem === null && debounced === handle,
    staleTime: 10_000,
  });
  if (problem) return { ok: false, reason: problem, suggestions: [] };
  if (taken?.handle === handle) return { ok: false, reason: taken.reason ?? 'Taken', suggestions: taken.suggestions };
  if (remote.data && remote.data.handle === handle) {
    return remote.data.available
      ? { ok: true }
      : { ok: false, reason: remote.data.reason ?? 'Taken', suggestions: remote.data.suggestions };
  }
  return { ok: null };
}

/** Your unique @handle: how friends add you and how @mentions find you. Checked as you type. */
export function HandleField({ handle, check, onChange }: { handle: string; check: HandleState; onChange: (handle: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="handle" className="text-xs font-bold text-muted-foreground">
        Your @handle <span className="font-semibold">(friends add you with it)</span>
      </Label>
      <label
        className={cn(
          'flex h-11 items-center gap-1.5 rounded-xl border bg-card px-3 focus-within:ring-2',
          check.ok === false ? 'border-destructive/50 focus-within:ring-destructive/30' : 'focus-within:ring-primary/40',
        )}
      >
        <AtSign className="size-4 flex-none text-muted-foreground" />
        <input
          id="handle"
          value={handle}
          maxLength={20}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
        />
        {check.ok === true && <Check className="size-4 flex-none text-mint-ink" aria-label="Available" />}
        {check.ok === null && <Loader2 className="size-4 flex-none animate-spin text-muted-foreground" aria-label="Checking" />}
      </label>
      {check.ok === true ? (
        <p className="text-xs font-semibold text-mint-ink">@{handle} is yours if you want it</p>
      ) : check.ok === null ? (
        <p className="text-xs font-semibold text-muted-foreground">Checking @{handle}…</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-destructive">{check.reason}</span>
          {check.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="rounded-full bg-secondary px-2 py-0.5 font-bold text-secondary-foreground hover:bg-secondary/70"
            >
              @{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
