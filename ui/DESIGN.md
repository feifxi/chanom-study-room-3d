# Chat-first UI experiment

Approved direction from the owner's five references, 2026-11-16. Operate mode.

- Chat uses the conversation layout at `home.html`. Home is a separate rail entry for the original
  room-card dashboard, restored to navigation on 2026-11-18 at `home-dashboard.html`.
- Messenger supplies the conversation-list, compact header, pinned strip, bubble and composer layout.
- Teams supplies the narrow left navigation with both icon and readable label.
- Discord supplies the member column with names, status and activity. Show it by default on desktop;
  use the Members button when width is limited.
- Keep Connecta's existing Nunito font, warm light theme, plum dark theme and palette tokens.
- Keep room names, people and preview data from the captured demo. The single outgoing room bubble
  is illustrative UI content. No messages are sent or stored.
- The first chat-only revision keeps Walk in in the header; it is preserved at `home-chat.html`.
  The room-preview experiment below makes Walk in the primary action above the conversation.
  Calls and video controls from the visual references are not added as product features.
- On phones show the list first at `home.html`; selecting a conversation opens the thread with a
  Back to chats action. Keep the left navigation labeled.

The editable markup is in the individual HTML files. Shared rules are in `assets/chat-layout.css`;
search, member toggles and other UI previews are in `assets/chat-layout.js`.

The original capture tools overwrite HTML experiments. `tools/chat-layout.mjs` records this one-time
authoring pass from the preserved capture; rerunning it also overwrites hand edits on these pages.

## Room preview experiment, 2026-11-16

The owner asked to try a middle ground between the original room cards and the familiar chat UI.
Room conversations now show a real 3D screenshot above the message history, named people inside,
a short invitation and one primary Walk in action. The member column and message composer stay visible.
Pinned messages open from the pin icon in the conversation header, alongside Search and Members.
There is no pinned strip below the preview. Direct messages keep their existing layout.

The image is an atmospheric room snapshot, never labeled Live. Presence is shown separately from the
snapshot. The Library image was captured from the running original demo after walking toward the
group, with the HUD hidden only for capture. Other maps use the previously captured real room images.

Chat-only is preserved at `home-chat.html`; the original room-card Home stays at `home-old.html`.
The default `home.html` is the new combined experiment. The Demo menu links all three versions.
The preview's static markup is editable in the HTML files; its shared styling is `assets/room-preview.css`.

The room image can be collapsed with Hide preview. The folded state keeps a compact map/presence
summary, the same Walk in link and an expand control. The browser remembers the choice across rooms.
The profile stack remains visible beside the compact map/presence summary, including on phones.
Full rooms retain their disabled Room full state while folded.

## GroupChat / PrivateChat selector

The owner requested a dropdown at the former Chats title, matching the supplied app-switcher reference.
GroupChat lists room conversations. PrivateChat lists one-to-one conversations. The current choice has
a checkmark and each option includes a short description. The selected type also scopes list search.
The action beside the title is Make a room for GroupChat and New message for PrivateChat.
Private chats show the other person's name and presence in the conversation header. The member
column and its toggle appear only in room chats.

On desktop, changing type restores the last conversation of that type, falling back to its first row.
On the phone's list screen, changing type filters the list without forcing a conversation open.
Opening a room or DM directly selects its corresponding type. The two earlier comparison Home pages
retain their original headings and layouts.

## Daily-page layout refinement, 2026-11-16

The account menu opens beside the left rail, with a viewport-clamped width and height. Its bottom
edge follows the profile trigger. Inbox is now a full page, as described in the 2026-11-19 revision.

Discover retains its room cards and filters, with a compact title/search panel. Search replaces
the featured-room summary on the right on desktop and sits below the title on phones.

Friends replaces the old text-heavy columns with two visual hangout groups, using existing room
screenshots and stacked profile initials. A single directory aligns identity, activity, presence
and actions. The six existing friends remain; Earth's private-room location is removed while his
Jamming activity remains. Search filters the directory locally.

