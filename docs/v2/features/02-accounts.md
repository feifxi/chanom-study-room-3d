# 2. Accounts and sign-up

**Status:** decided and built in the demo. **Try it:** http://localhost:3100/login, and
http://localhost:3100/invite/cafe-chanom for the guest path.

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

- **Auth:** Google and Discord OAuth, email codes (SES, about $0.10 per 1,000 emails). Sessions are
  signed HttpOnly cookies, like V1's admin.
- **Account:** id, @handle (unique, case-insensitive), display name, birthday, look, created at, and
  linked sign-ins (one account can have Google, Discord and email).
- **Guests:** a short-lived guest session from the invite (room, name, look, expiry). On sign-up the
  look moves to the account.
- **Age lock:** a record per device and per sign-in identity with an expiry; the client only shows it.
- **Handle check:** a rate-limited "is this free?" endpoint; the final claim happens on submit.
