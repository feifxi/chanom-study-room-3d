# 16. Team accounts and the admin site

PBIs: [ADM-1 to ADM-9](../releases.md#16-team-accounts-and-the-admin-site) · How the code works: [Release 3](../guide/06-release-3.md#team-accounts-and-the-admin-site-adm-1-to-adm-9)

How the Connecta team runs the platform: who counts as team, what `/admin` shows, and what the
team can do to an account or a room. Build it last: it reads every other feature.

## Team accounts

- `users.team` is set **only by a script**: `pnpm --filter @connecta/api team <handle> [off]`. No
  screen can make someone staff.
- Team accounts can't be acted on (warned, suspended, banned, timed out).
- In Common rooms they have their own tools ([Common rooms](13-common-rooms.md#the-team-inside)).

## The admin site (`/admin`)

Everyone else gets "page not found".

| Page         | What it does                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Overview     | online now, in rooms, open reports, sign-ups, Plus members, messages; a health strip; urgent cases |
| Reports      | cases (all reports about one person, message or room), urgent first; one decision closes the case  |
| Users        | search and filters; warn, suspend 1 or 7 days, ban, lift, reset name                               |
| Rooms        | delist / relist, close / reopen                                                                    |
| Common rooms | copies and how full, seats, a notice banner for every Common room (10 min)                         |
| Moderation   | the layers on or off, our word list ([Moderation](12-moderation.md))                               |
| Money        | revenue, payments, refunds ([Plus](15-plus.md))                                                    |
| Maps         | lists the maps; the editor comes with Blender ([Maps](06-maps.md))                                 |
| Audit log    | every team action, automatic step and room mod action, kept a year; filter Team / Auto / Room mods |

## Rules

- **Urgent first:** sexual content, danger, anything an automatic step acted on, or 3+ reporters.
- **No automatic strikes:** the team decides by hand.
- **A suspension or ban** stops sign-in and signs the person out everywhere at once (their open
  tabs are dropped); signing in shows until when, why, and "reply to our email to appeal".
- **Every action emails the account with the reason.** Appeals are replies to that email; no form.
- **Delisting** keeps a room working for its members. **Closing** stops everyone walking in or
  chatting, and tells people inside why; members and messages stay, so it can be undone.

## In the code

- `apps/api/src/admin/` (one service per page), the audit log in `src/audit/`; web
  `apps/web/src/app/admin/`, labels in `features/admin/auditLabels.ts`.
- **Platform settings** (word list, switches, Common seats) live in the database
  (`apps/api/src/settings/`); every change is written to Redis and applied at once by every API
  process and game server.
- Suspensions: Better Auth's `session.create.before` hook refuses the sign-in.

## Not built yet

- **An "Open Grafana" link** on Overview, once monitoring is deployed ([infra](../infra.md)).

## Not doing

Team roles inside the admin site.