Shop reduces the sidebar, character preview, featured product and product-card art. Categories stay
in a compact horizontally scrollable tab row. Quests use a native disclosure so the catalogue has
priority; the phone layout brings the character and controls into a compact block above products.

Shared styling lives in `assets/main-pages.css`, with small UI-only behavior in `assets/main-pages.js`.
The original Home comparisons are unchanged.

## Typography, artwork and room controls, 2026-11-17

Home, Friends, Discover, Focus, Inbox, Shop and Plus share the Nunito page-title scale at 28px on
desktop, 24px on phones and weight 800. Plus prices use the lighter weight 750. Focus retains its
chart, subjects and rankings.

The Feifei character preview uses `assets/feifei-avatar.png`, a transparent ImageGen cutout based on
the original Plus capture. Plus, Shop, Inbox highlights, character onboarding and profile settings
reuse that file. The original captures remain available for reference.

Current-page text no longer uses decorative emoji. Cover and product placeholders use existing
files copied from `Project-StudyRoom3d/demo/public/images`, with provenance in
`assets/project-images/source.json`. These are existing project artworks, distinct from actual
room-runtime screenshots in `assets/captures`. No new images were generated. Utility icons are
line SVGs. The original Home comparison files remain intact.

The room HUD follows the owner's supplied reference positions. The room identity and Leave
control are top left, with the tool rail below. Presence and the ellipsis are top right. The
ellipsis opens a native popover below it, grouping room actions and personal preferences.
Chat stays bottom left, the control dock bottom centre, and zoom bottom right. At intermediate
widths chat lifts above the dock to avoid overlap; phone controls remain compact. Menu toggles
only change their UI state and action buttons give preview feedback. This adds no media or
multiplayer behavior. Shared rules are `assets/ui-consistency.css` and `assets/room-hud.js`.

## Home navigation and card separation, 2026-11-18

Home appears above Chat in the shared left rail. It uses the restored original room dashboard;
Chat remains a separate destination. Original comparison files
are preserved. Existing project covers replace decorative emoji in the adapted dashboard.
The rail can scroll on short viewports so account actions remain reachable.

Discover Common and Open cards use a stronger 1px border and a contrasting surface. Dark cards
are lighter than the surrounding page; light cards have a soft tint. Hover and keyboard focus
use the existing primary color for the border without changing card dimensions or actions.

## Reverted Home overview experiment, 2026-11-18

The owner found this version strange and requested the previous Home and navigation back.
The original room dashboard and full left rail are current again. This section records the
discarded experiment only; its standalone previews are `home-overview-preview.html` and
`home-overview-preview-guest.html`. The new-user route redirects to the restored Home.

The owner's approved plan prioritizes places to join now over room management. Home shows one
row of three occupied rooms, then Common rooms, then Open rooms. The old Friends out right now
strip is removed because room cards already identify who is inside. Secondary rooms live in a
closed native disclosure after public rooms, using the same card component as the first row.
There is no separate list style for empty rooms. Full rooms retain disabled Walk in and usable Chat.

The new-user preview at `home-dashboard-guest.html` starts with Common rooms and Open rooms,
without a large empty personal-room panel. Phone sections scroll horizontally and show a partial
next card, preserving access to public rooms without stacking every card above them. The former
Active and You run routes are aliases of the overview rather than additional modes.

The rail keeps five core destinations at their existing sizes and the profile at the bottom.
Named Shop, Plus and Inbox actions sit at the top right in shared page chrome. Home's title uses
that same row. Settings stays in Character & settings in the profile menu. Inbox follows its new
trigger and never covers the rail. The room HUD and historical comparisons remain separate.

This remains a static mock-data experiment. Covers/captures are existing project files. Native
disclosure behavior lives in `assets/home-overview.js`; shared page chrome and cards are in
`assets/home-overview.css`. Browser coverage is recorded in `reference/home-overview/verification.json`.

## Original Home first-screen refinement, 2026-11-18

