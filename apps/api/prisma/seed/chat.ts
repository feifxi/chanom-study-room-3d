import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { s3ClientConfig } from '../../src/aws/aws-client-config.js';
import type { Env } from '../../src/config/env.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { MINUTE, NOW, ROOM, id, seedUuid, type Who } from './kit.js';

/** One line of chat: who, how long ago (minutes), what; replies point back a number of lines */
type Line = { by: Who; at: number; text: string; reply?: number; react?: [Who, string][]; picture?: boolean };

const H = 60;
const D = 24 * H;

/** Room chat, oldest first. @handles mention people (members only). */
const ROOM_CHAT: Record<string, Line[]> = {
  [ROOM.chanom]: [
    { by: 'fei', at: 6 * D, text: 'Welcome to the new place everyone 🍓' },
    { by: 'ter', at: 6 * D - 20, text: 'the library map is so cosy', react: [['fei', '💖']] },
    { by: 'ploy', at: 5 * D, text: 'who’s up for cards on Friday?' },
    { by: 'nam', at: 5 * D - 5, text: 'me!! 🙋' },
    { by: 'bow', at: 5 * D - 3, text: 'me too if I finish homework' },
    { by: 'earth', at: 4 * D, text: 'anyone have the stats summary from last week?' },
    { by: 'fei', at: 4 * D - 12, text: 'I’ll put it in here tonight', reply: 1 },
    {
      by: 'pim',
      at: 3 * D,
      text: 'look who visited my desk',
      picture: true,
      react: [
        ['nam', '😻'],
        ['bow', '😻'],
        ['fei', '😻'],
      ],
    },
    { by: 'nam', at: 3 * D - 2, text: 'SO CUTE' },
    { by: 'ter', at: 2 * D, text: 'focus session at 8? library, quiet tables' },
    { by: 'earth', at: 2 * D - 30, text: 'in 👍' },
    { by: 'fei', at: D + 3 * H, text: 'reminder: card night is Friday 20:00 🎴 @room', react: [['ploy', '🎉']] },
    { by: 'ploy', at: D + 2 * H, text: 'bringing snacks (virtually)' },
    { by: 'bow', at: 9 * H, text: 'is anyone online? I’m stuck on chem' },
    { by: 'ter', at: 8 * H, text: '@bowbow which part? I can help after 9' },
    { by: 'bow', at: 8 * H - 10, text: 'equilibrium 😭 thank you!!' },
    { by: 'nam', at: 3 * H, text: 'library tonight? I need to finish my report' },
    { by: 'earth', at: 2 * H, text: '@fei did you get the summary up?' },
    { by: 'pim', at: 40, text: 'brb making tea 🍵' },
    { by: 'ploy', at: 12, text: 'see you all at 8 ✨' },
  ],
  [ROOM.cpe]: [
    { by: 'ter', at: 9 * D, text: 'Exam prep schedule is in the rules. Please read 🙏' },
    { by: 'view', at: 8 * D, text: 'Lab 4 due Friday, the pointer one' },
    {
      by: 'nam',
      at: 8 * D - 15,
      text: 'segfault gang 💀',
      react: [
        ['ter', '😂'],
        ['earth', '😂'],
      ],
    },
    { by: 'fei', at: 6 * D, text: 'does anyone get question 3 of the algorithms sheet?' },
    { by: 'earth', at: 6 * D - 25, text: 'it’s dynamic programming, start from the smallest case', reply: 1 },
    { by: 'fei', at: 6 * D - 20, text: 'ohh that makes sense, thanks!' },
    { by: 'view', at: 4 * D, text: 'midterm room booked: library, Thursday 7pm' },
    { by: 'ter', at: 2 * D, text: '3 hours of focus done, my brain is soup' },
    { by: 'nam', at: D, text: 'anyone want to review OS tonight?' },
    { by: 'earth', at: 5 * H, text: 'I’m in, after dinner' },
    { by: 'view', at: 2 * H, text: 'reminder: be kind to the new people this week 🙂' },
  ],
  [ROOM.games]: [
    { by: 'ploy', at: 10 * D, text: 'Welcome to Game Night Club! 🎲 Read the rules and grab a seat' },
    { by: 'mook', at: 9 * D, text: 'chess table is free if anyone wants a game' },
    { by: 'view', at: 7 * D, text: 'Draw & Guess at 9?' },
    { by: 'bow', at: 7 * D - 30, text: 'yes!! I’m so bad at drawing lol' },
    { by: 'fei', at: 5 * D, text: 'Slave round anyone? I need revenge' },
    { by: 'pim', at: 4 * D, text: 'I made a new Pick a Side deck, try it!' },
    { by: 'pim', at: 2 * D, text: 'dm me for cheap game keys 💸 only 99 baht' },
    { by: 'mook', at: 2 * D - 5, text: '@pimmy no selling here please, see the rules' },
    { by: 'view', at: 2 * D - 3, text: 'lol' },
    {
      by: 'ploy',
      at: D,
      text: 'tournament on Saturday, chess, sign up here 👇',
      react: [
        ['mook', '🔥'],
        ['view', '🔥'],
      ],
    },
    { by: 'fei', at: D - 10, text: 'in!' },
    { by: 'ploy', at: 4 * H, text: '@fei you’re first on the board, good luck 😈' },
    { by: 'bow', at: 1 * H, text: 'who wants Pick a Side later?' },
  ],
  [ROOM.lofi]: [
    { by: 'view', at: 12 * D, text: 'Welcome. Timers on, chat here, keep it quiet 🌙' },
    { by: 'earth', at: 10 * D, text: 'today’s goal: two chapters of history' },
    { by: 'ploy', at: 7 * D, text: 'the rooftop at night is the best place to study' },
    { by: 'mook', at: 5 * D, text: 'any good lo-fi playlists? the room is so quiet today' },
    { by: 'nam', at: 3 * D, text: '4 rounds done ✅' },
    { by: 'fei', at: 2 * D, text: 'goal: finish my report draft' },
    { by: 'earth', at: D, text: 'good luck everyone with exams 🍀' },
    { by: 'view', at: 6 * H, text: 'study session starts at 9, see you up here' },
  ],
};

