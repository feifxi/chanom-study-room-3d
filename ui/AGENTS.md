# HTML UI playground

This folder is an editable HTML copy of `Project-StudyRoom3d/demo`, for experimenting with UI before
porting approved changes back. See `README.md` and `manifest.json`.

- **2026-11-18: Home and Chat are separate rail entries.** Home opens the original room dashboard
  at `home-dashboard.html`; Chat retains `home.html`. Keep the room/DM conversation list,
  Messenger-style bubbles and compact Walk in action, plus the visible member list on desktop.
  See `DESIGN.md`. This is an approved HTML experiment, not yet ported to the source app.
- `home-old.html` and `home-old-active.html` / `home-old-you-run.html` preserve the original
  Home for the owner's comparison. Keep them separate from the current Chats entry point.
- The owner reverted the Home-overview and top-right account-action experiment. Home again has
  Friends out right now, room cards, More rooms and All / Active / You run filter pages.
  The discarded previews are preserved at `home-overview-preview.html` and
  `home-overview-preview-guest.html`; do not restore them as the current UI unasked.
  Preserve historical comparison files. The authoring script
  `tools/add-home-navigation.mjs` is a one-time pass and must not be rerun over edited pages.
- The current room-chat experiment adds a real room screenshot, named presence and a primary Walk in
  above message history. `home-chat.html` preserves the earlier chat-only layout. Compare all three
  in Demo. Do not overwrite these comparisons when changing the current Home.
- The current conversation-list title is a dropdown for **GroupChat** (rooms) / **PrivateChat** (DMs).
  List search respects the selected type. Keep the room preview on room conversations only.
- Room previews can collapse to a compact map/presence bar. Keep Walk in visible and usable in
  both states; remember the fold preference locally and preserve the disabled action for full rooms.
- Keep the room profile stack visible when collapsed. Pinned messages open from a header pin icon;
  do not restore a separate pinned strip beneath the room preview.
- The full left rail is restored: Home, Chat, Friends, Focus, Discover, Shop, Plus, Inbox,
  Settings and the profile. There is no shared account toolbar above the page.
- Plus and Inbox continue directly beneath Shop in the upper navigation group;
  only the profile stays at the bottom. Keep the existing icon and button sizes.
- The original dashboard stacks the date above the greeting, and the friends heading above the
  shortcut row, matching the owner's reference. Friend shortcuts retain names and room names,
  with a distinct Join affordance inside one clickable link. The room grid remains viewport-aware.
  The friend row never wraps: swipe/scroll horizontally or use its Previous/Next arrows. Buttons
  disable at the ends; `assets/friend-scroll.js` handles scrolling and overflow changes.
  The original dashboard has a viewport-aware two-row room
  grid on desktop. Its public-room actions share a full-width 36px footer aligned across cards.
  Rules are `assets/home-fit.css`; historical comparison pages remain unchanged.
- **2026-11-21: Home room pop-up.** Pressing a Your rooms card opens a room pop-up (banner, name, map,
  description, Discover categories, people stack, Chat + highlighted Walk in; ⋯ menu from the owner's
  reference with a red Leave room last; Notifications opens a side menu). The pop-up also shows Next event
  and Pinned messages (sample content). A card's ⋯ opens the room menu beside it on Home. Code:
  `assets/room-detail.css` / `.js`. Home spacing is on a 4px grid (end of `assets/home-fit.css`).
  Your rooms cards share one look: map cover art, one-row status (count + one alert; Pin/Plus as icon
  badges; Plus is a gold crown), one-line title and description with ellipsis, people stack on every card
  (max 4 circles). Mentions show as an "@N" badge on the Chat button; join requests as icon + number.
  `tools/normalize-room-banners.mjs` was one-time; do not rerun.
- **2026-11-22: Room and character polish.** Group chats and More rooms use the shared room ⋯ menu.
  Notification preferences and message pins last for the browser tab. My character uses image
  tiles and shows a selection preview, with Shuffle, Reset and Save handled by `assets/account-settings.js`.
- **2026-11-19: Inbox is a full page at `inbox.html`, not a popover.** Keep the rail visible and
  Inbox selected. All/Unread, individual read toggles and Mark all read are local UI previews.
  The old popup is preserved at `inbox-popup.html` only for comparison. Account popovers remain
  beside the profile at bottom left. Inbox styling/behavior is `assets/inbox.css` / `assets/inbox.js`.
- **2026-11-21: Inbox in the rail opens a mini notification flyout** beside the rail (5 latest,
  All/Unread, Mark all read, See all notifications → `inbox.html`). On `inbox.html` itself the rail
  Inbox does nothing. Read state is shared with the full page via sessionStorage for the tab.
  Code: `assets/inbox-flyout.css` / `assets/inbox-flyout.js`, added to every current page with the
  rail. Historical comparison pages (`home-old*`, `home-chat`, `inbox-popup`,
  `home-overview-preview`) were deliberately left without it.
- **2026-11-21: Inbox categories.** Tabs are All · Unread · Mentions · Events · Reminders · Updates ·
  Pinned; each row has `data-category` (space-separated). Each row gets a pin button (added by
  `assets/inbox.js`); pinned rows move into a Pinned group at the top of All and show in the Pinned tab.
  Pinned state uses sessionStorage like read state. The Update notification (`data-whats-new`) opens a
  centred "What's new" dialog (`#whats-new`: short banner, header row with icon, title, v0.9.2 pill
  and round close, horizontal highlight cards with real captures, then New / Changes / Bug fixes as
  full-width bordered cards stacked vertically (body scrolls); keeps 48px from window edges); `inbox.html#whats-new` opens it directly and the rail
  flyout's update item links there. 13 mock notifications; ids 9–12 were added in this pass.
