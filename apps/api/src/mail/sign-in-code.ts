import type { Mail } from './mail.service.js';

/** The 6-digit sign-in code email. Mood first, like the rest of the app's copy. */
export function signInCodeMail(to: string, code: string): Mail {
  return {
    to,
    subject: `${code} is your Connecta code`,
    text: `Your Connecta code is ${code}\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px">
  <p style="font-size:16px">Here's your code to come in ✨</p>
  <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:16px 0">${code}</p>
  <p style="color:#666;font-size:14px">It works for 10 minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`,
  };
}
