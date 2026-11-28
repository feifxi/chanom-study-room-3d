# Open issues

Things noticed while building and not fixed. Every change that notices something it doesn't fix
adds a line here; a fix removes it. Bigger planned work is in the [roadmap](roadmap.md).

## Before deploying

- No Dockerfile for the game server (`apps/game`).
- Room and Common room keys in Redis (`common:*`, the game channels) aren't prefixed per
  environment like the settings are, so tests and a running dev server share them.
- Real Stripe hasn't run end to end (no keys yet): checkout, webhooks and refunds are tested only
  against a fake Stripe and the local stand-in.
- The picture check hasn't run against OpenAI (no key yet).

## Code cleanup

- The perf check isn't in CI (it needs the whole app and the seed).
- On a phone, a room's chat header cuts its count without an ellipsis ("0/15" reads "0/1") when the
  name and map are long (`PlaceChat.tsx`).
- The game test "a reload mid-game keeps your cards" (Slave) sometimes times out in a full
  `pnpm check` (about 1 run in 5 on a busy machine); it passes alone. Its 5 s wait is tight.

## Moderation

- A room's **Slow mode** and **New members wait 10 minutes to talk** switches are saved and shown in
  Room settings, but nothing enforces them yet (Common rooms' 3-second bubble limit does work).

- A mod's Mute for everyone isn't in the audit log (it lives only on the game server); kick, ban,
  time out and mod changes are.
- Draw & Guess drawings can't be checked (only its writing is filtered).
- A guest who gets a new browser escapes a mute or a guest-door age lock (no device fingerprinting,
  on purpose).
- A Google or Discord sign-in while suspended shows a generic message (Better Auth passes back
  only a code); email sign-in shows the reason.
- The Thai word list is short and needs a native speaker's pass. Messages sent before the filter
  aren't masked.

## Admin site

- Users and Rooms show the newest 50 with search, no paging; Done reports the latest 300.
- Reports refresh every 60 s and Common copies every 15 s, not live.
- Changing Common seats doesn't move anyone already in a copy.
- Money doesn't show the server bill or failed renewals (not tracked).
- Online now scans every tab in Redis; a gateway-kept counter would scale better.

## Plus and payments

- No plan change: while a plan renews, a new checkout is refused (cancel, then buy).
- PromptPay plans have no "Change": switching to a card happens at the next renewal's checkout.
- Receipts are simple, not Thai tax invoices (no tax ID or VAT line); needed if Connecta registers
  for VAT.
- A card plan bought while gifted Plus is left starts today (the overlap is lost).
- Gift Plus's hint can't say whether the friend has Plus already.
- Plus ending runs up to 10 minutes late (the sweep's pace). Grace's end applies to the next
  people in.
- PromptPay renewal uses our payment page, not Stripe's invoice reminders.
- Screen-share quality is capped only in the browser.

## 3D and performance

- The perf check doesn't dress the crowd in Shop items.
- A saved look is sent to every room on every game server.
- The perf check's pretend Buddy Machine stands still (drawing is what it measures, not their walking).
- A cat napping on a high shelf may be out of reach to pet.
- On phones, the small chess and Slave watch views cover the "Press E" hint; a headless phone test
  couldn't sit by tapping the hint (check on a real phone).
- Between 768 and 1080 px wide, a wide prompt above the dock could overlap the raised chat panel.
- LiveKit logs harmless console errors for someone taken out of voice.

## Small UX

- To-dos can't be reordered.
- Focus minutes count toward the quest when a round ends, not minute by minute.
- The Everyone ranking's cache lives in each API process (fine with one).
- Bubbles in seeded reports are made up; the seeded picture is lost when the AWS Emulator
  restarts (rerun `pnpm db:seed`).