/** DMs, oldest first; each is between the two people in its key */
const DMS: { between: [Who, Who]; lines: Line[]; unread?: number }[] = [
  {
    between: ['fei', 'ter'],
    lines: [
      { by: 'ter', at: 3 * D, text: 'did you finish lab 4?' },
      { by: 'fei', at: 3 * D - 30, text: 'almost, the free() part is killing me' },
      { by: 'ter', at: 3 * D - 28, text: 'draw the memory on paper first, trust me' },
      { by: 'fei', at: 2 * D, text: 'it worked!! thank you 🥹', react: [['ter', '💖']] },
      { by: 'ter', at: 5 * H, text: 'library at 8 tonight?' },
      { by: 'ter', at: 5 * H - 1, text: 'bringing my notes' },
    ],
    // Fei hasn't read Ter's last two
    unread: 2,
  },
  {
    between: ['fei', 'ploy'],
    lines: [
      { by: 'ploy', at: 4 * D, text: 'I saw your flower crown 😍 where did you get it' },
      { by: 'fei', at: 4 * D - 10, text: 'the Shop! saved coins for two weeks lol' },
      { by: 'ploy', at: 4 * D - 8, text: 'ok I’m doing quests every day now' },
      { by: 'fei', at: D, text: 'chess tournament, you’re going down 😤' },
      { by: 'ploy', at: D - 4, text: 'we’ll see 😌' },
    ],
  },
  {
    between: ['fei', 'nam'],
    lines: [
      { by: 'nam', at: 6 * D, text: 'can you send me the stats summary?' },
      { by: 'fei', at: 6 * D - 60, text: 'yes, tonight!' },
    ],
  },
  {
    between: ['ploy', 'bow'],
    lines: [
      { by: 'bow', at: 2 * D, text: 'can you teach me Slave? 🃏' },
      { by: 'ploy', at: 2 * D - 15, text: 'of course! tonight in Game Night Club' },
    ],
  },
];

const handleOf: Record<Who, string> = {
  fei: 'fei',
  ter: 'ter',
  view: 'view',
  ploy: 'ployy',
  nam: 'namwhan',
  bow: 'bowbow',
  pim: 'pimmy',
  mook: 'mookie',
  earth: 'earth.k',
};
const whoByHandle = new Map(Object.entries(handleOf).map(([w, h]) => [h, w as Who]));