The owner requested a complete first-screen room group rather than another Home redesign. The
date sits above the greeting and Friends out right now sits above the shortcut row, matching
the latest supplied reference. At desktop widths of 1000px and above,
the six featured rooms use three columns with two viewport-aware rows, capped at 242px per card.
The first group fits within laptop viewports such as 1440×768. Phones retain the original vertical
room flow, with wrapping action rows so avatars do not clip the buttons. Existing filters and
More rooms remain in place.

From 900px wide the Home greeting uses the existing Rooftop crop with a soft lavender tint and a
generated star texture behind it (`assets/home-rooftop-stars.png`). All of it sits within the
greeting's existing height. Narrower screens show the greeting text only.

Open now and Discover public-room cards stretch to their grid cell and use equal full-width 36px
actions at the bottom, including Join & walk in, Walk in and unavailable states. Copy length no
longer determines button width. The footer treatment is shared by anchors and button cards.

Plus, Inbox and Settings now follow Shop in the upper rail group. The profile alone stays below.
Spacing is tighter, while icons and button hit areas keep their previous sizes. Inbox retains
its own full-page destination as of 2026-11-19. Styling is `assets/home-fit.css` plus the shared rail rules.

Friend shortcuts now separate the avatar, name/room and Join affordance. The whole shortcut is
one link, with a tinted hover surface, a primary-color Join label and a keyboard focus ring.
Names and room names remain visible without ellipsis. Narrow screens scroll the shortcut row;
desktop widths show all five when space permits. Mook's location is Cat Café #2, matching its
existing destination. Navbar placement and room-card action sizing are unchanged by this pass.

The friend strip uses implicit horizontal grid columns, so additional friends extend the same
row instead of starting a second row. Previous/Next buttons share the section-heading line and
move by one friend. Touch/trackpad scrolling remains native. The arrows disable at the ends
and update when the viewport or friend collection changes. Reduced motion uses instant scrolling.

## Full-page Inbox, 2026-11-19

The owner requested a notification page instead of the floating popup. `inbox.html` now fills the
available content area beside the unchanged rail, with Inbox selected and no chat behind it.
The header and All/Unread filters stay visible while the feed scrolls. The nine original mock
notifications are preserved, with Today/Earlier groups, type labels, times and clearer unread rows.

Individual read toggles, Mark all read and an unread empty state work locally in this page. Counts
and its rail badge update together; reloading restores mock data. Tabs support keyboard navigation.
Notification links and the notification-settings destination reuse existing prototype pages.
There is no backend, notification delivery or persisted account state. The prior popup is kept at
`inbox-popup.html`; its positioning rules apply only to that comparison. Shared code is
`assets/inbox.css` and `assets/inbox.js`, verified in `reference/inbox-page/verification.json`.

## Inbox flyout, 2026-11-21

The owner asked for a Facebook-style mini notification panel. Pressing Inbox in the rail now opens
a flyout beside the rail instead of navigating. It shows the five latest of the nine mock
notifications, All/Unread pills, Mark all read, per-row read toggles and a See all notifications
link at the bottom that opens the full `inbox.html` page. Outside click or Escape closes it.
On phones it uses the space right of the rail and stays within the viewport.

Read state is shared between the flyout, the rail badge and the full page through sessionStorage,
so it survives navigation in the same tab and resets with a new tab. Opening a notification marks it
read. On `inbox.html` the rail Inbox stays on the page. Code: `assets/inbox-flyout.css` and
`assets/inbox-flyout.js`; `assets/inbox.js` reads and writes the shared state. Historical
comparison pages were not changed.

## Room menu only from the 3-dots button, 2026-11-21

The owner asked that the "This room" panel no longer open beside the room name at top left. The
room name card on every current walk-*/common-* page (desktop and phone markup) is now a plain
label that does nothing when pressed. "This room" (Invite, Room settings, your settings, Report)
opens only from the 3-dots button at top right, unchanged. Leave stays the icon left of the room
name. Home's Friends out right now Join links open the plain room (`walk-library.html`) with no
menu open. `walk-card.html` remains as the captured old state for reference in the catalogue.

