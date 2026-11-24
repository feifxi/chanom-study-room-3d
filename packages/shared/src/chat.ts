/** Chat rules shared by the web app and the API (docs/features/04-chat.md). */

/** Longest message, in characters */
export const MESSAGE_MAX = 2000;
/** Pictures in one message */
export const PICTURES_MAX = 4;
/** Largest picture anyone can pick (Plus; Free is lower: ROOM_PLANS.uploadMb); it's shrunk before it's stored */
export const PICTURE_MAX_MB = 50;
/** Messages per page when scrolling back */
export const MESSAGES_PAGE = 50;
/** "Mai is typing…" stays this long after the last keystroke signal */
export const TYPING_MS = 4000;

/**
 * The @handles a message mentions, lowercased, in order, without repeats. "@room" comes back as
 * "room" (only the owner and mods can ping everyone; the API decides).
 */
export function mentionedHandles(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/(?:^|[^\w@])@([a-z0-9._]*[a-z0-9_])/gi)) found.add(m[1]!.toLowerCase());
  return [...found];
}
