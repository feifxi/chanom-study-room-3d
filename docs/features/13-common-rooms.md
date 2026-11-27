# 13. Common rooms

PBIs: [COM-1 to COM-4](../releases.md#13-common-rooms) · How the code works: [Release 3](../guide/06-release-3.md#common-rooms-com-1-to-com-4)

Connecta's own rooms, open to anyone, guests too, and **safe for strangers by design**. They're
how new people try Connecta. One per map, in copies: "Library Common Room #2".

Needs: [Rooms](02-rooms.md), [The 3D room](05-room-3d.md), [Moderation](12-moderation.md).

## How they differ from other rooms

- **Text only:** bubbles; no voice, pictures, videos or screen share. Links aren't clickable.
- **Slow mode:** one bubble every 3 s. The word filter is always on.
- **No members, no owner, no mods:** the report steps and the team keep order. No vote-kick.
- Card games, Draw & Guess, Pick a Side and the whiteboard still work.
- Can't be reported as a room (people and messages in it can be).

## Copies

- **A copy holds 25, with 5 seats kept for friends:** strangers stop being placed at 20; a new
  copy opens when every copy has 20; empty copies close. Both numbers are admin settings.
- **Walk in** lands in the copy with the most friends, else the busiest still taking strangers.
- **Joining a friend** lands in their copy (if it's full, the busiest other one, and you're told).

## The team inside

A team account has a "Connecta team" chip and, per person:

- **Time out** (follows the person into any copy).
- **Remove from Common rooms** for an hour.

The admin site can also post a notice banner in every Common room for 10 minutes ([Admin site](16-admin.md)).

## In the code

- Types: `packages/shared/src/common.ts`. `apps/api/src/common/` picks the copy and signs a ticket
  with `common: true`. The URL names the type (`/common/library`).
- **Copies have no database rows:** a copy is a game-server room (`common-library-2`); who's in it
  comes from presence, and a fresh ticket holds its seat for 30 s.
- Web: `apps/web/src/features/common/` (the guest door is `CommonGuestGate.tsx`).
