import type { RoomRole, Timeout } from '@connecta/shared';

/** What each role can do. Three fixed roles, no custom ones (keeps rooms simple). */
export const ROLE_RULES: { role: RoomRole; can: string[]; cannot?: string[] }[] = [
  {
    role: 'owner',
    can: ['Everything below', 'Change the map, visibility and name', 'Make or remove mods', 'Hand the room over or delete it'],
  },
  {
    role: 'mod',
    can: [
      'Kick, ban and time out members and guests',
      'Approve join requests',
      'Make and cancel invite links',
      'Delete messages',
      'Change the safety settings',
    ],
    cannot: ['Act on the owner or other mods', 'Change the map or visibility'],
  },
  { role: 'member', can: ['Chat and walk in', 'Invite people, if the room allows it'] },
];

/** Time out choices, as the menus show them (the ids are @connecta/shared's TIMEOUTS). */
export const TIMEOUTS = [
  ['10m', '10 minutes'],
  ['1h', '1 hour'],
  ['1d', '1 day'],
] as const satisfies readonly (readonly [Timeout, string])[];
