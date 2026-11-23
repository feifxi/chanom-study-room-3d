import type { Mail } from './mail.service.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type AccountActionKind = 'warn' | 'suspend' | 'ban' | 'lift' | 'reset_name';

/** "26 Nov 2026, 14:30 UTC": one clock for everyone the team writes to */
export const whenUtc = (d: Date) =>
  `${d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

/**
 * What the Connecta team did to an account, by email (admin site): the reason, and how to appeal,
 * which is replying to this email (no appeal form, on purpose).
 */
export function accountMail(to: string, kind: AccountActionKind, reason: string, until: Date | null): Mail {
  const line = {
    warn: 'This is a warning from the Connecta team about how you’ve been using Connecta.',
    suspend: `Your Connecta account is suspended until ${until ? whenUtc(until) : 'further notice'}. You can’t sign in until then.`,
    ban: 'Your Connecta account is banned. You can’t sign in any more.',
    lift: 'Good news: the Connecta team lifted the suspension on your account. You can sign in again.',
    reset_name: 'The Connecta team reset your display name. Pick a new one in Settings → Profile.',
  }[kind];
  const subject = {
    warn: 'A warning about your Connecta account',
    suspend: 'Your Connecta account is suspended',
    ban: 'Your Connecta account is banned',
    lift: 'Your Connecta account is back',
    reset_name: 'Your Connecta name was reset',
  }[kind];
  const appeal = kind === 'lift' ? '' : 'If you think we got this wrong, reply to this email and a person will look again.';
  return {
    to,
    subject,
    text: [line, reason && `Reason: ${reason}`, appeal].filter(Boolean).join('\n\n'),
    html: `<div style="font-family:system-ui,sans-serif;max-width:460px;margin:auto;padding:24px">
  <p style="font-size:16px">${esc(line)}</p>
  ${reason ? `<p style="font-size:15px"><b>Reason:</b> ${esc(reason)}</p>` : ''}
  ${appeal ? `<p style="color:#666;font-size:13px">${esc(appeal)}</p>` : ''}
</div>`,
  };
}

export type RoomActionKind = 'delist' | 'relist' | 'close' | 'reopen';

/** What the Connecta team did to a room, to its owner (admin site): the reason, and how to appeal. */
export function roomMail(to: string, kind: RoomActionKind, roomName: string, reason: string): Mail {
  const line = {
    delist: `The Connecta team took ${roomName} off Discover. Members and invite links still work.`,
    relist: `${roomName} is back on Discover.`,
    close: `The Connecta team closed ${roomName}. Nobody can walk in or chat there for now.`,
    reopen: `The Connecta team reopened ${roomName}. Everyone can walk in again.`,
  }[kind];
  const subject = {
    delist: `${roomName} was taken off Discover`,
    relist: `${roomName} is back on Discover`,
    close: `${roomName} was closed`,
    reopen: `${roomName} is open again`,
  }[kind];
  const appeal =
    kind === 'delist' || kind === 'close' ? 'If you think we got this wrong, reply to this email and a person will look again.' : '';
  return {
    to,
    subject,
    text: [line, reason && `Reason: ${reason}`, appeal].filter(Boolean).join('\n\n'),
    html: `<div style="font-family:system-ui,sans-serif;max-width:460px;margin:auto;padding:24px">
  <p style="font-size:16px">${esc(line)}</p>
  ${reason ? `<p style="font-size:15px"><b>Reason:</b> ${esc(reason)}</p>` : ''}
  ${appeal ? `<p style="color:#666;font-size:13px">${esc(appeal)}</p>` : ''}
</div>`,
  };
}