## Plus page: Free vs Plus experiments, 2026-11-21

The owner asked for a Plus page that makes the difference between Free and Plus obvious, with
alternatives to choose from and the current page kept. A "Current | A | B | D" bar at the top of all
four pages switches between them. The new versions address a Free user who is deciding; the main
action is Get Plus, with a Monthly/Yearly toggle (฿89 / ฿890, "2 months free") remembered locally.

- **A · Cards** (`plus-a.html`): Free and Plus cards side by side, each listing the same feature rows.
  ✓ means included, – means limited on Free, ✕ means not on Free. Then "Free is enough if… /
  Get Plus if…", what happens if Plus ends, the existing FAQ and a final call to action.
- **B · Table** (`plus-b.html`): one Free | Plus table grouped by Your rooms, You, Sharing & tools and
  Always free, with price and Get Plus in the header. On phones each row stacks the feature name
  above its Free and Plus values.
- **D · Pros & cons** (`plus-d.html`): plain-language pros and cons for each plan, including Plus's
  costs and downsides, then a short answer for who should pick which.

The reference pricing screenshots were used only for structure. Colors and type are Connecta's own
tokens (Nunito, warm light, plum dark). Icons always carry text, so meaning never relies on color.
Free values the demo does not state are placeholders. Styles are `assets/plus-compare.css`; the
billing toggle is `assets/plus-compare.js`.

Revision the same day: the owner asked the three experiments to borrow from the current Plus page and a
supplied pricing reference (structure only). Heroes now match the current summary (warm
secondary → peach → lavender gradient, crown badge, character tile). Feature groups use the current
page's tile colours as chips: Your rooms lavender, You mint, Sharing sky, Always free peach. Each
version's plans sit on one soft shared panel with the title at left and the Monthly/Yearly pill at
right; Free is a flat card and Plus is a raised, filled card (brand colour mixed with deep plum,
white text, 8:1 contrast) with a "For room owners" pill. In B the Plus column header is that filled
card. Decision tiles use lavender (Free) and peach (Plus). Rules are the "Revision" block at the end
of `assets/plus-compare.css`.

## Landing, accounts, Plus and message actions, 2026-11-22

- Landing shows the room overview, voice and activities, study tools, private rooms, Common rooms,
  safety, Plus and FAQ. Its logo opens Home. The activity and study images are cropped captures of
  the corresponding playground screens.
- Log in and Sign up place full-width Google and Discord buttons above the email form. Email log in requires
  a password and opens Home in the demo. Email sign-up requires matching passwords. Provider
  sign-up proceeds to display name and birthday, followed by the character editor.
  The 13+ age check runs before character creation. Sign out clears the local profile preview and
  returns to Landing. The invitation and guest character screens use the same left-side room scene
  as Log in. Their artwork tiles fill the available width. Compact screens move accessories below
  the avatar and colour controls.
- Try a room as a guest starts at the guest character editor and continues to Discover. The guest
  rail shows the Connecta mark, Discover and a Guest profile. The profile shows the display name,
  Change account opens Log in, and Sign out returns to Landing. The landing invite
  icon simulates a shared room link. Its guest editor leads to Chanom Friends.
- Thai tea is the sole colour palette. Light, Dark and System continue to control appearance.
- Landing displays a read-only Free and Plus comparison. The dedicated Plus page opens with plan
  cards side by side on desktop and stacked on small screens.
  The Monthly/Yearly selector updates the price and checkout route. FAQs follow the cards.
- Each message has React, Reply and a menu for Pin, Forward and Delete for me. The Pinned messages
  panel lists and removes existing pins. Chat edits and forwarding use tab-local fixtures.

### Design system

See [the design system](docs/design-system.md) for the current typography, Thai tea palette,
spacing, and component guidance.

## Earlier Plus E comparison and Shop try-on, 2026-11-22

