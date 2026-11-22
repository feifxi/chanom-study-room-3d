# 2. Accounts and sign-up

**Status:** built in the real app (2026-11-21): sign-in and sign-up, guests, My profile (name,
@handle), My character, Settings → Account and deleting an account. Picking new owners for your rooms when deleting came with rooms (2026-11-22). Still to come with
their features: Privacy & safety (friends and presence), "About me" (not specced yet). **Try it:** http://localhost:3000/login (the email code
arrives in Mailpit, http://localhost:8025), and http://localhost:3000/invite/cafe-chanom for the
guest path. The demo has every screen at http://localhost:3100/login.

Sign-in is passwordless (Google, Discord or an email code), accounts are 13+, and anyone can try a
room first as a guest. A guest who signs up keeps their character.

## Guest or account

|                                 | Guest (no account)              | Account                 |
| ------------------------------- | ------------------------------- | ----------------------- |
| Walk into a room                | by guest pass, or a Common room | yes                     |
| Bubbles (text over heads)       | yes                             | yes                     |
| Voice, photos, screen share     | no (listen only)                | yes                     |
| Room chat (saved), DMs, friends | no                              | yes (DMs: friends only) |
| Be a member of a room, make one | no                              | yes                     |
| Badge                           | "guest" next to the name        | none                    |

A room can let guests talk ("Guests can use voice", feature 3). Guests enter no birthday.

## Sign-up (`/login`)

1. **How:** Continue with Google, Continue with Discord, or email → a 6-digit code. An existing
   account goes straight to Home.
2. **Birthday:** "When's your birthday? 🎂", never shown to anyone. The full date is stored.
3. **Under 13:** "Come back when you're 13 🌱". That device and sign-in wait **a day** before another
   birthday can be tried, so it isn't just "pick another year".
4. **You:** the character editor (same as Settings), a **display name** (up to 16 characters, not
   unique) and a unique **@handle**.
5. **Let's go** → Home.

### @handle

- For adding friends and @mentions. 3–20 characters: a–z, 0–9, `.` and `_`, lowercase, no dot at
  the start or end. Reserved: admin, connecta, support, mod, staff, help, guest.
- Guessed from the display name until you type in it; checked as you type, with suggestions when
  taken (`maimai_`, `maimai.26`, `its.maimai`). Thai or emoji names give an empty guess.
- **Change it** in Settings once every 30 days. The old handle stays held for you for 30 days, so
  nobody can grab it to pretend to be you.

## Guests (`/invite/[code]`)

1. The invite shows who invited you, the room, who's inside and its map.
2. **Walk in as a guest:** a name → pick how you look → Walk in. The page says what guests can't do.
3. **Inside:** a "guest" badge, mic off, only the Bubbles tab, and a **Join <room> ✨** button.
4. **Signing up from there** keeps the character: "Keep your character?" with the look and name
   filled in.

## Settings → Account

- **Sign-ins:** linked Google, Discord, email; Connect for the others.
- **Birthday:** shown only to you. **@handle:** in My profile.
- **Privacy & safety:** Appear offline; **who can send me friend requests** (Anyone / People from my
  rooms / Nobody; you can always add people yourself); a note that only friends can DM you.

### Deleting an account

1. **Delete my account…** → pick a new owner for each room you own that has other members (mods
   suggested first). Rooms with only you are deleted.
2. Confirm by typing your @handle.
3. **7 days to change your mind:** signing in shows "Keep my account". No separate "disable".
4. **Stays:** your messages, shown as "Deleted user" with a grey face, so threads still read.
5. **Goes** after 7 days: character, friends, birthday, sign-ins, focus stats. Plus is cancelled at
   once. The @handle is freed 30 days later.

7 days fits GDPR and Thailand's PDPA, which expect erasure within about a month.

## Under 18

Nothing extra yet: friends-only DMs and private presence apply to everyone. Every age rule goes
through one `can(user, action)` check, so one can be added in one place.

## Backend notes

- **Sign-in is Better Auth** ([why](../decisions.md#engineering-and-infra)) under `/api/auth/*`:
  Google and Discord (on when their keys are set), 6-digit email codes (10 minutes, 5 tries, stored
  hashed; sent with SES, about $0.10 per 1,000 emails), and guests (its anonymous plugin). Sessions
  are rows in Postgres for 30 days with an HttpOnly cookie holding only a random token; signing in
  is rate-limited per IP.
- **Linked sign-ins:** Google and Discord link to an existing account with the same verified email,
  so one person has one account.
- **Account** (`users` table): id, display name, email, @handle (unique, lowercase), birthday (a
  date, never returned to anyone), look, when the handle last changed.
- **Sign-up steps** (`/api/me`): after signing in, `POST /api/me/birthday`, then
  `POST /api/me/sign-up` with the name, handle and look. The server keeps where you are, so leaving
  halfway picks up at the next step. `GET /api/me` says which steps are done.
- **Age lock:** under 13 answers `403 too_young` and locks the sign-in and the browser (a random id
  in a year-long cookie) for a day (`age_locks`). That birthday isn't kept.
- **Handle check:** `GET /api/handles/:handle` (signed in, 60 a minute) with suggestions when
  taken; the final claim happens on submit, and a race answers 409 with fresh suggestions.
- **Settings** (`/api/me`): `PATCH profile` (name, look), `PUT handle` (409 `too_soon` within 30 days
  of the last change; the first change after sign-up is free; the old handle goes to
  `handle_holds` for 30 days, and its owner can take it back), `GET account` (email, birthday,
  linked sign-ins, which providers this server has). Google and Discord connect and disconnect
  through Better Auth (disconnecting wants a sign-in within the last day); an email code always
  works, so disconnecting the last one is fine.
- **Deleting** (`POST /api/me/deletion` with the typed @handle): `deleteAt` = now + 7 days, every
  other browser signed out. Until then signing in shows "Keep my account" (`DELETE
/api/me/deletion`) and the rest of the app is closed. An hourly job then keeps the row as
  "Deleted user" (so messages still read) and removes the name, email, birthday, look, sign-ins and
  sessions; the @handle is held 30 more days. Moves to the job queue when there is one.
- **Guests:** a guest session from the invite page, with a name and look (`PUT /api/me/guest`), no
  birthday. Signing in from a guest session carries the name and look over to the new account and
  deletes the guest. Clearing out guests nobody came back for is a job for later.
