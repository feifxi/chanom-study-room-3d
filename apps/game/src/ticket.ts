import { TICKET_AUDIENCE, type GameTicket } from '@connecta/shared';
import { DECK_PASS_AUDIENCE, type Deck } from '@connecta/shared/pick-a-side';
import { jwtVerify } from 'jose';

/**
 * Checks a join ticket from the API (HS256 with GAME_SECRET, a minute long). The ticket is the only
 * thing the game server trusts about who you are and where you may go.
 */
export async function readTicket(token: unknown, secret: string): Promise<GameTicket | null> {
  if (typeof token !== 'string') return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { audience: TICKET_AUDIENCE, algorithms: ['HS256'] });
    return payload as unknown as GameTicket;
  } catch {
    return null;
  }
}

/** Checks a room deck pass from the API (HS256 with GAME_SECRET): the deck, signed for one room */
export async function readDeckPass(token: string, secret: string): Promise<{ roomId: string; deck: Deck } | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { audience: DECK_PASS_AUDIENCE, algorithms: ['HS256'] });
    return payload as unknown as { roomId: string; deck: Deck };
  } catch {
    return null;
  }
}
