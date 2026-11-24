// Signs a Playwright browser context in as a seed person with an email code from Mailpit (the
// scripts need `pnpm db:seed`, the API and Mailpit running).
export async function signIn(ctx, base, email) {
  const headers = { origin: base };
  const send = await ctx.request.post(`${base}/api/auth/email-otp/send-verification-otp`, { headers, data: { email, type: 'sign-in' } });
  if (!send.ok()) throw new Error(`Couldn't send a code to ${email} (${send.status()}): is the API running?`);
  // Mailpit lists the newest first
  const inbox = await (await fetch(`${process.env.MAILPIT_URL ?? 'http://localhost:8025'}/api/v1/messages`)).json();
  const otp = inbox.messages.find((m) => m.To[0]?.Address === email)?.Subject.slice(0, 6);
  const res = await ctx.request.post(`${base}/api/auth/sign-in/email-otp`, { headers, data: { email, otp } });
  if (!res.ok()) throw new Error(`Couldn't sign in as ${email} (${res.status()}): run pnpm db:seed?`);
}
