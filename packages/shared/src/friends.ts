/** Friend rules shared by the web app and the API (docs/features/03-friends.md). */

/** A request nobody answers goes away after this many days */
export const FRIEND_REQUEST_DAYS = 30;
/** Requests one person can send in a day, against spam */
export const FRIEND_REQUESTS_PER_DAY = 20;
/** Most friends one person can have, like Discord */
export const FRIENDS_MAX = 1000;

/**
 * Who can send you a friend request (Settings → Privacy & safety). "rooms" means people who share a
 * room with you (a membership; people inside the same room right now join them with presence).
 */
export const REQUESTS_FROM = ['anyone', 'rooms', 'nobody'] as const;
export type RequestsFrom = (typeof REQUESTS_FROM)[number];
