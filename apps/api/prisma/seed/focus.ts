import { dayIn } from '@connecta/shared';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DAY, HOUR, MINUTE, NOW, ROOM, TIME_ZONE, id, random, type Who } from './kit.js';

/**
 * Two weeks of focus rounds, so the Focus page's week, streaks and rankings have something in them:
 * each person studies at their own pace, in rooms they're in, on their own subjects. Same every run.
 */
const STUDY: Record<Who, { perDay: number; rooms: string[]; subjects: string[] }> = {
  fei: { perDay: 3, rooms: [ROOM.chanom, ROOM.cpe, ROOM.lofi], subjects: ['Algorithms', 'Statistics', 'Report draft', ''] },
  ter: { perDay: 4, rooms: [ROOM.cpe, ROOM.chanom], subjects: ['Operating systems', 'Lab 4', 'Networks'] },
  view: { perDay: 2.5, rooms: [ROOM.lofi, ROOM.cpe], subjects: ['Operating systems', 'Databases', ''] },
  ploy: { perDay: 1.5, rooms: [ROOM.lofi, ROOM.chanom], subjects: ['Japanese', 'Art history', ''] },
  nam: { perDay: 3.5, rooms: [ROOM.chanom, ROOM.lofi, ROOM.cpe], subjects: ['Report', 'Calculus', 'Physics'] },
  bow: { perDay: 2, rooms: [ROOM.chanom], subjects: ['Chemistry', 'English', 'Maths homework'] },
  pim: { perDay: 1, rooms: [ROOM.chanom], subjects: ['Reading', ''] },
  mook: { perDay: 1.5, rooms: [ROOM.lofi], subjects: ['IELTS', 'Korean'] },
  earth: { perDay: 3, rooms: [ROOM.lofi, ROOM.cpe, ROOM.chanom], subjects: ['History', 'Algorithms', 'Thesis'] },
};
const LENGTHS = [25, 25, 25, 50, 50, 45, 90];

const TODOS: Partial<Record<Who, [string, boolean][]>> = {
  fei: [
    ['Finish lab 4 (free the list!)', true],
    ['Put the stats summary in Chanom Friends', false],
    ['Report draft: introduction', false],
    ['Algorithms sheet, question 3', true],
    ['Buy Ploy a coffee after the tournament ☕', false],
  ],
  ter: [
    ['Read OS chapter 6', false],
    ['Mark the lab 4 questions', true],
  ],
  nam: [
    ['Report: results section', false],
    ['Calculus problem set', false],
    ['Email the lab TA', true],
  ],
  bow: [
    ['Chem: equilibrium worksheet', false],
    ['English essay plan', true],
  ],
  earth: [
    ['Thesis outline v2', false],
    ['History: chapters 7 and 8', false],
  ],
};

export async function seedFocus(prisma: PrismaClient) {
  let rounds = 0;
  for (const [who, s] of Object.entries(STUDY) as [Who, (typeof STUDY)[Who]][]) {
    const rand = random(who.length * 7919 + s.perDay * 101);
    const data = [];
    for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
      // Some days off (fewer on the busy ones), then a few rounds through the evening
      const n = rand() < 0.2 ? 0 : Math.round(s.perDay * (0.5 + rand()));
      // Evenings in Bangkok: start at 18:00 local (11:00 UTC) give or take
      let start = Math.floor((NOW - daysAgo * DAY) / DAY) * DAY + 11 * HOUR + Math.floor(rand() * 3) * HOUR;
      for (let i = 0; i < n; i++) {
        const minutes = LENGTHS[Math.floor(rand() * LENGTHS.length)]!;
        const end = start + minutes * MINUTE;
        // Only rounds that already ended
        if (end > NOW) break;
        data.push({
          id: `seed-${who}-${daysAgo}-${i}`,
          userId: id[who],
          roomId: s.rooms[Math.floor(rand() * s.rooms.length)]!,
          subject: s.subjects[Math.floor(rand() * s.subjects.length)]!,
          startedAt: new Date(start),
          endedAt: new Date(end),
          minutes,
          day: new Date(`${dayIn(TIME_ZONE, start)}T00:00:00Z`),
        });
        // A short break between rounds
        start = end + (5 + Math.floor(rand() * 10)) * MINUTE;
      }
    }
    await prisma.focusSession.createMany({ data });
    rounds += data.length;
  }
  let todos = 0;
  for (const [who, items] of Object.entries(TODOS) as [Who, [string, boolean][]][]) {
    await prisma.todo.createMany({
      data: items.map(([text, done], i) => ({
        userId: id[who],
        text,
        done,
        doneAt: done ? new Date(NOW - (i + 1) * DAY) : null,
        position: i,
        createdAt: new Date(NOW - (10 - i) * DAY),
      })),
    });
    todos += items.length;
  }
  console.log(`Focus: ${rounds} rounds over two weeks, ${todos} to-dos`);
}