In the earlier comparison, the owner chose E as the main Plus page (`plus.html`) and removed the version switcher. E keeps the
original character introduction and illustrated benefits, then uses B's comparison table for Free
and Plus. A Compare plans link jumps there from the introduction. Monthly and Yearly share the
existing toggle. Prices use Nunito with lighter, more widely spaced numerals. The old E link
redirects to the main page. See `AGENTS.md` for the archived routes.

The capacity card makes the two limits visible near the description: 25 / 100 people at once (100 on
Big maps) and 150 / 1,000 members. Bars use the same scale within each pair. The values use smaller
type, and the main comparison table header scrolls with the rest of the page.

The Shop gives the character preview a wider left panel and shows six catalogue columns on wide
desktops. The existing tabs, coins and quests sit in their original areas. Selecting a product
highlights its card and puts its artwork beside the character and in the Trying on list. Each
category contributes one item, and Remove clears it. The preview uses the captured character and
existing product art. It is local to the browser tab.

## Inbox categories, pinning and What's new, 2026-11-21

The owner asked for more Inbox categories, pinning and an update log. The confirmed tabs are
All · Unread · Mentions · Events · Reminders · Updates · Pinned, each with a count; on phones the tab
row scrolls sideways. Four sample notifications were added: a v0.9.2 platform update, a Focus
reminder, a scheduled Study Sprint event and a second mention. A notification can belong to more
than one category (Draw & Guess is both an Event and a Reminder).

Every notification has a pin button beside its read toggle (visible on hover/focus, always on touch).
Pinned notifications move to a Pinned group at the top of All, return to their original place when
unpinned, and are listed in the Pinned tab. Pinned and read state last for the browser tab.

Pressing the Update notification opens a centred What's new dialog: a real Library capture as the
banner, the patch badge "v0.9.2 · Nov 20, 2026", the "What's new" title and a one-line summary,
two highlight cards with real captures, then separate New (mint), Changes (sky) and Bug fixes (peach)
sections with bullets. ✕, Got it, Escape or a backdrop click closes it. The patch notes describe this
playground's own recent changes and are sample copy. The rail flyout's newest item is this update and
links to `inbox.html#whats-new`. Code: `assets/inbox.js`, `assets/inbox.css`, markup in `inbox.html`.

The update uses the same summary in Inbox, the rail flyout and the dialog. Highlight labels match the
current UI: This room and Compare plans. Typography follows the account windows and Inbox feed.

What's new layout, final revision the same day (inspired by a supplied subscription-dialog
reference, structure only): a short real-capture banner, then a header row with a sparkle icon tile,
"What's new", the v0.9.2 pill, a one-line summary and a round ✕ button, separated by a divider.
Two horizontal highlight cards (image left, text right) follow, then New, Changes and Bug fixes as
full-width bordered cards stacked vertically (scroll to read each), each with a tinted icon tile, coloured name and count pill. Spacing
is roomy: the dialog keeps 48px from the window top and bottom on tall screens (32px on laptops
shorter than 820px), 36px inner padding, and the body scrolls inside when space runs out. Phones stack
everything in one column. All dialog rules are the final block of `assets/inbox.css`.

## Account menu, Edit profile / Settings split, Discover and Shop polish, 2026-11-21

Profile menu: Edit profile (profile and character), Settings (sound, privacy, billing and more), a
highlighted Connecta Plus card (brand gradient, crown, "See plans →" button) linking to the Plus page,
and Sign out. Sign out's label and icon turn red on hover and visible focus. Shop is no longer in
this menu; it stays in the rail.

The old single settings window is now two windows sharing one frame (920px wide, 680px tall):
- **Edit profile** with My profile and My character. My profile shows a preview card, then Name
  (display name, @handle) and About me sections, with Save profile in a footer. My character shows the
  preview with Shuffle look, then Colours (Hair, Outfit swatches), Accessory chips and From the shop
  (owned items, link to the Shop), with Reset and Save my look in a footer.
- **Settings** with Appearance, Voice & sound, Controls, Notifications, Privacy & safety, Plus & billing
  and Account; their content is unchanged.
