'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const REASONS = [
  'Its name or picture',
  'Its description or rules',
  'What goes on inside',
  'Spam or a scam',
  'Someone may be in danger',
  'Something else',
];

/**
 * Report a whole room (feature 14): goes to the Connecta team only (the room's own mods may be the
 * problem), anonymous. The team can delist it from Discover or close it. People are reported from
 * their own "…" menu instead.
 */
export function ReportRoomDialog({ name, open, onOpenChange }: { name: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {name}</DialogTitle>
          <DialogDescription>Only the Connecta team sees this, not the room’s owner or mods. It’s anonymous.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              aria-pressed={reason === r}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-bold',
                reason === r ? 'border-primary bg-secondary text-secondary-foreground' : 'hover:bg-muted',
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea rows={3} maxLength={500} placeholder="Anything that helps (optional)" className="rounded-xl" />
        <DialogFooter>
          <Button variant="ghost" className="rounded-full font-bold" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!reason}
            className="rounded-full font-extrabold"
            onClick={() => {
              onOpenChange(false);
              setReason(null);
              toast.success('Thanks. The Connecta team will take a look.');
            }}
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
