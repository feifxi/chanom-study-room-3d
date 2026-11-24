'use client';

import { useState } from 'react';
import { PERSON_REASONS, REPORT_DETAILS_MAX, type PersonReason } from '@connecta/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { problem } from '@/features/rooms/useRooms';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * Report a person or one of their messages (feature 14). It goes to the Connecta team only (a room's
 * mods may be the problem), and the person never learns who reported them. Enough reports from
 * different accounts in a room mute them there for a while; in Common rooms they're put out for an hour.
 */
export function ReportDialog({
  person,
  place,
  messageId,
  bubbles,
  canBlock,
  open,
  onOpenChange,
}: {
  person: { id: string; name: string; guest?: boolean };
  /** The room or Common copy it happened in */
  place?: string;
  /** Reporting one message (room chat or a DM) */
  messageId?: string;
  /** What they said in bubbles lately, as your screen showed it (bubbles aren't stored) */
  bubbles?: string[];
  /** Offer "Also block" (accounts reporting accounts) */
  canBlock: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [reason, setReason] = useState<PersonReason | ''>('');
  const [details, setDetails] = useState('');
  const [block, setBlock] = useState(canBlock);
  const [busy, setBusy] = useState(false);
  const blocking = block && canBlock;

  const send = async () => {
    if (!reason) return;
    setBusy(true);
    const { error } = await api.POST('/api/reports', {
      body: messageId
        ? { kind: 'message', messageId, reason, details: details || undefined, block: blocking }
        : { kind: 'person', userId: person.id, place, reason, details: details || undefined, block: blocking, bubbles },
    });
    setBusy(false);
    if (error) return toast.error(problem(error, 'Couldn’t send the report. Try again?'));
    toast.success(`Thanks. ${messageId ? 'The message' : person.name} was reported${blocking ? ` and ${person.name} blocked` : ''}.`);
    onOpenChange(false);
    setReason('');
    setDetails('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">{messageId ? `Report ${person.name}’s message` : `Report ${person.name}`}</DialogTitle>
          <DialogDescription>Only the Connecta team sees reports. {person.name} won’t know who reported them.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(v) => setReason(v as PersonReason)} className="gap-1">
          {PERSON_REASONS.map(({ id, label }) => (
            <Label
              key={id}
              htmlFor={`report-${id}`}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-bold',
                reason === id && 'border-primary bg-secondary',
              )}
            >
              <RadioGroupItem id={`report-${id}`} value={id} />
              {label}
            </Label>
          ))}
        </RadioGroup>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={REPORT_DETAILS_MAX}
          placeholder="What happened? (optional)"
          rows={2}
          className="rounded-xl"
        />
        {canBlock && (
          <Label className="flex items-center gap-2 text-sm font-bold">
            <Checkbox checked={block} onCheckedChange={(v) => setBlock(v === true)} /> Also block {person.name}
          </Label>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-full font-extrabold" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason || busy}
            className="rounded-full bg-destructive font-extrabold text-white hover:bg-destructive/90"
            onClick={() => void send()}
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
