# 4. Release 1 in the code: study with friends

The code behind every [R1 PBI](../releases.md): accounts, private rooms, friends, chat, the 3D room
with voice, the Library, focus tools and the safety basics. Read [chapter 1](01-architecture.md)
first; this chapter assumes you know what the API, gateway and game server are.

Each section says how it works inside, then lists the files: **shared** (rules both sides use),
**API**, **game** (game server) and **web**.

---

## Accounts (ACC-1 to ACC-7)

Spec: [1. Accounts and guests](../features/01-accounts.md) · All its PBIs: [release plan](../releases.md#1-accounts-and-guests)

**How it works**

1. **Sign in** ([`/login`](../../apps/web/src/app/login/page.tsx)): one page walks through steps
   (`method → code → age → character`). Email sends a code through Better Auth's `emailOTP`
   plugin; Google and Discord go through Better Auth's providers. The page then asks the API who
   you are (`GET /api/me`) and jumps to the first step you haven't done.
2. **Birthday** (`POST /api/me/birthday`): under 13 writes an `AgeLock` for the account and for
   this browser (a `connecta_device` cookie, [`device-id.ts`](../../apps/api/src/accounts/device-id.ts))
   and refuses with 403 `too_young` for a day.
3. **Character, name, @handle** (`POST /api/me/sign-up`): the handle is checked live as you type
   (`GET /api/handles/:handle`), then again on save. Rules are shared
   ([`account.ts`](../../packages/shared/src/account.ts)).
4. **Changing things later** (Settings): `PATCH /api/me/profile` (name, look), `PUT /api/me/handle`
   (once every 30 days; the old one is held in `HandleHold`). A new look is checked against what
   you own in the Shop, then sent to every room you're in as a `look` room event, so it changes live.
5. **Deleting** (`POST /api/me/deletion`): pick heirs for your rooms, then 7 days to change your
   mind (`DELETE` keeps it); an hourly job finishes it ([`accounts-cleanup.ts`](../../apps/api/src/accounts/accounts-cleanup.ts)).

**Files**

- Shared: [`account.ts`](../../packages/shared/src/account.ts) (handle and age rules),
  [`avatar.ts`](../../packages/shared/src/avatar.ts) (looks)
- API: [`auth/auth.ts`](../../apps/api/src/auth/auth.ts) (Better Auth),
  [`accounts/me.controller.ts`](../../apps/api/src/accounts/me.controller.ts) (`/api/me/*`),
  [`accounts.service.ts`](../../apps/api/src/accounts/accounts.service.ts) (the rules),
  [`handles.controller.ts`](../../apps/api/src/accounts/handles.controller.ts) /
  [`handles.service.ts`](../../apps/api/src/accounts/handles.service.ts),
  [`signed-up.ts`](../../apps/api/src/accounts/signed-up.ts) (`requireSignedUp`),
  [`mail/sign-in-code.ts`](../../apps/api/src/mail/sign-in-code.ts) (the code email)
- Database: `User`, `Session`, `Account`, `Verification` (Better Auth's), `AgeLock`, `HandleHold`
  ([`schema.prisma`](../../apps/api/prisma/schema.prisma), "Accounts")
- Web: [`app/login/page.tsx`](../../apps/web/src/app/login/page.tsx),
  [`lib/auth-client.ts`](../../apps/web/src/lib/auth-client.ts),
  [`features/account/`](../../apps/web/src/features/account) (`useMe`, `getMe`, `HandleField`,
  `AccountListener`), [`features/avatar/CharacterEditor.tsx`](../../apps/web/src/features/avatar/CharacterEditor.tsx),
  [`components/app/SettingsDialog.tsx`](../../apps/web/src/components/app/SettingsDialog.tsx),
  [`AccountTab.tsx`](../../apps/web/src/components/app/AccountTab.tsx)

---

## Rooms and membership (ROOM-1 to ROOM-7)

Spec: [2. Rooms and membership](../features/02-rooms.md) · All its PBIs: [release plan](../releases.md#2-rooms-and-membership)

**How it works**

1. **Make a room** (`POST /api/rooms`): a short readable id, you as owner, a map. Home lists your
   rooms (`GET /api/rooms`).
2. **A room's page** `/r/<id>`: the server component loads the room with your cookies
   ([`features/rooms/server.ts`](../../apps/web/src/features/rooms/server.ts)); a private room you're
   not in is a 404. Members see the chat ([`PlaceChat.tsx`](../../apps/web/src/features/place/PlaceChat.tsx)).
3. **Invites:** an `Invite` row with a code; `/i/<code>` shows it (`GET /api/invites/:code`) and
   joining is `POST /api/invites/:code/accept`. Codes are rate-limited against guessing.
4. **Roles and moderation:** `PUT /api/rooms/:id/members/:userId/role`, `…/timeout`, kick
   (`DELETE …/members/:userId`), ban (`PUT /api/rooms/:id/bans/:userId`). Who may act on whom is one
   shared function, `canActOn` ([`rooms.ts`](../../packages/shared/src/rooms.ts)). Each one also
   sends a **room event** so the 3D room reacts at once, and goes in the audit log (`roommod.*`).
5. **Walking in:** `POST /api/rooms/:id/ticket` checks membership, bans and capacity, then signs
   the game ticket (see [3D room](#the-3d-room-3d-1-to-3d-8)).
6. **Limits** come from the owner's plan: `ROOM_PLANS` in [`rooms.ts`](../../packages/shared/src/rooms.ts).

**Files**

- Shared: [`rooms.ts`](../../packages/shared/src/rooms.ts) (roles, tags, plan limits)
- API: [`rooms/rooms.controller.ts`](../../apps/api/src/rooms/rooms.controller.ts) (every room
  route), [`rooms.service.ts`](../../apps/api/src/rooms/rooms.service.ts) (the rules, the ticket,
  room events), [`rooms.schemas.ts`](../../apps/api/src/rooms/rooms.schemas.ts),
  [`invites.controller.ts`](../../apps/api/src/rooms/invites.controller.ts),
  [`game/game.service.ts`](../../apps/api/src/game/game.service.ts) (signs tickets, sends room events)
- Database: `Room`, `Membership`, `RoomBan`, `Invite`
- Web: [`features/rooms/`](../../apps/web/src/features/rooms) (`useRooms`, `InviteDialog`,
  `InvitePage`, `WalkIn`), [`features/place/`](../../apps/web/src/features/place) (`PlaceHome` is
  Home, `PlaceChat` a room's page, `RoomMenu`, `RoomSettingsDialog`, `RoomMembers`),
  [`app/(app)/r/[id]/`](<../../apps/web/src/app/(app)/r/[id]/layout.tsx>), [`app/i/[code]`](../../apps/web/src/app/i/[code]/page.tsx)

---

## Friends and presence (FR-1 to FR-5)

Spec: [3. Friends and presence](../features/03-friends.md) · All its PBIs: [release plan](../releases.md#3-friends-and-presence)

**How it works**

1. **Requests** (`POST /api/friends/requests` with a handle): stored in `FriendRequest`; accepting
   makes two `Friendship` rows (one each way). Ignoring and removing tell nobody. Live events tell
   the other person's tabs to refresh.
2. **Blocking** (`PUT /api/blocks/:userId`) ends the friendship and hides their requests.
3. **Presence:** see [chapter 3](03-techniques.md#presence). The Friends page reads
   `GET /api/friends` (with each friend's presence) and refreshes on the `presence` live event.
4. **Join a friend:** their card links to the room they're in when you may walk in.

**Files**

- Shared: [`friends.ts`](../../packages/shared/src/friends.ts)
- API: [`friends/`](../../apps/api/src/friends) (controller, service),
  [`presence/presence.service.ts`](../../apps/api/src/presence/presence.service.ts),
  [`gateway/live.gateway.ts`](../../apps/api/src/gateway/live.gateway.ts) (tabs report in),
  [`gateway/game-presence.ts`](../../apps/api/src/gateway/game-presence.ts) (rooms report in)
- Database: `Friendship`, `FriendRequest`, `Block`
- Web: [`app/(app)/(home)/home/friends/page.tsx`](<../../apps/web/src/app/(app)/(home)/home/friends/page.tsx>),
  [`features/friends/`](../../apps/web/src/features/friends) (`useFriends`, `FriendLinkPage`),
  [`features/presence/usePresence.ts`](../../apps/web/src/features/presence/usePresence.ts),
  [`app/f/[handle]`](../../apps/web/src/app/f/[handle]/page.tsx)

---

## Chat, DMs and the inbox (CHAT-1 to CHAT-6)

Spec: [4. Chat, DMs and the inbox](../features/04-chat.md) · All its PBIs: [release plan](../releases.md#4-chat-dms-and-the-inbox)

**How it works**

1. **Room chat:** `GET/POST /api/rooms/:id/messages`. The service checks membership, timeouts and
   the word filter, saves, then `LiveService.toRoom(...)` pushes it to everyone watching.
2. **Watching:** a tab showing a room's chat sends `watch` to the gateway, which checks membership
   and joins it to `room:<id>`. Typing goes the same way (`typing`), never stored.
3. **Edits, deletes, reactions** use `/api/messages/:messageId` for room chat and DMs alike.
4. **DMs** are the same `Message` table with a `dmId` instead of a `roomId`
   (`PUT /api/dms/with/:handle` opens one; only friends can send).
5. **Unread** comes from read markers (`PUT …/read`).
6. **Inbox:** features call `NotificationsService` to add an item (grouped by `group_key`), which
   also goes live to the person. Inside a room the same items show as toasts.

**Files**

- Shared: [`chat.ts`](../../packages/shared/src/chat.ts) (length, mention rules)
- API: [`chat/`](../../apps/api/src/chat) (`chat.controller`, `chat.service`), [`dms/`](../../apps/api/src/dms),
  [`notifications/`](../../apps/api/src/notifications), [`live/live.service.ts`](../../apps/api/src/live/live.service.ts),
  [`gateway/live.gateway.ts`](../../apps/api/src/gateway/live.gateway.ts)
- Database: `Message`, `Dm`, `DmMember`, `Reaction`, `Notification`
- Web: [`components/chat/Chat.tsx`](../../apps/web/src/components/chat/Chat.tsx) (the one chat UI
  for rooms and DMs), [`features/chat/`](../../apps/web/src/features/chat) (`live.ts` the socket,
  `useRoomChat`, `RoomChat`, `MiniRoomChat`), [`features/dms/`](../../apps/web/src/features/dms),
  [`features/messages/MessagesSidebar.tsx`](../../apps/web/src/features/messages/MessagesSidebar.tsx),
  [`app/(app)/(home)/home/messages/`](<../../apps/web/src/app/(app)/(home)/home/messages/layout.tsx>),
  [`features/inbox/useInbox.ts`](../../apps/web/src/features/inbox/useInbox.ts),
  [`features/place/Inbox.tsx`](../../apps/web/src/features/place/Inbox.tsx)

---

## The 3D room (3D-1 to 3D-8)

Spec: [5. The 3D room](../features/05-room-3d.md) · All its PBIs: [release plan](../releases.md#5-the-3d-room)

**How it works**

1. `/r/<id>/walk` ([page](<../../apps/web/src/app/(room)/r/[id]/walk/page.tsx>)) checks you may come
   in and renders [`WalkIn`](../../apps/web/src/features/rooms/WalkIn.tsx), which loads the room
   screen in the browser only ([`RoomLoader`](../../apps/web/src/features/room/RoomLoader.tsx)).
2. [`useGame`](../../apps/web/src/features/game/useGame.ts) gets a ticket and joins the Colyseus
   room. If it can't (full, banned, kicked, in another tab), it returns _why_, and WalkIn shows a
   card with the one next step.
3. On the game server, `ConnectaRoom.onJoin` ([`room.ts`](../../apps/game/src/room.ts)) adds you
   to the state, tells presence, and gives you a voice pass.
4. [`RoomView`](../../apps/web/src/features/room/RoomView.tsx) is the screen: it builds a
   [`LiveRoom`](../../apps/web/src/features/room3d/liveRoom.ts) mirror, the 3D canvas
   ([`RoomCanvas`](../../apps/web/src/features/room3d/RoomCanvas.tsx)) and the HUD around it (Room
   card, My tools, Chat, People, Dock).
5. **Moving:** [`LocalPlayerDriver`](../../apps/web/src/features/room3d/LocalPlayerDriver.ts) moves
   you at once and sends `move`; the server checks speed and walls
   ([`rules.ts`](../../apps/game/src/rules.ts)); [`reconcile.ts`](../../apps/web/src/features/room3d/reconcile.ts)
   corrects. Sitting is `sit` with a seat id from the map.
6. **Bubbles:** `say` → the server filters the words, checks the rate and broadcasts `said` to
   everyone (or only the private zone). They show in the DOM label layer ([`labels.tsx`](../../apps/web/src/features/room3d/labels.tsx)).
7. **Away:** the browser reports 10 idle minutes (`away`); the server shows 💤 and turns the mic off.
8. **Voice:** [chapter 3](03-techniques.md#voice-and-screen-share-livekit).
9. **Leaving:** only Leave leaves; every link out goes through `LeaveRoomLink`
   ([`LeaveRoom.tsx`](../../apps/web/src/features/room/LeaveRoom.tsx)). A second tab or a second
   room takes over (`GAME_CLOSE` codes in [`game.ts`](../../packages/shared/src/game.ts)).

**Files**

- Shared: [`game.ts`](../../packages/shared/src/game.ts) (protocol, tickets, close codes, room
  events), [`player.ts`](../../packages/shared/src/player.ts), [`movement.ts`](../../packages/shared/src/movement.ts),
  [`collision.ts`](../../packages/shared/src/collision.ts), [`navigation.ts`](../../packages/shared/src/navigation.ts)
- Game: [`room.ts`](../../apps/game/src/room.ts), [`state.ts`](../../apps/game/src/state.ts),
  [`ticket.ts`](../../apps/game/src/ticket.ts), [`rules.ts`](../../apps/game/src/rules.ts),
  [`voice.ts`](../../apps/game/src/voice.ts), [`redis.ts`](../../apps/game/src/redis.ts), [`links.ts`](../../apps/game/src/links.ts)
- Web, the screen: [`features/room/`](../../apps/web/src/features/room) (`RoomView`, `RoomCard`,
  `RoomTools`, `ChatPanel`, `RoomPeople`, `PersonMenu`, `MoreMenu`, `LeaveRoom`, `useDismiss`)
- Web, the 3D: [`features/room3d/`](../../apps/web/src/features/room3d) (`RoomCanvas`, `Avatar`,
  `liveRoom`, `LocalController`, `LocalPlayerDriver`, `reconcile`, `labels`, `FrameDriver`,
  `quality`, `perf`, `PerfOverlay`, `StaticBatch`, `StaticShadows`, `ZoomControl`, `Joystick`),
  [`features/avatar/`](../../apps/web/src/features/avatar) (`character.ts` builds a character,
  `skin.ts` merges it), [`features/voice/`](../../apps/web/src/features/voice) (`useVoice`, `mutedForMe`),
  [`features/game/useGame.ts`](../../apps/web/src/features/game/useGame.ts)
- Checks: [`scripts/perf-check.mjs`](../../apps/web/scripts/perf-check.mjs)

---

## The Library (MAP-1)

Spec: [6. Maps](../features/06-maps.md) · All its PBIs: [release plan](../releases.md#6-maps)

**How it works:** a map has two halves.

- **Data** ([`packages/shared/src/maps/library.ts`](../../packages/shared/src/maps/library.ts)):
  bounds, door, walls and furniture as obstacles, seats, private zones, activity areas. The game
  server uses it for seats, collisions and zones; the browser for prediction and paths. The shape
  of a map is [`maps/types.ts`](../../packages/shared/src/maps/types.ts).
- **Look** ([`apps/web/src/features/room3d/Library.tsx`](../../apps/web/src/features/room3d/Library.tsx)):
  the 3D build from simple shapes, inside `StaticBatch`.
- They meet in [`features/map/active.ts`](../../apps/web/src/features/map/active.ts). The data never
  imports the look. More in the [developer guide](../dev-guide.md#maps).

---

## Study tools (STUDY-1 to STUDY-4)

Spec: [7. Study tools](../features/07-study-tools.md) · All its PBIs: [release plan](../releases.md#7-study-tools)

**How it works**

1. **Focus timer** runs on the game server ([`focus.ts`](../../apps/game/src/focus.ts)):
   `focus:start` with a preset, `focus:subject`, `focus:stop`. Your status and subject sync to
   everyone; you're never Away while focusing.
2. **When a round ends** the game server queues it (`focus-rounds`); the API's worker saves a
   `FocusSession` ([`focus.processor.ts`](../../apps/api/src/focus/focus.processor.ts)). The round's
   id keeps it from counting twice.
3. **The Focus page** reads `GET /api/focus/me` (your numbers, in your time zone).
4. **To-dos** are plain REST (`/api/todos`) with a live `todos` event to your other tabs.
5. **Music** is a local `<audio>` player with royalty-free tracks in `public/music`.

**Files**

- Shared: [`focus.ts`](../../packages/shared/src/focus.ts)
- Game: [`focus.ts`](../../apps/game/src/focus.ts), the `focus:*` handlers in [`room.ts`](../../apps/game/src/room.ts)
- API: [`focus/`](../../apps/api/src/focus) (`focus.service`, `focus.processor`, `todos.*`, `todos-cleanup`)
- Database: `FocusSession`, `Todo`
- Web: [`features/focus/`](../../apps/web/src/features/focus) (`useFocusTimer`, `useTodos`,
  `useFocusStats`, `useRoomToday`, `chime`), [`features/room/StudyPanel.tsx`](../../apps/web/src/features/room/StudyPanel.tsx),
  [`app/(app)/(home)/home/focus/page.tsx`](<../../apps/web/src/app/(app)/(home)/home/focus/page.tsx>),
  [`features/music/`](../../apps/web/src/features/music)

---

## Safety basics (MOD-1, MOD-2)

Spec: [12. Moderation and reports](../features/12-moderation.md) · All its PBIs: [release plan](../releases.md#12-moderation-and-reports)

**How it works**

1. **Word filter:** `maskWords` ([`moderate.ts`](../../packages/shared/src/moderate.ts)) masks chat
   in the API and bubbles on the game server. Names and room text with a blocked word are refused
   (the Zod schemas call it). The room's `filterWords` setting turns masking off for its chat.
2. **Reports** (`POST /api/reports`): a person, a message or a room, with context (nearby messages,
   the bubbles the reporter saw). Kept for the team only, never shown to room mods.

**Files**

- Shared: [`moderate.ts`](../../packages/shared/src/moderate.ts), [`reports.ts`](../../packages/shared/src/reports.ts)
- API: [`reports/`](../../apps/api/src/reports), word filter calls in [`chat/chat.service.ts`](../../apps/api/src/chat/chat.service.ts)
- Database: `Report`
- Web: [`features/moderation/ReportDialog.tsx`](../../apps/web/src/features/moderation/ReportDialog.tsx),
  [`features/place/ReportRoomDialog.tsx`](../../apps/web/src/features/place/ReportRoomDialog.tsx)

---

## Team accounts and the admin site basics (ADM-1 to ADM-4)

Spec: [16. Team accounts and the admin site](../features/16-admin.md) · All its PBIs: [release plan](../releases.md#16-team-accounts-and-the-admin-site)

**How it works**

1. **Team** is a flag on the user, set only by a script:
   `pnpm --filter @connecta/api team <handle>` ([`scripts/team.ts`](../../apps/api/scripts/team.ts)).
2. **`/admin`** checks the flag on the server and answers 404 to everyone else
   ([`app/admin/layout.tsx`](../../apps/web/src/app/admin/layout.tsx)); every `/api/admin/*` route
   checks it again ([`admin/team.ts`](../../apps/api/src/admin/team.ts)).
3. **Reports queue** groups reports into cases (one per person, message or room), urgent first
   ([`reports-admin.service.ts`](../../apps/api/src/admin/reports-admin.service.ts)).
4. **Account actions** (`POST /api/admin/users/:id/actions`): warn, suspend, ban, lift, reset name.
   Each one emails the reason ([`mail/account-mail.ts`](../../apps/api/src/mail/account-mail.ts)),
   writes an `AccountAction` and an audit entry, and a suspension signs the person out everywhere
   (sessions deleted, `LiveService.signOut`, a `kick` room event).
5. **Audit log** (`GET /api/admin/audit`) reads `AuditEntry`.

**Files**

- API: [`admin/`](../../apps/api/src/admin) (`admin.controller`, `accounts-admin.service`,
  `reports-admin.service`, `audit-admin.service`), [`audit/audit.service.ts`](../../apps/api/src/audit/audit.service.ts)
- Database: `AccountAction`, `AuditEntry`
- Web: [`app/admin/`](../../apps/web/src/app/admin) (`users`, `reports`, `audit`),
  [`features/admin/`](../../apps/web/src/features/admin) (`AdminFrame`, `useAdmin`, `auditLabels`),
  [`features/account/AccountListener.tsx`](../../apps/web/src/features/account/AccountListener.tsx)
  (a suspended tab goes to sign-in)
