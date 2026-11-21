import type { Color, PieceSymbol } from 'chess.js';

/**
 * Connecta's own chess pieces: simple pastel silhouettes in a 45×45 box, cream for white and cocoa
 * for black (the popular free sets carry licences that don't suit the app). Each is a few shapes so
 * it reads at any size, phones included.
 */
const SHAPES: Record<PieceSymbol, React.ReactNode> = {
  p: (
    <>
      <circle cx="22.5" cy="15" r="6" />
      <path d="M15 35 Q22.5 17 30 35 Z" />
    </>
  ),
  r: (
    <>
      <rect x="14.5" y="18" width="16" height="17" rx="1" />
      <path d="M12 10 h5 v4 h3.5 v-4 h4 v4 h3.5 v-4 h5 v9 h-21 Z" />
    </>
  ),
  n: (
    <>
      <path d="M14 35 C14 28 17.5 24.5 21 22.5 C17.5 22.5 14 23.5 11.5 21 C11 17 16.5 12 21.5 10 L23 6.5 L26 10 C31 12.5 33.5 19 32.5 26 C32 30 31.5 33 31.5 35 Z" />
      <circle cx="23.5" cy="15" r="1.3" className="eye" />
    </>
  ),
  b: (
    <>
      <circle cx="22.5" cy="8" r="2.6" />
      <path d="M22.5 10 C30 16.5 30 26 25.5 31 H19.5 C15 26 15 16.5 22.5 10 Z" />
      <path d="M24.5 16 L20.5 21" className="cut" />
      <rect x="16" y="30.5" width="13" height="4.5" rx="1.5" />
    </>
  ),
  q: (
    <>
      <path d="M12.5 34 L9.5 16 L15.5 26 L16.5 11.5 L20.5 25 L22.5 9 L24.5 25 L28.5 11.5 L29.5 26 L35.5 16 L32.5 34 Z" />
      {[
        [9.5, 15],
        [16.5, 10.5],
        [22.5, 8],
        [28.5, 10.5],
        [35.5, 15],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="2.2" />
      ))}
    </>
  ),
  k: (
    <>
      <path d="M14 34 C12 26 15 20 22.5 20 C30 20 33 26 31 34 Z" />
      <rect x="21" y="6" width="3" height="12" rx="1" />
      <rect x="17.5" y="9" width="10" height="3" rx="1" />
    </>
  ),
};

export const PIECE_NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export function Piece({ type, color, className }: { type: PieceSymbol; color: Color; className?: string }) {
  const white = color === 'w';
  return (
    <svg
      viewBox="0 0 45 45"
      className={className}
      role="img"
      aria-label={`${white ? 'White' : 'Black'} ${PIECE_NAME[type]}`}
      // Cream with a cocoa outline, or cocoa with a soft light edge; the details are cut in the other colour
      style={
        {
          '--fill': white ? '#fbf3e4' : '#4a3443',
          '--line': white ? '#4a3443' : '#1f141b',
          '--detail': white ? '#4a3443' : '#f6e3d3',
        } as React.CSSProperties
      }
    >
      <g
        fill="var(--fill)"
        stroke="var(--line)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        className="[&_.cut]:stroke-[var(--detail)] [&_.eye]:fill-[var(--detail)] [&_.eye]:stroke-none"
      >
        {SHAPES[type]}
        <rect x="10.5" y="34.5" width="24" height="5.5" rx="2.5" />
      </g>
    </svg>
  );
}
