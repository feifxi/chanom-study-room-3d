'use client';

import { useState } from 'react';
import { REPORT_DETAILS_MAX, ROOM_REASONS, type RoomReason } from '@connecta/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { problem } from '@/features/rooms/useRooms';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * Report a whole room (feature 14): goes to the Connecta team only (the room's own mods may be the
 * problem), anonymous. The team can delist it from Discover or close it. People are reported from
 * their own "…" menu instead.
 */
export function ReportRoomDialog({
  roomId,
  name,
  open,
  onOpenChange,
}: {
  roomId: string;
  name: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [reason, setReason] = useState<RoomReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!reason) return;
    setBusy(true);
    const { error } = await api.POST('/api/reports', { body: { kind: 'room', place: roomId, reason, details: details || undefined } });
    setBusy(false);
    if (error) return toast.error(problem(error, 'Couldn’t send the report. Try again?'));
    onOpenChange(false);
    setReason(null);
    setDetails('');
    toast.success('Thanks. The Connecta team will take a look.');
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {name}</DialogTitle>
          <DialogDescription>Only the Connecta team sees this, not the room’s owner or mods. It’s anonymous.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_REASONS.map(({ id: r, label }) => (
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
              {label}
            </button>
          ))}
        </div>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={REPORT_DETAILS_MAX}
          placeholder="Anything that helps (optional)"
          className="rounded-xl"
        />
        <DialogFooter>
          <Button variant="ghost" className="rounded-full font-bold" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!reason || busy} className="rounded-full font-extrabold" onClick={() => void send()}>
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
