# Releases

Connecta ships in three releases. Each one is usable on its own and adds value to the last: first
the core (study together with friends), then fun (hang out and play), then scale (open to
strangers, and paying for itself).

**A planning view.** Every feature is split into backlog items (PBIs) and every PBI belongs to
one release, as if nothing were built yet. Real status is in the [roadmap](roadmap.md); what each
PBI means in detail is in its [feature spec](features/README.md).

## The three releases

| Release                    | Who it's for                   | The value                                                                                                               |
| -------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **R1: Study with friends** | a friend group                 | Sign up, make a private room, invite friends, walk around the Library together, talk, chat and focus. Safe from day one |
| **R2: Hang out and play**  | groups and their guests        | Things to do together (watch, games, drawing), pictures in chat, guests, and rooms others can find in Discover          |
| **R3: Open to everyone**   | strangers, and Connecta itself | Common rooms anyone can walk into, automatic moderation, coins and the Shop, and Plus so Connecta pays its way          |

**The order rule:** a PBI goes in the earliest release whose value needs it, and never before
what it builds on (the spec numbers are the build order). Safety comes with each step: R1 has the
word filter, reports and suspensions because real people use it; R3 adds the automatic steps that
strangers need.

## PBIs by feature

### 1. [Accounts and guests](features/01-accounts.md)

| ID     | PBI                                                                         | Release |
| ------ | --------------------------------------------------------------------------- | ------- |
| ACC-1  | Sign in with an email code (passwordless), one page for sign-up and sign-in | R1      |
| ACC-2  | Sign in with Google or Discord; link sign-ins with the same verified email  | R1      |
| ACC-3  | Birthday step: 13+ only, an under-13 attempt locks for a day                | R1      |
| ACC-4  | Onboarding: character, display name, @handle; resumes at the same step      | R1      |
| ACC-5  | Change name, look and @handle (once every 30 days, old handle held)         | R1      |
| ACC-6  | Account settings: Appear offline, who can send me friend requests           | R1      |
| ACC-7  | Delete my account (new owners for my rooms, 7 days to change my mind)       | R1      |
| ACC-8  | Guest door: pick a name and look, answer the age question, walk in          | R2      |
| ACC-9  | A guest signs up from inside a room and keeps their look and name           | R2      |
| ACC-10 | Old guest accounts are cleared out                                          | R2      |

### 2. [Rooms and membership](features/02-rooms.md)

| ID      | PBI                                                                                  | Release |
| ------- | ------------------------------------------------------------------------------------ | ------- |
| ROOM-1  | Make a private room (a name and a map); Home lists my rooms (pinned, active, folded) | R1      |
| ROOM-2  | A room's page: its chat, who's inside, Walk in                                       | R1      |
| ROOM-3  | Member invite links (1 day, 7 days or never)                                         | R1      |
| ROOM-4  | Roles: owner, mods, members; make or remove a mod; hand the room over; delete it     | R1      |
| ROOM-5  | Kick, ban and time out, wherever you see the person                                  | R1      |
| ROOM-6  | Room settings: Overview, Members & roles, Invites, Rules & safety                    | R1      |
| ROOM-7  | Free limits: 150 members, 25 people at once; owner and mods always fit               | R1      |
| ROOM-8  | Guest passes (24 hours, no account) and the Allow guests / guest voice settings      | R2      |
| ROOM-9  | Ask to join and Open rooms; requests with a note; a preview before joining           | R2      |
| ROOM-10 | Discover: listed rooms with tags, language, search, live counts and order            | R2      |
| ROOM-11 | Room thumbnail upload                                                                | R2      |

### 3. [Friends and presence](features/03-friends.md)

