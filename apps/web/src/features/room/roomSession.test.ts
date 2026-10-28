import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@study/shared';
import { BUBBLE_MS, initialSession, npcKey, sessionReducer, type SessionState } from './roomSession';

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({ id: 'm1', sessionId: 's1', name: 'Mint', text: 'hi', at: 0, ...over });
const reduce = (...actions: Parameters<typeof sessionReducer>[1][]) => actions.reduce<SessionState>(sessionReducer, initialSession);

describe('sessionReducer', () => {
  it('shows a chat message in the log and as a bubble over the sender', () => {
    const s = reduce({ type: 'chat', message: msg(), now: 1000 });
    expect(s.chat).toHaveLength(1);
    expect(s.bubbles.s1).toEqual({ text: 'hi', until: 1000 + BUBBLE_MS });
  });

  it('keeps system lines (joins, Buddy Machine news) out of the bubbles', () => {
    const s = reduce({ type: 'chat', message: msg({ sessionId: 'system', system: true }), now: 0 });
    expect(s.chat).toHaveLength(1);
    expect(s.bubbles).toEqual({});
  });

  it('keys NPC bubbles separately from players', () => {
    const s = reduce({ type: 'npcSay', npcId: 'n1', text: 'purr~', now: 0 });
    expect(s.bubbles[npcKey('n1')]?.text).toBe('purr~');
  });

  it('drops expired bubbles but keeps the same object when nothing expired', () => {
    const s = reduce({ type: 'chat', message: msg(), now: 0 });
    expect(sessionReducer(s, { type: 'expireBubbles', now: 10 })).toBe(s);
    expect(sessionReducer(s, { type: 'expireBubbles', now: BUBBLE_MS + 1 }).bubbles).toEqual({});
  });

  it('caps the chat history at 100 messages', () => {
    let s = initialSession;
    for (let i = 0; i < 150; i++) s = sessionReducer(s, { type: 'chat', message: msg({ id: `m${i}` }), now: 0 });
    expect(s.chat).toHaveLength(100);
    expect(s.chat.at(-1)!.id).toBe('m149');
  });

  it('adds and removes reactions by key', () => {
    const s = reduce({ type: 'react', key: 'k', npcId: 'n1', emote: '❤️' });
    expect(s.reactions).toEqual([{ key: 'k', target: npcKey('n1'), emote: '❤️' }]);
    expect(sessionReducer(s, { type: 'reactionDone', key: 'k' }).reactions).toEqual([]);
  });

  it('resets everything for a fresh join', () => {
    const s = reduce({ type: 'chat', message: msg(), now: 0 }, { type: 'players', ids: ['a'] }, { type: 'reset' });
    expect(s).toBe(initialSession);
  });
});
