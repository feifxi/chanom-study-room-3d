# 4. Chat, DMs and the inbox

PBIs: [CHAT-1 to CHAT-8](../releases.md#4-chat-dms-and-the-inbox) · How the code works: [Release 1](../guide/04-release-1.md#room-chat-chat-1-to-chat-3), [Release 2](../guide/05-release-2.md#dms-mentions-the-inbox-and-pictures-chat-4-to-chat-8)

Each room has one saved chat, every DM is 1-to-1 between friends, and every thread works the same:
react, reply, edit, delete, @mentions, pictures. No threads, no read receipts. The 🔔 inbox
gathers what needs you.

## Where chat lives

- **Room chat:** the room's permanent chat, members only. The same thread on the room's page and
  in 3D.
- **Bubbles:** 3D only, over your head, gone when the room empties ([The 3D room](05-room-3d.md)).
- **DMs:** friends only, no calls. `/home/messages/<handle>`, the header popover, the 3D Messages
  tab. A DM shows in lists only once a message is sent.

## Messages

- React (❤️ 😂 👍 or any), reply (quotes the original), edit (shows "(edited)"), delete with Undo.
  Owners and mods delete anyone's in their room.
- **@mentions** pick from the room's members. **@room** is owner and mods only; no @here.
- **Pictures:** up to 4 per message, 10 MB each (50 MB Plus), shrunk to WebP (longest side
  2,048 px). Not in Bubbles or Common rooms. No GIF picker.
- "New messages" line, Jump to latest, "is typing…". No "Seen".
- Every message goes through the word filter ([Moderation](12-moderation.md)). History is kept forever.

## Unfriend and block

- **Unfriended:** the DM becomes read-only history with **Add friend**; their presence is hidden.
- **Blocked:** "You blocked Pim" with **Unblock**; their messages in shared rooms fold into
  "Blocked message · show".

## 🔔 Inbox

- **What goes in:** friend requests, Ask to join requests and replies, @mentions, team actions on
  your account. Kept 30 days.
- **What doesn't:** DMs (Messages has its own badge) and never "a friend walked in".
- **Per room:** Every message / Only @mentions (default) / Nothing. You can mute a DM (they're
  never told).
- Inside a 3D room the same items also show as toasts.

## In the code

- **Writes go through REST**; the API publishes results through Redis (`LiveService`: `toRoom`,
  `toUser`) and the gateway delivers them. The gateway (`apps/api/src/gateway.ts`, Socket.IO at
  `/live`) only checks the session, lets members watch a room and passes "typing". A reconnecting
  tab reloads to catch up.
- Room chat: `apps/api/src/chat/`. DMs: `apps/api/src/dms/` (the same `messages` table, `dm_id`
  instead of `room_id`). Message ids are UUIDv7; read markers drive unread counts.
- **Pictures:** the browser uploads straight to S3 with a presigned link; a BullMQ worker
  (`chat/pictures.processor.ts`) makes the WebP and runs the picture check; viewing is a
  members-only redirect to a one-hour link. Locally links go through `/api/dev-storage` because the
  AWS Emulator refuses browsers ([aws-emulator#26](https://github.com/aws/aws-emulator/issues/26));
  delete it when that's fixed.
- Inbox: `apps/api/src/notifications/` (items grouped by `group_key`, deleted after 30 days).
- Web: `apps/web/src/features/chat/`, `features/dms/`, `features/messages/`, `features/inbox/`.

## Before launch

- Set bucket CORS on real S3 (PUT with `Content-Type` from the web origin) and test one browser
  upload; it can't be tested locally.

## Not built yet

- Search inside a chat.