- Friends uses visual hangout groups and one aligned directory. Keep Earth and his Jamming status;
  the former A private room block has been removed.
- Discover has a compact introduction so Common/Open rooms appear earlier. Shop keeps its collapsible
  quests. Styles live in `assets/main-pages.css`; local Friends search and placeholder feedback live
  in `assets/main-pages.js`.
- **2026-11-22: Shop try-on.** The desktop character panel is wider and the catalogue shows six
  columns from 1240px. Product cards and the featured Try it on button add to a local preview with
  one item per category. Selections survive category navigation in the same browser tab. The panel
  uses the existing character capture and product images. Code: `assets/shop-try-on.js`.
- **2026-11-22: Main Plus comparison.** `plus.html` opens with the Free and Plus pricing cards
  and the Monthly/Yearly toggle. Keep the existing comparison routes. `plus-e.html` redirects here.
- **2026-11-22: Account entry.** Log in opens Home. Sign up collects account details and then
  opens the character editor. Login, signup and invite use the same room scene on desktop. Thai tea
  is the colour palette. See `DESIGN.md` for the typography scale and prototype interaction details.
- **2026-11-21: Account menu and windows split.** The profile menu (`profile-menu.html`) is
  Edit profile · Settings · Connecta Plus (highlighted card → `plus.html`) · Sign out; Shop was removed.
  "Edit profile" = `settings-profile.html` + `settings-character.html` (2-item nav, labelled section
  cards, Save in a footer). "Settings" = appearance, voice, controls, notifications, privacy, plus,
  account (7-item nav). Settings is reached only from the profile menu (the rail Settings button was removed). Styles/behaviour:
  `assets/account-settings.css` / `.js`. `tools/split-account-settings.mjs` was a one-time pass;
  do not rerun it.
- **2026-11-21: Shared room card.** Home "Open now" and Discover use one `.room-card` (3 per row,
  cover with badge + chips, name, 1-line description, people stack (max 5 circles, last "+N") + stats,
  friend, 44px action; spacing on a 4px grid) from
  `assets/room-card.css`. Discover Open rooms filter through a Filters pop-up (`assets/room-filter.js`,
  multi-select categories + language). `tools/build-room-cards.mjs` was one-time; do not rerun.
  Shop has 44px buttons/tabs and uniform full-image item cards (end of `assets/main-pages.css`).
- Room cards use a tinted surface and stronger 1px border in both themes (now via `.room-card`);
  keep this treatment on Common and Open cards, including cards implemented as buttons.
- Focus and Plus share Nunito typography and compact summaries in `assets/ui-consistency.css`.
  **2026-11-21:** Focus cards have colour-coded section headers (My numbers lavender, By subject mint,
  Rankings peach) and Rankings has a top-3 podium above the unchanged full list.
  Discover's introduction uses Search on the right, without a featured-room card.
- Current pages use source-project cover/product images in `assets/project-images/` instead of
  emoji artwork. Decorative emoji are removed from UI text; functional symbols use line SVGs.
  Preserve historical comparison pages as captured.
- Room HUD positions follow the supplied reference: room/Leave at top left, tools beneath it,
  people and an ellipsis at top right, a menu beneath the ellipsis, chat bottom left, controls
  bottom centre and zoom bottom right. `assets/room-hud.js` manages native menu previews only.
- **2026-11-21: The room name at top left is a plain label**, not a button. The "This room" menu
  opens only from the 3-dots button at top right; do not restore the left room panel. Home's
  friend Join links go to `walk-library.html`. `walk-card.html` (the old left-panel capture) is
  kept only as a catalogue reference; old Home comparison pages still link to it.

- Work in this folder unless the owner asks to port changes to the original project.
- Keep UI copy in English and match the existing Connecta design.
- Use HTML, CSS and small vanilla JavaScript interactions. Do not add a framework, 3D engine,
  audio/video, chat service or other backend behavior.
- 3D areas use screenshots from the real demo. Never generate replacement images.
- Put shared styling experiments in `assets/overrides.css`; edit page `.html` for structure/content.
- Chat-first layout styles and UI behavior live in `assets/chat-layout.css` and `assets/chat-layout.js`.
- Room-preview styling lives in `assets/room-preview.css`. Room images are real captures in
  `assets/captures/`; `library-social-cover.json` records the new Library screenshot's source.
- `tools/refine-consistency.mjs` is a one-time authoring pass, not an idempotent build command.
  Do not rerun it over the edited UI. Check this revision with `node tools/check-ui-consistency.mjs`.
- `tools/build-home-overview.mjs` and `tools/check-home-overview.mjs` belong to the reverted
  experiment. Do not run the authoring tool or treat its old checks as current-page verification.
- Room pages contain `.ui-desktop` and `.ui-phone` variants; consider both when editing the HUD.
- Check phone and desktop widths, light/dark themes and relevant guest screens.
- `tools/export-demo.mjs` and `tools/build-html.mjs` regenerate captured HTML and overwrite edits.
  Do not rerun them on an edited playground without preserving the edits first.
- Only commit, push, deploy or port to the source project when asked.
- Launch headless browsers with `--mute-audio`.
