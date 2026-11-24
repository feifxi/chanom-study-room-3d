/** The audit log's action codes (the API writes them) as words for the admin site */
const LABELS: Record<string, string> = {
  'account.warn': 'Warned',
  'account.suspend': 'Suspended',
  'account.ban': 'Banned',
  'account.lift': 'Lifted',
  'account.reset_name': 'Reset name',
  'room.delist': 'Delisted',
  'room.relist': 'Relisted',
  'room.close': 'Closed room',
  'room.reopen': 'Reopened room',
  'message.delete': 'Deleted message',
  'report.muted': 'Muted 15 min (reports)',
  'report.common_out': 'Out of Common rooms 1 h (reports)',
  'report.dismiss': 'Dismissed reports',
  'common.timeout': 'Timed out in a Common room',
  'common.remove': 'Removed from Common rooms',
  'common.notice': 'Posted a notice',
  'setting.common_seats': 'Changed Common room seats',
  'setting.moderation': 'Changed moderation',
  'setting.word_add': 'Added a word',
  'setting.word_remove': 'Removed a word',
  'payment.refund': 'Refunded',
  'roommod.kick': 'Kicked from a room',
  'roommod.ban': 'Banned from a room',
  'roommod.unban': 'Unbanned in a room',
  'roommod.timeout': 'Timed out in a room',
  'roommod.make_mod': 'Made a mod',
  'roommod.remove_mod': 'Removed as mod',
};

export function actionLabel(action: string): string {
  if (LABELS[action]) return LABELS[action];
  // A report decided with an account or room action: "Report: warn"
  if (action.startsWith('report.')) return `Decided reports: ${action.slice(7).replaceAll('_', ' ')}`;
  return action;
}

export const whenShort = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
