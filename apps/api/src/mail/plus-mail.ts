import type { Mail } from './mail.service.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A Plus heads-up by email (spec 15): the same words as the 🔔 notice, and one button. */
export function plusMail(to: string, m: { subject: string; line: string; button: string; link: string }): Mail {
  return {
    to,
    subject: m.subject,
    text: `${m.line}\n\n${m.button}: ${m.link}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px">
  <p style="font-size:16px">${esc(m.line)}</p>
  <p style="margin:20px 0"><a href="${esc(m.link)}" style="background:#e8772e;color:#fff;padding:10px 18px;border-radius:999px;font-weight:700;text-decoration:none">${esc(m.button)}</a></p>
  <p style="color:#666;font-size:13px">Nothing in your rooms is ever deleted.</p>
</div>`,
  };
}
