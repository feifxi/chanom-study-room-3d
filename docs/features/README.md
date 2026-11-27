# Features

One spec per feature, listed in **build order**: each one needs only what's above it. Read them in
this order to learn the app. Every feature is built unless its spec says otherwise; the app's
layout (header, pages, the 3D HUD) is in [Design](../design.md), not here.

Each spec has the same shape: a line linking its PBIs ([releases](../releases.md)) and its code
walkthrough ([guide](../guide/README.md)), what it is, how it works, **In the code** (the entry
points; the guide walks through them), then **Not built yet** or **Not doing**.

## Foundations: people and rooms

| Feature                                  | In one line                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| [1. Accounts and guests](01-accounts.md) | Google, Discord or an email code; 13+; @handles; guests try rooms first    |
| [2. Rooms and membership](02-rooms.md)   | Private, Ask to join or Open; three roles; invites, guest passes; Discover |

## Social: talking outside 3D

| Feature                                  | In one line                                                       |
| ---------------------------------------- | ----------------------------------------------------------------- |
| [3. Friends and presence](03-friends.md) | exact @handle or link; only friends DM and see where you are      |
| [4. Chat, DMs and the inbox](04-chat.md) | one saved chat per room, 1-to-1 DMs between friends, the 🔔 inbox |

## The place: being in a room together

| Feature                         | In one line                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------- |
| [5. The 3D room](05-room-3d.md) | the game server; walking, proximity voice, private zones, bubbles, cats; budget |
| [6. Maps](06-maps.md)           | the standard kit every map has; the Library; the editor waits for Blender       |

## Things to do

| Feature                                                   | In one line                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| [7. Study tools](07-study-tools.md)                       | a personal focus timer, a private to-do list, Focus rankings  |
| [8. Activities](08-activities.md)                         | one flow for every activity: spot, lobby, play, results       |
| [9. Watch together and photo mode](09-watch-and-photo.md) | YouTube or a screen share on the TV, in sync; photos anywhere |
| [10. Party games](10-party-games.md)                      | Pick a Side, the whiteboard, Draw & Guess                     |
| [11. Table games](11-table-games.md)                      | chess and Slave, in panels                                    |

## Safety: open to strangers

| Feature                                        | In one line                                                   |
| ---------------------------------------------- | ------------------------------------------------------------- |
| [12. Moderation and reports](12-moderation.md) | word filter, slow mode, automatic report steps, picture check |
| [13. Common rooms](13-common-rooms.md)         | Connecta's own text-only rooms, in copies, open to guests     |

## Money

| Feature                                                | In one line                                           |
| ------------------------------------------------------ | ----------------------------------------------------- |
| [14. Coins, quests and the Shop](14-coins-and-shop.md) | earn-only coins from daily quests; cosmetics and pets |
| [15. Connecta Plus and payments](15-plus.md)           | one subscription, Stripe (card and PromptPay), gifts  |

## Running Connecta

| Feature                                             | In one line                                                     |
| --------------------------------------------------- | --------------------------------------------------------------- |
| [16. Team accounts and the admin site](16-admin.md) | `/admin`: reports, users, rooms, Common rooms, money, audit log |

## AI

Today nothing uses AI but the picture check. AI decks for Pick a Side come with Plus. Ideas for
after launch: smarter text moderation, talking study buddies, an AI game host, "what did I miss"
summaries. No AI tutor or chatbot. (AI flashcards were dropped.)
