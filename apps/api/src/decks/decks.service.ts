import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ROOM_DECKS_MAX, type Deck } from '@connecta/shared/pick-a-side';
import type { RoomDeck as Row, User } from '../generated/prisma/client.js';
import { GameService } from '../game/game.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import type { DeckBody, RoomDeck } from './decks.schemas.js';

type StoredQuestion = { q: string; answers: string[]; right?: number | null };

/**
 * Pick a Side's room decks (feature 11): a room's own questions. Members write them and change their
 * own; the owner and mods can delete any. Anyone let in (guests too) can play with them, through a
 * signed pass the game server checks.
 */
@Injectable()
export class DecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly game: GameService,
  ) {}

  async list(roomId: string, userId: string, now = new Date()): Promise<RoomDeck[]> {
    const role = await this.access(roomId, userId, now);
    const rows = await this.prisma.roomDeck.findMany({ where: { roomId }, include: { author: true }, orderBy: { updatedAt: 'desc' } });
    return rows.map((row) => this.view(row, userId, role));
  }

  async create(roomId: string, userId: string, body: DeckBody, now = new Date()): Promise<RoomDeck> {
    const role = await this.access(roomId, userId, now);
    if (role === 'guest') throw new ForbiddenException('Only members add decks');
    if ((await this.prisma.roomDeck.count({ where: { roomId } })) >= ROOM_DECKS_MAX)
      throw new ConflictException({ code: 'too_many', message: `A room keeps up to ${ROOM_DECKS_MAX} decks` });
    const row = await this.prisma.roomDeck.create({
      data: { roomId, authorId: userId, ...stored(body) },
      include: { author: true },
    });
    return this.view(row, userId, role);
  }

  async update(id: string, userId: string, body: DeckBody, now = new Date()): Promise<RoomDeck> {
    const deck = await this.find(id);
    const role = await this.access(deck.roomId, userId, now);
    if (deck.authorId !== userId) throw new ForbiddenException('Only whoever wrote a deck changes it');
    const row = await this.prisma.roomDeck.update({ where: { id }, data: stored(body), include: { author: true } });
    return this.view(row, userId, role);
  }

  async remove(id: string, userId: string, now = new Date()): Promise<void> {
    const deck = await this.find(id);
    const role = await this.access(deck.roomId, userId, now);
    if (deck.authorId !== userId && role !== 'owner' && role !== 'mod')
      throw new ForbiddenException('Only whoever wrote it, the owner or a mod deletes a deck');
    await this.prisma.roomDeck.delete({ where: { id } });
  }

  /** Signed for the room's game server, so whoever hosts can start Pick a Side with it */
  async pass(id: string, userId: string, now = new Date()): Promise<{ pass: string }> {
    const deck = await this.find(id);
    await this.access(deck.roomId, userId, now);
    return { pass: await this.game.deckPass(deck.roomId, toDeck(deck)) };
  }

  private async find(id: string) {
    const deck = await this.prisma.roomDeck.findUnique({ where: { id } });
    if (!deck) throw new NotFoundException();
    return deck;
  }

  /** Members, and guests with a pass, may see the room's decks; anyone else gets a 404 */
  private async access(roomId: string, userId: string, now: Date): Promise<'owner' | 'mod' | 'member' | 'guest'> {
    const [member, guest] = await Promise.all([
      this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } }),
      this.prisma.guestVisit.findUnique({ where: { roomId_userId: { roomId, userId } } }),
    ]);
    if (member) return member.role as 'owner' | 'mod' | 'member';
    if (guest && guest.until > now) return 'guest';
    throw new NotFoundException();
  }

  private view(row: Row & { author: User | null }, userId: string, role: string): RoomDeck {
    const deck = toDeck(row);
    return {
      id: row.id,
      name: row.name,
      kind: deck.kind,
      questions: deck.questions,
      by: row.author ? toPerson(row.author) : null,
      mine: row.authorId === userId,
      canDelete: row.authorId === userId || role === 'owner' || role === 'mod',
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function stored(body: DeckBody) {
  return {
    name: body.name,
    kind: body.kind,
    questions: body.questions.map(({ q, answers, right }): StoredQuestion =>
      body.kind === 'quiz' ? { q, answers, right } : { q, answers },
    ),
  };
}

/** The deck in the rules' shape: question ids are the deck's id and their place in it */
export function toDeck(row: Row): Deck {
  const kind = row.kind === 'quiz' ? 'quiz' : 'opinion';
  return {
    id: row.id,
    name: row.name,
    emoji: kind === 'quiz' ? '📝' : '💬',
    kind,
    source: 'room',
    questions: (row.questions as StoredQuestion[]).map((q, i) => ({
      id: `${row.id}-${i}`,
      q: q.q,
      answers: q.answers,
      ...(kind === 'quiz' ? { right: q.right ?? 0 } : {}),
    })),
  };
}
