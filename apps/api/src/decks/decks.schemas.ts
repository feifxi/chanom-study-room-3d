import { z } from 'zod';
import {
  ANSWER_MAX,
  DECK_NAME_MAX,
  DECK_QUESTIONS_MAX,
  DECK_QUESTIONS_MIN,
  QUESTION_MAX,
  questionFits,
} from '@connecta/shared/pick-a-side';
import { PersonSchema } from '../rooms/rooms.schemas.js';

const QuestionSchema = z
  .object({
    q: z.string().trim().min(1).max(QUESTION_MAX),
    answers: z.array(z.string().trim().min(1).max(ANSWER_MAX)).min(2).max(4),
    /** Quiz decks: which answer is right (0–3) */
    right: z.number().int().min(0).max(3).nullable().optional(),
  })
  .meta({ id: 'DeckQuestion' });

const Kind = z.enum(['opinion', 'quiz']);

export const DeckBodySchema = z
  .object({
    name: z.string().trim().min(1).max(DECK_NAME_MAX),
    kind: Kind,
    questions: z.array(QuestionSchema).min(DECK_QUESTIONS_MIN).max(DECK_QUESTIONS_MAX),
  })
  .refine((d) => d.questions.every((q) => questionFits(d.kind, q)), {
    message: 'Would you rather questions have 2 answers; quiz questions have 4 with one right',
    path: ['questions'],
  })
  .meta({ id: 'DeckBody' });
export type DeckBody = z.infer<typeof DeckBodySchema>;

/** A room deck as the Deck picker shows it */
export const RoomDeckSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: Kind,
    questions: z.array(z.object({ id: z.string(), q: z.string(), answers: z.array(z.string()), right: z.number().int().optional() })),
    /** Who wrote it (null if their account is gone) */
    by: PersonSchema.nullable(),
    /** You may change it (you wrote it) */
    mine: z.boolean(),
    /** You may delete it (you wrote it, or you're the owner or a mod) */
    canDelete: z.boolean(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'RoomDeck' });
export type RoomDeck = z.infer<typeof RoomDeckSchema>;

export const RoomDecksSchema = z.array(RoomDeckSchema).meta({ id: 'RoomDecks' });

export const DeckPassSchema = z.object({ pass: z.string() }).meta({ id: 'DeckPass' });