Each nav ends with a link to the other window. On phones the nav becomes a row of tabs at the top. The
rail's Settings button now opens Settings (Appearance).

Discover cards in each row share one height: fixed 128px cover, 17px title, two-line description,
13px meta text, 16px gap and a 44px action at the bottom, so Walk in buttons line up. Filter chips are
40px. A full room shows a dashed "Join · full now" action and a red capacity bar.

Shop buttons (Try it on, Buy, Pick something to try on, category tabs) are 44px/40px. Item cards use a
full-width 4:3 picture, the name (wrapping, never cut off) and price/status at the bottom; every card
is the same height with 16px gaps; two columns on phones.

Later the same day the owner removed the Settings button from the left rail, since Settings now opens
from the profile menu. The rail is Home, Chat, Friends, Focus, Discover, Shop, Plus, Inbox and the
profile. Historical comparison pages keep their captured rail.

## Focus page sections and podium, 2026-11-21

Each Focus card now reads as its own section: a 4px colour accent along the top, a tinted icon tile
and an 18px heading separated by a divider. My numbers is lavender, By subject is mint and Rankings is
peach. All cards share 22px corners, 24px padding (18px on phones) and 24px gaps; stat tiles are equal
with 12px gaps; Study in the Library is a 44px button; ranking rows are 44px.

The weekly summary uses lighter numerals and a faded Library cover on the right from 768px wide.
The artwork sits within the existing card height. Stat tiles and podium ranks use a lighter weight.

