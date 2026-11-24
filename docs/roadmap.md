# Roadmap

**Status (2026-11-24):** every feature is built on the real backend except the map editor, and
`pnpm db:seed` fills every feature's data. Nothing is deployed.

## Next

1. **The owner's hand tests** with [manual-tests.md](manual-tests.md). Fixes go in as they're found.
2. **Infra on AWS** when the owner says deploy ([infra.md](infra.md)). Start with what
   [open-issues.md](open-issues.md#before-deploying) lists under "Before deploying".
3. **A playtest**, then tune the Plus limits and prices with real numbers.
4. **Launch.**

## Later, no date yet

- **Blender models**, starting with the Library, with baked lighting; then characters. The **map
  editor** is built with the Blender map format ([7](features/07-maps.md)).
- **What happens to the Café and Rooftop** is decided with the Blender work.
- **Library polish:** odd furniture, overlapping rugs, overlapping name labels.
- **Cheaper cats:** merge each cat into skinned meshes before adding more.
- **Performance:** lower detail for far-away people, the perf check in CI, a mid-range Android test.
- **Plus perks marked Coming soon:** premium maps, Plus skins and pets, AI decks.
- **Pictures** for the maps and pages, from the team.
- The code cleanup and smaller items in [open-issues.md](open-issues.md).