/** Messages written into a room's chat or a DM, with mentions, replies, reactions and the picture */
async function write(
  prisma: PrismaClient,
  where: { roomId: string } | { dmId: string },
  lines: Line[],
  members: Set<string>,
  picture: string | null,
) {
  const ids: string[] = [];
  for (const l of lines) {
    const at = new Date(NOW - l.at * MINUTE);
    const messageId = seedUuid(at);
    const handles = [...l.text.matchAll(/@([a-z0-9._]+)/g)].map((m) => m[1]!);
    const mentions = handles
      .map((h) => whoByHandle.get(h))
      .filter((w): w is Who => !!w && members.has(id[w]))
      .map((w) => id[w]);
    await prisma.message.create({
      data: {
        id: messageId,
        ...where,
        authorId: id[l.by],
        text: l.text,
        mentions,
        mentionsRoom: handles.includes('room'),
        replyToId: l.reply ? ids[ids.length - l.reply] : null,
        createdAt: at,
        reactions: l.react && {
          create: l.react.map(([w, emoji], i) => ({ userId: id[w], emoji, createdAt: new Date(at.getTime() + (i + 1) * MINUTE) })),
        },
        pictures:
          l.picture && picture
            ? { create: { uploaderId: id[l.by], status: 'ready', key: picture, width: 960, height: 720, bytes: 0, createdAt: at } }
            : undefined,
      },
    });
    ids.push(messageId);
  }
  return ids;
}

/** A cat drawn in shapes, as the pictures worker would store it (WebP in the files bucket) */
async function catPicture(env: Env): Promise<string | null> {
  if (!env.AWS_ENDPOINT_URL) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9d6"/><stop offset="1" stop-color="#ffd6e5"/></linearGradient></defs>
  <rect width="960" height="720" fill="url(#bg)"/>
  <rect x="0" y="540" width="960" height="180" fill="#c98b5a"/>
  <ellipse cx="480" cy="470" rx="190" ry="150" fill="#f7b267"/>
  <circle cx="480" cy="300" r="120" fill="#f7b267"/>
  <polygon points="380,230 400,120 450,200" fill="#f7b267"/><polygon points="580,230 560,120 510,200" fill="#f7b267"/>
  <circle cx="440" cy="295" r="14" fill="#34313f"/><circle cx="520" cy="295" r="14" fill="#34313f"/>
  <polygon points="470,330 490,330 480,342" fill="#ff6fa8"/>
  <path d="M640 520 Q760 460 720 360" stroke="#f7b267" stroke-width="34" fill="none" stroke-linecap="round"/>
  <rect x="140" y="470" width="150" height="90" rx="12" fill="#7c5cff"/><rect x="160" y="450" width="110" height="30" rx="8" fill="#ff6fa8"/>
</svg>`;
  const key = 'pictures/seed-desk-cat.webp';
  try {
    const webp = await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
    await new S3Client(s3ClientConfig(env)).send(
      new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: webp, ContentType: 'image/webp' }),
    );
    return key;
  } catch (error) {
    console.warn(`Chat: no picture, the AWS Emulator didn't take it: ${(error as Error).message}`);
    return null;
  }
}

export async function seedChat(prisma: PrismaClient, env: Env) {
  const picture = await catPicture(env);
  let count = 0;
  for (const [roomId, lines] of Object.entries(ROOM_CHAT)) {
    const members = await prisma.membership.findMany({ where: { roomId }, select: { userId: true } });
    const ids = await write(prisma, { roomId }, lines, new Set(members.map((m) => m.userId)), picture);
    count += ids.length;
    // Everyone has read up to the end, but Fei is 4 behind in her own room ("New messages")
    for (const { userId } of members) {
      const behind = userId === id.fei && roomId === ROOM.chanom ? 4 : 0;
      await prisma.membership.update({ where: { roomId_userId: { roomId, userId } }, data: { lastReadId: ids[ids.length - 1 - behind] } });
    }
  }
  for (const dm of DMS) {
    const [a, b] = dm.between.map((w) => id[w]) as [string, string];
    const created = await prisma.dm.create({
      data: {
        pair: [a, b].sort().join(':'),
        createdAt: new Date(NOW - dm.lines[0]!.at * MINUTE),
        members: { create: [{ userId: a }, { userId: b }] },
      },
    });
    const ids = await write(prisma, { dmId: created.id }, dm.lines, new Set([a, b]), null);
    count += ids.length;
    await prisma.dm.update({ where: { id: created.id }, data: { lastId: ids[ids.length - 1] } });
    for (const userId of [a, b]) {
      const behind = userId === a ? (dm.unread ?? 0) : 0;
      await prisma.dmMember.update({
        where: { dmId_userId: { dmId: created.id, userId } },
        data: { lastReadId: ids[ids.length - 1 - behind] },
      });
    }
  }
  console.log(
    `Chat: ${count} messages in 4 rooms and ${DMS.length} DMs${picture ? ', with a picture' : ' (no picture: the AWS Emulator is off)'}`,
  );
}

/** The id of a seeded room message, found by its text (other seed files point at messages) */
export async function messageWith(prisma: PrismaClient, roomId: string, text: string) {
  return prisma.message.findFirstOrThrow({ where: { roomId, text }, include: { author: true } });
}