Rankings shows a top-3 podium above the full list (inspired by supplied leaderboard references, in
Connecta's own colours): 2nd on the left, 1st raised in the middle with a crown, 3rd on the right, each
with avatar, name and time on a brand-tinted step with its rank. The full ranking list below is
unchanged. Styles are the final block of `assets/ui-consistency.css`.

## One room card for Home and Discover, and a Filters pop-up, 2026-11-21

Home "Open now" and Discover (Common rooms, Open rooms, guest page) share one card, `.room-card`
(inspired by a featured-servers reference, in Connecta's own style). Three per row on desktop
(about 377px wide), two on tablets, one on phones. Each card is a wide 16:8 real cover with a
"Common room" / "Open room" badge and chips (language + categories, or "Text only"), then the name,
a one-line description, a stats row ("● 41/50 here · 230 members" or "● 142 here · 8 rooms"), the
friend inside when there is one, and a 44px action. Removed to keep it short: "You'll land in the
liveliest copy", "by owner" credits and the capacity bar. A full room shows a red Full pill, a red
dot, a muted cover and a dashed "Room full" action. Home now shows the three rooms you can walk into;
the full Anime Club stays on Discover.

Open rooms on Discover use one Filters button (badge with the number of active filters) instead of
the chip row. Its pop-up holds multi-select categories and one language, Clear, and "Show N rooms".
Active filters appear as removable pills beside the button with a "N of 4 rooms" count, and an empty
state offers Clear filters. On phones the pop-up becomes a bottom sheet. Code: `assets/room-card.css`,
`assets/room-filter.js`; `tools/build-room-cards.mjs` was a one-time pass and must not be rerun.

Room card revision the same day: every card on Home "Open now" and Discover shows who is inside as a
stack of up to five 32px circles (inspired by a supplied game-lobby reference), placed before the
"41/50 here · 230 members" count. Four are avatars; when more than five people are inside, the fifth
circle shows "+N" (people here minus four). A friend inside always comes first. Rooms with five or
fewer people show one avatar per person and no "+". Card spacing, padding, radii and sizes now sit on
a 4px grid (16px under the cover, 8px between lines, 12px before the people row, 20px around the
44px action, 20px between cards; 16px on phones). Buttons and filter controls stay at least 40–44px,
above WCAG 2.5.8's 24px minimum target size.

## Home: room pop-up and 4px spacing, 2026-11-21

Pressing a "Your rooms" card (anywhere except Walk in / Chat) opens a centred room pop-up instead of
going straight to the room page; the card's ⋯ opens the same pop-up with its menu open. The pop-up is
built from the card: the map banner with the card's status chips, a round ⋯ and ✕ at top right, then
the map icon, room name with owner/mod badge and map name, the description, category chips (only the
Discover filter's categories), and a people panel with the shared stack (max five circles, the last
"+N") and "3 of 100 inside". The footer has Chat and a larger, highlighted Walk in at the right (a full
room shows a dashed "Full · notify me"). The ⋯ menu follows the supplied reference: About this room,
Invite friends, Copy room link, Pin to top / Unpin, Mark as read (disabled when nothing is unread),
Notifications › (All messages / Mentions only / Nothing), Room settings, and a red-tinted Leave room
with icon last. Menu actions only give preview feedback. Escape closes the menu, then the pop-up.

All Home spacing now sits on a 4px grid with 40px+ targets: page padding 24/32, 24px section gaps,
friend shortcuts with 12px padding and gaps, 40px arrows, room cards with 16px padding, 8px chip gaps,
40px card buttons and ⋯, 32px avatars, 16px card gaps, More rooms rows of 64px with 40px ⋯.
Code: `assets/room-detail.css` / `assets/room-detail.js`, plus the final block of `assets/home-fit.css`.

Room pop-up revision the same day: the pop-up now shows a "Next event" row (calendar icon tile, event
name and a day/time pill) and "Pinned messages" (count and the latest pinned message with its author;
› opens the room chat) above the people panel. Event and pinned text is sample content per room.
A card's ⋯ on Home now opens the room menu right beside the button (no pop-up); the pop-up's ⋯ opens
the same menu, and About this room in the Home menu opens the pop-up. Notifications opens a side menu
("Notify me about": All messages / Mentions only / Nothing, with a check) to the right of the menu, or
the left when there's no room; on phones the choices replace the menu with a Back row. Escape closes the
side menu, then the menu, then the pop-up; arrow keys move within each menu and ← / → open or close
the side menu.

The room options menu is shared by group chat, featured rooms and the compact More rooms list.
Notification, room-pin and read choices survive navigation in the same tab. The Chanom Friends
About dialog links to its Room settings. The fixtures contain settings for Chanom Friends.
The chat's Pinned messages popover lets you add an existing message, jump to its original position,
or unpin it. New message pins are local to the room and tab and appear in the Home room preview.

Your rooms banner cards, same day: every card now uses the same parts. The background is its map's
cover art full-bleed (Library, Cat Café or Rooftop) under one shared dark gradient, replacing the mix
of in-room screenshots and gradient art. The top row is always one line: the count chip, then at most
one alert chip (e.g. "@ you · 3 new", "3 asking to join"), cut with "…" if needed; Pin and Plus became
40px icon badges beside the ⋯. Title (map icon, room name cut with "…", owner/mod badge) and the
description are one line each; the full text is in the room pop-up. Every card's bottom row is Walk in,
Chat and the shared people stack (max five circles, last "+N"); an empty room shows "Nobody yet". All
cards place the title and buttons at the same height; on phones the stack drops below the buttons.
`tools/normalize-room-banners.mjs` made this change once; do not rerun it.

Card badge fixes, same day: the "@ you · 3 new" chip became an "@3" badge on the card's Chat button
(full text kept as its tooltip and in the room pop-up), and "3 asking to join" became a compact lavender
chip with a person-plus icon and the number. The Plus room badge is now a gold crown circle with a soft
glow. The top row reserves space for the Pin / Plus badges so chips never sit under them; on phones the
two display-only badges are 32px. People stacks on Your rooms cards show at most four circles (three
faces + "+N"), with 12px overlap, and card buttons use 12px side padding. When a card is narrower than
372px (laptops around 1280px wide and phones) Chat becomes a 40px icon button that keeps its accessible
name and @ badge. Rechecked on the three Home pages at 1920, 1280 and 375px: no chip/icon overlap, no
row overflow and every people stack inside its card.
