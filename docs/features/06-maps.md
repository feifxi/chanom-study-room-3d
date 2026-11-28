# 6. Maps

PBIs: [MAP-1 to MAP-4](../releases.md#6-maps) · How the code works: [Release 1](../guide/04-release-1.md#the-library-map-1), [Release 2](../guide/05-release-2.md#the-librarys-activity-spots-and-map--look-map-2-map-3), [Release 3](../guide/06-release-3.md#more-maps-map-4)

Owners pick a template; only the Connecta team builds templates. Maps are code-built for now;
Blender models come later. **Every map has the same standard
kit** (so every activity works everywhere) **but its own layout**.

**The Library is the one main map.** The Cat Café and Starry Rooftop are temporary maps: still
selectable, not polished, and their future is decided with the Blender work.

## The standard kit

| Piece          | Needs                  | Library (main)                                 |
| -------------- | ---------------------- | ---------------------------------------------- |
| Study spots    | 12+ seats              | 4 small tables, a 10- and an 8-seat long table |
| Lounge         | a corner to hang out   | TV lounge                                      |
| Private zones  | at least 2             | Fireside, Window booth                         |
| Big screen     | Watch together         | TV on a console                                |
| Card table     | card games             | 1, six stools                                  |
| Chess table    | chess                  | 2 stools by the door                           |
| Lantern circle | 12 cushions, decor     | cushions round a lantern                       |
| Open floor     | 12 m²+ for Pick a Side | 5.4 m square four-colour rug                   |
| Whiteboard     | draw together          | 3 m board, no rug                              |
| Art corner     | Draw & Guess           | round table, 10 stools                         |
| Buddy Machine  | cats and study buddies | by the door                                    |
| Nap spots      | where cats sleep       | hearth, shelf, sofa                            |
| Spawn          | where you walk in      | front door                                     |

The Café and Rooftop still have two 4-stool card tables, no chess table, and hanging zone plaques.

## Size and layout rules

- **One size, built for 30** (26 × 18 m): the most any room holds (Plus), plus its owner and mods.
  Free rooms stop at 15. Common rooms use the same maps and the same 30.
- Quiet at the back (study), loud at the front (games), private zones against walls.
- **The rug is the area:** every activity spot and private zone is a rug; areas never overlap. The
  whiteboard is the exception (just a strip in front of it).

## What owners change (Room settings → Map & look)

Owner only. Template (switches live), time of day (Follow the clock / Always day /
Always night, the same for everyone inside). No colours or signs. **Live switch:** a loading
screen, then everyone lands at the new door; voice, chat, bubbles, timers and music carry on.

## In the code

- Map data (seats, walls, zones, spots, door): `packages/shared/src/maps/` (`library.ts`,
  `cafe.ts`, `rooftop.ts`), read by the game server and the web app; the web app adds the 3D look
  (`apps/web/src/features/map/`).
- The admin site's Maps page lists the maps and says the editor comes with the Blender models.

## Not built yet

- **The map editor** (team only), built with the Blender map format, not before. Planned: a
  top-down grid, a catalog of pieces (no uploads), zones as rectangles, a live standard-kit check
  that keeps **Publish** off until every row passes, a walk test, and versions with Roll back.
  Publishing moves rooms over live after a 60-second banner. The approved mock of its screens
  is in git: `git show 6c2fdc3:demo/src/features/admin/MapEditor.tsx` (and `mapDraft.ts` beside it).
- **Blender models, starting with the Library:** one compressed GLB per map with baked lighting;
  seats, spots and zones read from named objects (`seat_12`, `spot_tv`, `zone_fireside`). Then
  characters behind one interface (`update`, `group`, `labelHeight`, `dispose`). Budget: map
  ~2–3 MB, character ~200–300 KB. Static art from Blender; game-state things stay in code.
- **Library polish:** odd furniture at the camera's angle, overlapping rugs, overlapping name labels.
- **Premium maps** (Plus), more templates later (Greenhouse,
  Bakery, Kotatsu House…).
