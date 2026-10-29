/**
 * Background music, served from apps/web/public/music. Royalty-free tracks from Pixabay (Pixabay
 * Content License: free to use, credit not required, but we credit the artist anyway). Don't add
 * tracks downloaded from YouTube or Spotify.
 */
export interface Track {
  title: string;
  artist: string;
  src: string;
}

export const TRACKS: Track[] = [
  { title: 'Lofi Coffee Shop', artist: 'Alex Morgan', src: '/music/alex-morgan-lofi-coffee-shop-568150.mp3' },
  { title: 'Lofi Sunny Cafe', artist: 'Alex Morgan', src: '/music/alex-morgan-lofi-sunny-cafe-568156.mp3' },
  { title: 'Lofi Cocktail Bar', artist: 'Alex Morgan', src: '/music/alex-morgan-lofi-cocktail-bar-568153.mp3' },
  { title: 'Lofi Midnight Club', artist: 'Alex Morgan', src: '/music/alex-morgan-lofi-midnight-club-568164.mp3' },
];

/** The playlist loops: after the last track comes the first. */
export const nextIndex = (i: number, count = TRACKS.length) => (i + 1) % count;
export const prevIndex = (i: number, count = TRACKS.length) => (i - 1 + count) % count;

/** How loud the music is while someone is talking (fraction of the chosen volume). */
export const DUCKED = 0.3;
