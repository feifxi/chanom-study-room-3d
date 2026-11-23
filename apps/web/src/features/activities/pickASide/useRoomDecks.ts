'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type Schemas } from '@/lib/api/client';
import { problem } from '@/features/rooms/useRooms';
import type { Deck, DeckShelf, ShelfDeck } from './decks';

type RoomDeck = Schemas['RoomDeck'];

const toShelf = (d: RoomDeck): ShelfDeck => ({
  id: d.id,
  name: d.name,
  emoji: d.kind === 'quiz' ? '📝' : '💬',
  kind: d.kind,
  source: 'room',
  questions: d.questions,
  by: d.by?.name ?? null,
  mine: d.mine,
  canDelete: d.canDelete,
});

/** The room's own Pick a Side decks (feature 11): members write them, everyone let in plays them. */
export function useRoomDecks(roomId: string | null, member: boolean): DeckShelf {
  const qc = useQueryClient();
  const key = ['rooms', roomId, 'decks'];
  const { data } = useQuery({
    queryKey: key,
    enabled: !!roomId,
    queryFn: async () => (await api.GET('/api/rooms/{id}/decks', { params: { path: { id: roomId! } } })).data ?? [],
  });
  return {
    decks: (data ?? []).map(toShelf),
    canAdd: member,
    ai: false,
    save: async (draft) => {
      const body = {
        name: draft.name,
        kind: draft.kind,
        questions: draft.questions.map(({ q, answers, right }) => (draft.kind === 'quiz' ? { q, answers, right } : { q, answers })),
      };
      const res = draft.id
        ? await api.PATCH('/api/decks/{id}', { params: { path: { id: draft.id } }, body })
        : await api.POST('/api/rooms/{id}/decks', { params: { path: { id: roomId! } }, body });
      if (!res.data) {
        toast.error(problem(res.error, 'Couldn’t save that deck. Try again?'));
        return null;
      }
      await qc.invalidateQueries({ queryKey: key });
      return toShelf(res.data) as Deck;
    },
    remove: async (id) => {
      const res = await api.DELETE('/api/decks/{id}', { params: { path: { id } } });
      if (!res.response.ok) return void toast.error(problem(res.error, 'Couldn’t delete that deck. Try again?'));
      await qc.invalidateQueries({ queryKey: key });
    },
  };
}

/** A room deck signed for the game server, so the host can start Pick a Side with it */
export async function deckPass(id: string): Promise<string | null> {
  const { data, error } = await api.POST('/api/decks/{id}/pass', { params: { path: { id } } });
  if (!data) toast.error(problem(error, 'Couldn’t pick that deck. Try again?'));
  return data?.pass ?? null;
}
