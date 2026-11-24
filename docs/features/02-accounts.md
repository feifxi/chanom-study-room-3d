# 2. Accounts and sign-up

Passwordless sign-in (Google, Discord or a 6-digit email code), accounts are 13+, and anyone can
try a room first as a guest. A guest who signs up keeps their character.

## Guest or account

|                             | Guest                                            | Account                 |
| --------------------------- | ------------------------------------------------ | ----------------------- |
| Walk into a room            | by guest pass, or a Common room                  | yes                     |
| Bubbles                     | yes                                              | yes                     |
| Voice, photos, screen share | listen only (unless the room allows guest voice) | yes                     |
| Room chat, DMs, friends     | no                                               | yes (DMs: friends only) |
| Be a member, make a room    | no                                               | yes                     |

Guests get a "guest" badge and enter no birthday.

## Sign-up and sign-in (`/login`)

**One page for both** ([why](../decisions.md#accounts-and-safety)). Sign up buttons open it as
"Join Connecta ✨" (`/login?new=1`, `SIGN_UP_HREF`); everything else as "Welcome back 👋". The
server decides whether the account is new.

1. Continue with Google, Discord, or email → code. An existing account goes straight to Home.
2. **Birthday** (never shown to anyone). Under 13: "Come back when you're 13 🌱", and that sign-in
   and browser wait a day before trying again.
3. **Character, display name** (up to 16 characters) and a unique **@handle**.
4. Let's go → Home. Leaving halfway picks up at the same step next time.

**@handle:** 3–20 characters, a–z 0–9 `.` `_`, no dot at either end. Reserved: admin, connecta,
support, mod, staff, help, guest. Suggestions when taken. Change it once every 30 days; the old one
is held for you for 30 days.

## Guests

From a guest pass (`/g/<code>`) or a Common room: pick a name and a look, walk in. Inside they get a
**Join <room> ✨** / **Make an account ✨** button; signing up from there keeps the look and name.
A guest account goes after 30 days once its last session has expired (a nightly job).

## Settings → Account

Linked sign-ins (Google and Discord link to an account with the same verified email), birthday,
Appear offline, who can send me friend requests (Anyone / People from my rooms / Nobody).

**Deleting:** pick a new owner for each room you own (rooms with only you go), type your @handle
to confirm. 7 days to change your mind (signing in offers "Keep my account"). Then the account
becomes "Deleted user" so messages still read; everything else goes; the @handle frees 30 days
later. Plus is cancelled at once.

**Under 18:** nothing extra yet. Every age rule goes through one `can(user, action)` check.

## In the code

- Better Auth: `apps/api/src/auth/auth.ts` (sessions in Postgres for 30 days, HttpOnly cookie,
  codes valid 10 minutes / 5 tries, rate-limited per IP; guests via its anonymous plugin)
- Sign-up steps, handles, settings, deleting: `apps/api/src/accounts/` (`/api/me/*`,
  `/api/handles/:handle`; the hourly deletion job; `age_locks`, `handle_holds`)
- Rules shared with the web app: `packages/shared/src/account.ts`
- Web: `apps/web/src/app/login/page.tsx`, `features/account/`

## Not built yet

- "About me" on profiles (not specced).
- Clearing out guest accounts nobody came back for.
