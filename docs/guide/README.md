# Code guide

A walkthrough of how Connecta's code works, from scratch, for people new to the repo. Read it in
order the first time; later, jump to the feature you're working on.

| Chapter                                                       | What you'll learn                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [1. The big picture](01-architecture.md)                      | the four servers, what each one owns, and how a click travels through them            |
| [2. The repo and its conventions](02-repo-and-conventions.md) | where files go in each app, naming, style, tests, the seed, the docs                  |
| [3. Techniques](03-techniques.md)                             | sign-in, the typed API client, live events, the game server, voice, jobs, files, 3D   |
| [4. Release 1 in the code](04-release-1.md)                   | study with friends: accounts, rooms, friends, chat, the 3D room, focus, safety basics |
| [5. Release 2 in the code](05-release-2.md)                   | hang out and play: guests, Discover, pictures, cats, activities and every game        |
| [6. Release 3 in the code](06-release-3.md)                   | open to everyone: Common rooms, report steps, coins and the Shop, Plus, money         |
| [7. How to…](07-recipes.md)                                   | add an endpoint, a page, a database field, a game message; run and debug things       |

Chapters 4 to 6 follow the [release plan](../releases.md): each walks through the code behind that
release's PBIs, saying how each part works inside and linking every file involved.

**Other docs:** what each feature does for people is in its [spec](../features/README.md); why
things are the way they are in the [decision log](../decisions.md); test tools, maps and gotchas in
the [developer guide](../dev-guide.md); setup commands in [`AGENTS.md`](../../AGENTS.md#commands).

## Words you'll see everywhere

| Word            | Means                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **Room**        | the top-level thing: a 3D place with members, one chat and a map. Never "server" or "channel" in code |
| **Walk in**     | open a room in 3D (`/r/<id>/walk`): the browser joins the room on the game server                     |
| **Game server** | `apps/game`, the Colyseus server that runs every room in 3D (movement, bubbles, activities)           |
| **Gateway**     | the API's second process: the Socket.IO connection (`/live`) that pushes chat, presence and the inbox |
| **Ticket**      | a one-minute signed pass from the API that lets you into a room on the game server                    |
| **Room event**  | the API telling the game server "something changed" (kick, ban, map…) through Redis                   |
| **Spot**        | a place in a map where an activity happens (the TV, a card table, the open floor)                     |
| **Common room** | Connecta's own room anyone can walk into; runs in copies, has no database row                         |
| **Guest**       | someone without an account: a temporary Better Auth account in their browser                          |
| **Team**        | Connecta's staff accounts (`users.team`), who see the admin site                                      |
| **Seed people** | the local test accounts (`fei`, `ter`, `view`…), signed in as `<handle>@connecta.test`                |
