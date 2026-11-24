# 12. Moderation and reports

What keeps rooms safe without the team watching: a word filter, slow mode, automatic steps when
people report someone, and a picture check. Room owners and mods have their own tools
([Rooms](02-rooms.md#kick-ban-time-out)); the team acts from the [Admin site](16-admin.md).

## The layers

Every message, bubble, name and room text goes through these, cheapest first. Each can be switched
on or off on the admin site.

1. **Word filter** (free): `obscenity` plus our own list, Thai included.
   - Messages, bubbles, room decks and Draw & Guess writing are **masked** (`****`).
   - Names, @handles and room text with a blocked word are **refused** (a name of asterisks helps
     nobody).
   - A room can turn masking off for its own chat, decks and Draw & Guess. DMs, names and Common
     rooms are always filtered.
2. **Limits:** slow mode (a room setting; 3 s in Common rooms).
3. **Report steps** (automatic):
   - In a room: **3 reports in 10 min → muted there for 15 min** (a timeout, never on the owner).
     A guest's mute holds if they walk back in.
   - In Common rooms: **5 in 30 min → out of every Common room for an hour.**
   - Only accounts that are there count, once each; guests can report but don't count.
4. **Picture check:** OpenAI's free moderation endpoint; a flagged picture is dropped. Off until
   `OPENAI_API_KEY` is set.

**A muted person is told who did it:** a mod, reports from people there, or the Connecta team.

## Reports

- Report a **person** (people list or DM), a **message** (hover), or a **room** (its menu, the
  Room card, the Discover preview; not Common rooms). Reasons from a fixed list, optional details,
  "Also block".
- **Only the Connecta team sees reports**, never the room's mods, and nobody learns who reported.
- **10 reports an hour** per person; past that, "the team has your reports" until the hour passes.
- A report keeps the context: messages around it, the person's recent messages, and the bubbles
  the reporter's screen showed (bubbles aren't stored).
- **No voice recording, ever.**

## In the code

- Word filter: `packages/shared/src/moderate.ts`, its own entry so the web app doesn't ship the
  word lists. The API masks chat and decks and refuses names; the game server masks bubbles and
  Draw & Guess writing. The word list itself lives in the database (admin site → Moderation).
- Reports and steps: `apps/api/src/reports/` (counts in Redis sorted sets per window); reasons and
  thresholds in `packages/shared/src/reports.ts`.
- Picture check: `apps/api/src/chat/picture-check.ts`.

## Not built yet

- **A smarter text check** (OpenAI moderation on what the word filter lets through), off until
  needed, and only while the endpoint stays free.

## Not doing

Vote-kick (groups bully with it), appeal forms, automatic strikes, voice recording or voice AI
moderation, paid AI text checks.
