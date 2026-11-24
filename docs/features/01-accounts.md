# 1. Accounts and guests

Passwordless sign-in (Google, Discord or a 6-digit email code). Accounts are 13+. Anyone can try a
room first as a guest, and a guest who signs up keeps their character.

## Guest or account

|                             | Guest                                            | Account                 |
| --------------------------- | ------------------------------------------------ | ----------------------- |
| Walk into a room            | by guest pass, or a Common room                  | yes                     |
| Bubbles                     | yes                                              | yes                     |
| Voice, photos, screen share | listen only (unless the room allows guest voice) | yes                     |
| Room chat, DMs, friends     | no                                               | yes (DMs: friends only) |
| Be a member, make a room    | no                                               | yes                     |
| Coins and quests            | no                                               | yes                     |

## Sign-up and sign-in (`/login`)

**One page for both** ([why](../decisions.md#accounts-and-safety)). Sign-up buttons open it as
"Join Connecta ✨" (`/login?new=1`, `SIGN_UP_HREF`); everything else as "Welcome back 👋". The
server decides whether the account is new.

1. Continue with Google, Discord or email → a code. An existing account goes straight to Home.
2. **Birthday** (never shown to anyone). Under 13: "Come back when you're 13 🌱", and that sign-in
   and browser wait a day.
3. **Character, display name** (up to 16 characters) and a unique **@handle**.
4. Let's go → Home. Leaving halfway picks up at the same step next time.

**@handle:** 3–20 characters, a–z 0–9 `.` `_`, no dot at either end. Reserved: admin, connecta,
support, mod, staff, help, guest. Suggestions when taken. Change it once every 30 days; the old one
is held for you for 30 days.

## Guests

- **A guest is a temporary account in this browser** (Better Auth's anonymous sign-in), reused
  from room to room. Name and look are picked at each door.
- **The door** (a guest pass `/g/<code>` or a Common room): pick a name and a look, answer "How
  old are you?" (under 13 locks that browser for a day), walk in. They get a "guest" badge.
- Inside, **Join <room> ✨** / **Make an account ✨** signs up and keeps the look and name.
- A guest account is deleted 30 days after its last session expires (a nightly job).

## Settings → Account

- Linked sign-ins (Google and Discord link to an account with the same verified email), birthday,
  **Appear offline**, **who can send me friend requests** (Anyone / People from my rooms / Nobody).
- **Deleting:** pick a new owner for each room you own (rooms with only you go), type your @handle.
  7 days to change your mind (signing in offers "Keep my account"). Then the account becomes
  "Deleted user" so messages still read; everything else goes; the @handle frees 30 days later.
  Plus is cancelled at once.
- **Under 18:** nothing extra yet. Every age rule goes through one `can(user, action)` check.

## In the code

- Better Auth: `apps/api/src/auth/auth.ts` (sessions in Postgres for 30 days, HttpOnly cookie;
  codes valid 10 minutes / 5 tries, rate-limited per IP; guests via the anonymous plugin).
- Sign-up steps, handles, settings, deleting, the guest door: `apps/api/src/accounts/`
  (`/api/me/*`, `/api/handles/:handle`; tables `age_locks`, `handle_holds`; hourly deletion job).
- Shared rules: `packages/shared/src/account.ts`. Web: `apps/web/src/app/login/page.tsx`,
  `features/account/`.
- Connecta's own user fields (`handle`, `birthday`, `look`) are written only by the accounts module.

## Not built yet

- "About me" on profiles.
