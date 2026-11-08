# 2. Accounts and sign-up

Status: decided (2026-11-08). Overview: [`docs/v2-plan.md`](../../v2-plan.md).

Try it: `pnpm --filter @study/demo demo:dev` → http://localhost:3100/login, and
http://localhost:3100/invite/abc for the guest path.

## Who can do what

|                                 | Guest (no account)                | Account                 |
| ------------------------------- | --------------------------------- | ----------------------- |
| Walk into a room                | by invite link, or a drop-in room | yes                     |
| Bubbles (text over heads)       | yes                               | yes                     |
| Voice, photos, screen share     | no (listen only)                  | yes                     |
| Room chat (saved), DMs, friends | no                                | yes (DMs: friends only) |
| Be a member of a room, make one | no                                | yes                     |
| Badge                           | "guest" next to the name          | none                    |

Guest invites expire (the demo says 23 hours). The 13+ rule applies to accounts; a guest enters no
birthday (they can't DM, add friends or talk).

## Sign-up and sign-in (`/login`)

1. **How:** Continue with Google, Continue with Discord, or email → a 6-digit code (no passwords).
   An existing account goes straight to Home after this step (not shown in the demo).
2. **Birthday:** "When's your birthday? 🎂", never shown to anyone. The full date is stored.
3. **Under 13:** a friendly stop: "Come back when you're 13 🌱", with a way back to the start.
   This device and that sign-in wait **a day** before another birthday can be tried, so it isn't
   just "pick another year". (The demo has a "clear the age lock" link.)
4. **You:** the character editor (the same one as in Settings), a **display name** (up to 16
   characters, shown over your head, doesn't need to be unique) and a unique **@handle**.
5. **Let's go** → Home.

### @handle

- Used to add friends and for @mentions. 3–20 characters: a–z, 0–9, `.` and `_`; no dot at the
  start or end. Lowercase only.
- **Filled in for you** from the display name until you type in it yourself.
- **Checked as you type:** ✓ "@mochi is yours if you want it", or "@maimai is taken" with tappable
  suggestions (`maimai_`, `maimai.26`, `its.maimai`). Some names are reserved (admin, connecta,
  support, mod, staff, help, guest).
- Thai or emoji display names give an empty guess, so you type one.
- **Changing it later:** in Settings, once every 30 days. The old handle stays held for you for those
  30 days, so nobody can grab it and pretend to be you.

## Guests (`/invite/[code]`)

1. The invite shows who invited you, the room, who's inside and its map.
2. **Walk in as a guest:** your name → **Pick how you look** (the same character editor) → Walk in.
   The copy says what guests can't do: talk, send photos, share a screen, see the saved room chat.
3. **In the room:** the card shows a "guest" badge, the mic is off with a tooltip, and the Chat
   panel only has Bubbles. A **"Join <room> ✨"** button at the top right leads to sign-up.
4. **Signing up from there** keeps the character: the last step reads "Keep your character?", with
   the guest's look and name filled in and a handle guessed from the name.
5. Or **Sign in to join as a member** on the invite page.

## Settings → Account

- **How you sign in:** linked Google / Discord / email, with Connect for the others.
- **Birthday:** shown only to you.
- **@handle** (in My profile): change it once every 30 days.
- **Privacy & safety:** "Appear offline", friend requests from anyone (off: only people who share
  a room), and a note that only friends can DM you.

### Deleting an account

Like Discord's, but shorter:

1. **Delete my account…** → pick a **new owner** for each room you own that has other members (mods
   are suggested first). Rooms with only you in them are deleted with the account.
2. The confirm step lists what happens, and you type your @handle to confirm.
3. **7 days to change your mind:** signing in during that week shows "Your account is being
   deleted · Keep my account". There's no separate "disable account".
4. **What stays:** your messages in room chats and DMs, shown as "Deleted user" with a plain grey
   face, so threads still read properly.
5. **What goes:** your character, friends, birthday, sign-ins and focus stats at the end of the
   7 days. Connecta Plus is cancelled right away; boosts end with the account. Your @handle is
   freed 30 days later.
6. Guests have nothing to delete; their session expires.

7 days fits privacy laws such as GDPR and Thailand's PDPA, which expect erasure within about a month.

## Under 18

Nothing extra so far. Friends-only DMs and private presence apply to everyone, and drop-in rooms
are the same for every age. Every age-dependent rule still goes through one `can(user, action)`
check, so a rule can be added later in one place.

## Backend notes

- **Auth:** Google and Discord OAuth plus email codes (needs an email sender, e.g. SES: about $0.10
  per 1,000 emails). Sessions as signed HttpOnly cookies, like V1's admin.
- **Account:** id, @handle (unique, case-insensitive), display name, birthday, look, created at,
  plus linked sign-ins (one account can have Google, Discord and email).
- **Guests:** a short-lived guest session issued by the invite (room id, name, look, expiry). On
  sign-up the look moves to the new account.
- **Age lock:** a record per device and per sign-in identity with an expiry; the client only shows it.
- **Handle check:** a rate-limited "is this free?" endpoint; the final claim happens on submit, so
  two people can't take the same handle.