| ID   | PBI                                                                        | Release |
| ---- | -------------------------------------------------------------------------- | ------- |
| FR-1 | Add a friend by exact @handle; accept or ignore; silent requests           | R1      |
| FR-2 | Friend link `/f/<handle>` and Add friend from a room's people list         | R1      |
| FR-3 | Unfriend and block                                                         | R1      |
| FR-4 | Presence: Online, Away, Offline, which room (private rooms never named)    | R1      |
| FR-5 | The Friends page with Join (walk into a friend's room)                     | R1      |
| FR-6 | Ask to join and Invite to a room as DM cards (member invite or guest pass) | R2      |
| FR-7 | "Show what I'm doing" (📖 Focusing · Calculus)                             | R2      |

### 4. [Chat, DMs and the inbox](features/04-chat.md)

| ID     | PBI                                                                     | Release |
| ------ | ----------------------------------------------------------------------- | ------- |
| CHAT-1 | Room chat, live: send, typing, New messages line, Jump to latest        | R1      |
| CHAT-2 | React, reply, edit, delete with Undo; mods delete anyone's              | R1      |
| CHAT-3 | @mentions and @room                                                     | R1      |
| CHAT-4 | DMs between friends (Messages page, header popover, 3D tab)             | R1      |
| CHAT-5 | Blocked people's messages fold away; unfriended DMs become read-only    | R1      |
| CHAT-6 | 🔔 Inbox: friend requests, @mentions; toasts inside a room              | R1      |
| CHAT-7 | Notification settings per room (Every / Mentions / Nothing) and DM mute | R2      |
| CHAT-8 | Pictures in chat and DMs (up to 4, shrunk to WebP)                      | R2      |

### 5. [The 3D room](features/05-room-3d.md)

| ID    | PBI                                                                                 | Release |
| ----- | ----------------------------------------------------------------------------------- | ------- |
| 3D-1  | Game server and join ticket: walk in, capacity checked, kick/ban/role felt at once  | R1      |
| 3D-2  | Move: keys, click to walk around furniture, joystick on phones; sit with E or a tap | R1      |
| 3D-3  | Proximity voice: stereo, 12 nearest, mute and deafen                                | R1      |
| 3D-4  | Bubbles and Away                                                                    | R1      |
| 3D-5  | Private zones (voice and bubbles stay inside)                                       | R1      |
| 3D-6  | Leaving: Leave only, links out confirm, one tab and one room at a time, why-cards   | R1      |
| 3D-7  | The HUD: Room card, people panel, chat, dock, zoom; phone layout                    | R1      |
| 3D-8  | Performance budget, battery saver and the perf check                                | R1      |
| 3D-9  | Mod tools in 3D: Mute for everyone, Talk to everyone                                | R2      |
| 3D-10 | Screen share to your table                                                          | R2      |
| 3D-11 | Resident cats, the Buddy Machine and study buddies                                  | R2      |

### 6. [Maps](features/06-maps.md)

| ID    | PBI                                                                                    | Release |
| ----- | -------------------------------------------------------------------------------------- | ------- |
| MAP-1 | The Library: study spots, lounge, private zones, spawn                                 | R1      |
| MAP-2 | The Library's activity spots: TV, card and chess tables, open floor, board, art corner | R2      |
| MAP-3 | Map & look: time of day, switched live for everyone inside                             | R2      |
| MAP-4 | Cosy and Big sizes (Big with the owner's Plus)                                         | R3      |
| MAP-5 | More templates (Cat Café, Starry Rooftop)                                              | R3      |

### 7. [Study tools](features/07-study-tools.md)

| ID      | PBI                                                               | Release |
| ------- | ----------------------------------------------------------------- | ------- |
| STUDY-1 | Focus timer: 25/5 and 50/10, a subject over your head, never Away | R1      |
| STUDY-2 | Private to-do list, the same in every room                        | R1      |
| STUDY-3 | Lo-fi music (royalty-free)                                        | R1      |
| STUDY-4 | Focus page: my numbers, 7-day chart, back to my last room         | R1      |
| STUDY-5 | Rankings: Friends and Everyone (opt-in), Today and This week      | R2      |

### 8. [Activities](features/08-activities.md)

| ID    | PBI                                                                            | Release |
| ----- | ------------------------------------------------------------------------------ | ------- |
| ACT-1 | One flow for every activity: spot, gathering, host, Start, results, Play again | R2      |
| ACT-2 | Leaving rules: walk off or 30 s away counts; leaving mid-round is a loss       | R2      |
| ACT-3 | 📣 Call everyone, and Hide game invites while I'm focusing                     | R2      |
| ACT-4 | Theater panels and spot tags                                                   | R2      |
| ACT-5 | Room-wide games setting                                                        | R2      |

### 9. [Watch together and photo mode](features/09-watch-and-photo.md)

| ID      | PBI                                                                | Release |
| ------- | ------------------------------------------------------------------ | ------- |
| WATCH-1 | YouTube on the TV in sync, controls for everyone watching, Up next | R2      |
| WATCH-2 | Screen share on the TV, with sound for the watchers                | R2      |
| WATCH-3 | Photo mode: save, copy or share to Room chat                       | R2      |

### 10. [Party games](features/10-party-games.md)

| ID   | PBI                                                          | Release |
| ---- | ------------------------------------------------------------ | ------- |
| PG-1 | Pick a Side with built-in decks (Would you rather, Quiz)     | R2      |
| PG-2 | Whiteboard: draw together, save or share                     | R2      |
| PG-3 | Draw & Guess and Copycat, with the album                     | R2      |
| PG-4 | The room's own Pick a Side decks (masked by the word filter) | R3      |

### 11. [Table games](features/11-table-games.md)

| ID   | PBI                                                    | Release |
| ---- | ------------------------------------------------------ | ------- |
| TG-1 | Chess at the chess table, with a watch view on the rug | R2      |
| TG-2 | Slave at the card table (3–6 players), private hands   | R2      |

### 12. [Moderation and reports](features/12-moderation.md)

| ID    | PBI                                                                         | Release |
| ----- | --------------------------------------------------------------------------- | ------- |
| MOD-1 | Word filter: mask messages and bubbles; refuse names, handles and room text | R1      |
| MOD-2 | Report a person, a message or a room to the Connecta team                   | R1      |
| MOD-3 | Slow mode                                                                   | R2      |
| MOD-4 | Picture check on every uploaded picture                                     | R2      |
| MOD-5 | Report steps: muted after 3 reports in 10 min; a muted person is told why   | R3      |

### 13. [Common rooms](features/13-common-rooms.md)

| ID    | PBI                                                                        | Release |
| ----- | -------------------------------------------------------------------------- | ------- |
| COM-1 | Common rooms in copies: 25 a copy, 5 kept for friends; land with friends   | R3      |
| COM-2 | Safe for strangers: text only, slow mode, filter always on, guests welcome | R3      |
| COM-3 | Team tools inside: time out, remove from Common rooms; notice banner       | R3      |
| COM-4 | Common rooms first on Discover and on the landing page                     | R3      |

### 14. [Coins, quests and the Shop](features/14-coins-and-shop.md)

| ID     | PBI                                                  | Release |
| ------ | ---------------------------------------------------- | ------- |
| COIN-1 | Daily quests (3 a day) that pay earn-only coins      | R3      |
| COIN-2 | The Shop: accessories and outfits, try on, buy, wear | R3      |
| COIN-3 | Pets: Shop cats brought out of the Buddy Machine     | R3      |

### 15. [Connecta Plus and payments](features/15-plus.md)

| ID     | PBI                                                                  | Release |
| ------ | -------------------------------------------------------------------- | ------- |
| PLUS-1 | Plus perks and limits (room space, members, share quality, name tag) | R3      |
| PLUS-2 | Pay with Stripe: card renews, PromptPay by reminder                  | R3      |
| PLUS-3 | Plus & billing settings: cancel, Change card, receipts               | R3      |
| PLUS-4 | Gift Plus to a friend                                                | R3      |
| PLUS-5 | When Plus ends: 7 days of grace, nobody sent out                     | R3      |

### 16. [Team accounts and the admin site](features/16-admin.md)

| ID    | PBI                                                                                       | Release |
| ----- | ----------------------------------------------------------------------------------------- | ------- |
| ADM-1 | Team accounts (set by a script) and the hidden `/admin` gate                              | R1      |
| ADM-2 | Reports queue: cases, urgent first, one decision closes a case                            | R1      |
| ADM-3 | Users: warn, suspend, ban, lift, reset name; email with the reason; signed out everywhere | R1      |
| ADM-4 | Audit log of team actions                                                                 | R1      |
| ADM-5 | Rooms: delist and close                                                                   | R2      |
| ADM-6 | Moderation page: layers on or off, our word list                                          | R2      |
| ADM-7 | Overview: how Connecta is doing, health strip                                             | R2      |
| ADM-8 | Common rooms page: copies, seats, notice                                                  | R3      |
| ADM-9 | Money: revenue, payments, refunds                                                         | R3      |

## Each release at a glance

- **R1 (44 PBIs):** ACC-1–7, ROOM-1–7, FR-1–5, CHAT-1–6, 3D-1–8, MAP-1, STUDY-1–4, MOD-1–2,
  ADM-1–4.
- **R2 (35 PBIs):** ACC-8–10, ROOM-8–11, FR-6–7, CHAT-7–8, 3D-9–11, MAP-2–3, STUDY-5, ACT-1–5,
  WATCH-1–3, PG-1–3, TG-1–2, MOD-3–4, ADM-5–7.
- **R3 (18 PBIs):** MAP-4–5, PG-4, MOD-5, COM-1–4, COIN-1–3, PLUS-1–5, ADM-8–9.

## After R3

Not in any release yet: the map editor and the Blender maps ([Maps](features/06-maps.md)), AI
decks and premium maps, skins and pets ([Plus](features/15-plus.md)), search inside a chat, events.
