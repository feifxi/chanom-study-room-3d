# 4. Room chat and DMs

**Status:** decided and built in the demo. **Try it:** http://localhost:3100/servers/chanom (a room's
chat), http://localhost:3100/home/messages/mai (Mai types back), /home/messages/ken (unfriended). In
3D: Chat → Room chat → ⤢.

Each room has one saved chat, every DM is 1-to-1 between friends, and every thread works the same
way: react, reply, edit, delete, @mentions and pictures. No threads and no read receipts.

## Where chat lives

- **Room chat:** the room's one permanent chat, for members. Same thread on the room's Chat page
  (outside 3D), in the big chat window in 3D, and in the small Chat panel's "Room chat" tab.
- **Bubbles:** in 3D only, over the speaker's head, reset when the room empties (feature 6).
- **DMs:** 1-to-1, friends only, text only (no calls; to talk, meet in a room). Messages page, the
  header's DM popover and the Messages tab in 3D.

Every thread works the same (`ChatThread` in the demo).

## A message

Hover (or long-press on phones) shows a small toolbar:

- **React:** ❤️ 😂 👍 in one tap, the smiley for more. Tap a reaction chip to add or remove yours.
- **Reply:** quotes the original above yours ("↩ Ploy · who's free friday?"). The message box shows
  "Replying to Ploy ✕".
- **Edit** (your own): inline, Enter saves, Esc cancels. Shows "(edited)".
- **Delete:** your own; the owner and mods can delete anyone's in their room. A toast offers Undo.
- **No threads:** they're much of what makes Discord channels feel heavy.

## @mentions

- Typing `@` opens a picker of the room's members (matched by @handle or display name; ↑↓, Tab or
  Enter to pick). In a DM it only offers the friend.
- **@room** pings everyone in the room. Only the owner and mods can use it (no spam), and there's no
  separate @here.
- Messages that mention you (or @room) are tinted, and the room's Home card shows "@ you".

## Pictures

- Up to **4 per message, 10 MB each**. Previews in the message box with ✕, and a 1–4 grid in the chat.
- The real app compresses them on upload (WebP, longest side 2048 px, ~300 KB each) and keeps them as
  long as the message exists. Cost: 10,000 pictures ≈ 3 GB ≈ under $1 a month on S3.
- No GIF picker in v1.
- Common rooms: nobody sends pictures (text only, feature 14).

## Reading

- **"New messages"** line where you left off; it clears once you send or jump to the latest.
- **Jump to latest** button when you've scrolled up.
- **"Mai is typing…"** in DMs and room chat.
- **No "Seen" / read receipts**, like Discord: no pressure to answer, one less privacy setting.
- **Notifications per room** (room "…" menu): Every message / **Only @mentions** (default) / Nothing.
  DMs always notify unless you mute that chat.
- **History** is kept forever for room chats and DMs (text is tiny). Search inside a chat comes later.

## Unfriend and block

- **Unfriended:** the DM stays as read-only history, with "You and Ken aren't friends any more" and
  **Add friend** in place of the message box. Where they are (room, activity, online dot) is hidden,
  since presence is for friends.
- **Blocked:** the DM shows "You blocked Pim. They can't message you" with **Unblock**; they leave
  your friends list; their messages in rooms you share fold into **"Blocked message · show"**.

## Backend notes

- **Gateway:** the NestJS WebSocket gateway carries messages, edits,
  deletes, reactions and typing; Redis pub/sub between instances. Typing is not stored.
- **Tables:** message (id, room or DM, author, text, reply to, edited at, deleted at), attachment
  (message, key, width, height, bytes), reaction (message, user, emoji; unique per user and emoji),
  read marker (user, room or DM, last read message id). The read marker drives "New messages" and
  unread counts; it's never shown to others (no "Seen").
- **Rules on the server:** DMs only between friends; delete others' messages only as owner or mod of
  that room; @room only as owner or mod; blocked users' messages are filtered for the blocker;
  timed-out members can't post (feature 3); every message goes through `moderate()` (feature 14).
- **Pictures:** the client asks for a presigned S3 upload URL; a small worker makes the WebP and
  checks it with the moderation step before the message shows.
