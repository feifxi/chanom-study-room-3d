import { questionFits, type DeckKind } from '@connecta/shared/pick-a-side';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DAY, ROOM, ago, id } from './kit.js';

/** Game Night Club's own Pick a Side decks, written by its members: one of each kind */
const DECKS: { name: string; kind: DeckKind; by: string; questions: { q: string; answers: string[]; right?: number }[] }[] = [
  {
    name: 'Campus life',
    kind: 'opinion',
    by: id.ploy,
    questions: [
      { q: 'Study in the library or at the café?', answers: ['Library', 'Café'] },
      { q: 'Morning classes or night classes?', answers: ['Morning', 'Night'] },
      { q: 'Group project or solo exam?', answers: ['Group project', 'Solo exam'] },
      { q: 'Cram the night before or a little every day?', answers: ['Cram', 'Every day'] },
      { q: 'Notes on paper or on a tablet?', answers: ['Paper', 'Tablet'] },
    ],
  },
  {
    name: 'Thai food quiz',
    kind: 'quiz',
    by: id.pim,
    questions: [
      { q: 'Which dish is a green curry?', answers: ['Gaeng keow wan', 'Tom yum', 'Som tam', 'Khao soi'], right: 0 },
      { q: 'Som tam is made mostly from…', answers: ['Papaya', 'Mango', 'Cucumber', 'Cabbage'], right: 0 },
      { q: 'Khao soi comes from which city?', answers: ['Bangkok', 'Chiang Fei', 'Phuket', 'Khon Kaen'], right: 1 },
      { q: 'Cha yen is…', answers: ['Thai iced tea', 'Coconut soup', 'A noodle dish', 'A dessert'], right: 0 },
    ],
  },
];

export async function seedDecks(prisma: PrismaClient) {
  for (const [i, d] of DECKS.entries()) {
    const bad = d.questions.find((q) => !questionFits(d.kind, q));
    if (bad) throw new Error(`Seed deck "${d.name}": "${bad.q}" doesn't fit`);
    const at = ago((20 - i * 6) * DAY);
    await prisma.roomDeck.create({
      data: { roomId: ROOM.games, authorId: d.by, name: d.name, kind: d.kind, questions: d.questions, createdAt: at, updatedAt: at },
    });
  }
  console.log(`Decks: ${DECKS.length} Pick a Side decks in Game Night Club`);
}
