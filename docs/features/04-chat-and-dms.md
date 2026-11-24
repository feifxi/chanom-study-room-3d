# 4. Room chat and DMs

Each room has one saved chat, every DM is 1-to-1 between friends, and every thread works the same:
react, reply, edit, delete, @mentions, pictures. No threads, no read receipts.

## Where chat lives

- **Room chat:** the room's permanent chat, members only. Same thread on the room's page and in 3D.
- **Bubbles:** 3D only, over your head, gone when the room empties ([6](06-3d-room.md)).
- **DMs:** friends only, no calls. `/home/messages/<handle>`, the header popover, the 3D Messages
  tab. A DM appears in lists only once a message is sent.

## Messages

- React (❤️ 😂 👍 or any), reply (quotes the original), edit (shows "(edited)"), delete with Undo.
  Owners and mods delete anyone's in their room.
- **@mentions** pick from the room's members. **@room** is owner and mods only; no @here.
- **Pictures:** up to 4 per message, 10 MB each, shrunk to WebP (longest side 2048 px). Not in
  Bubbles or Common rooms. No GIF picker.
- "New messages" line, Jump to latest, "is typing…". No "Seen".
- **Notifications per room:** Every message / Only @mentions (default) / Nothing, into the 🔔 inbox.
  DMs count in the Messages badge instead; you can mute a DM (they're never told).
- History is kept forever.

## Unfriend and block

- **Unfriended:** the DM becomes read-only history with **Add friend**; their presence is hidden.
- **Blocked:** "You blocked Pim" with **Unblock**; their messages in shared rooms fold into
  "Blocked message · show".

## In the code

- Writes go through REST; the API publishes results through Redis (`LiveService`); the gateway
  (`apps/api/src/gateway.ts`, Socket.IO at `/live`) only checks the session, lets members watch a
  room and passes "typing". A reconnecting tab reloads to catch up.
- Room chat: `apps/api/src/chat/`. DMs: `apps/api/src/dms/` (same `messages` table, `dm_id` instead
  of `room_id`). Messages have UUIDv7 ids; read markers drive unread counts.
- Every message goes through the word filter ([14](14-open-rooms-moderation.md)).
- **Pictures:** the browser uploads straight to S3 with a presigned link; a BullMQ worker
  (`chat/pictures.processor.ts`) makes the WebP and runs the picture check; viewing is a
  members-only redirect to a one-hour link. Locally links go through `/api/dev-storage` because
  the AWS Emulator refuses browsers ([aws-emulator#26](https://github.com/aws/aws-emulator/issues/26));
  delete it when that's fixed.
- Web: `apps/web/src/features/chat/`, `features/dms/`, `features/messages/`

## Before launch

- Set bucket CORS on real S3 (PUT with `Content-Type` from the web origin) and test one browser
  upload; it can't be tested locally.

## Not built yet

- Search inside a chat.
