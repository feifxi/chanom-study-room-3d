import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ageOn,
  DELETE_GRACE_DAYS,
  HANDLE_CHANGE_DAYS,
  HANDLE_HOLD_DAYS,
  MIN_AGE,
  sanitizeLook,
  type AvatarLook,
  type RequestsFrom,
} from '@connecta/shared';
import { Prisma, type User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AccountDetails, Me } from './accounts.schemas.js';
import { FriendsService } from '../friends/friends.service.js';
import { PresenceService } from '../presence/presence.service.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { HandlesService } from './handles.service.js';
import { requireSignedUp } from './signed-up.js';
import { listedOnEveryone } from '../focus/everyone.js';
import { FocusService } from '../focus/focus.service.js';
import { hasPlus } from '../plus/plus.js';
import { GameService } from '../game/game.service.js';
import { ShopService } from '../shop/shop.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long the sign-in and the browser wait after an under-13 birthday (so it isn't just "pick another year"). */
export const AGE_LOCK_MS = 24 * 60 * 60 * 1000;

export function toMe(user: User): Me {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    look: user.look ? sanitizeLook(user.look) : null,
    email: user.isAnonymous ? null : user.email,
    isGuest: user.isAnonymous,
    ageChecked: user.birthday !== null,
    signedUp: user.handle !== null,
    deleteAt: user.deleteAt?.toISOString() ?? null,
    requestsFrom: user.requestsFrom as RequestsFrom,
    appearOffline: user.appearOffline,
    showActivity: user.showActivity,
    timeZone: user.timeZone,
    showOnEveryone: listedOnEveryone(user),
    hideInvitesWhileFocusing: user.hideInvitesWhileFocusing,
    plus: hasPlus(user),
    plusUntil: user.plusUntil?.toISOString() ?? null,
    team: user.team,
  };
}

/** Which sign-in providers this server has keys for (Settings shows Connect only for those). */
export const SIGN_IN_PROVIDERS = Symbol('SIGN_IN_PROVIDERS');
export type SignInProviders = { google: boolean; discord: boolean };

const tooYoung = (until: Date) => new ForbiddenException({ code: 'too_young', until: until.toISOString() });

/**
 * What happens after signing in (docs/v2/features/02-accounts.md): the birthday check, then the
 * character, display name and @handle. Guests only get a name and a character.
 */
@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handles: HandlesService,
    private readonly rooms: RoomsService,
    private readonly friends: FriendsService,
    private readonly presence: PresenceService,
    private readonly focus: FocusService,
    private readonly shop: ShopService,
    private readonly game: GameService,
    @Inject(SIGN_IN_PROVIDERS) private readonly providers: SignInProviders,
  ) {}

  async me(userId: string): Promise<Me> {
    return toMe(await this.user(userId));
  }

  /** Stores the birthday if 13+. Under 13 locks this sign-in and this browser for a day. */
  async setBirthday(userId: string, birthday: string, deviceId: string, now = new Date()): Promise<Me> {
    const user = await this.user(userId);
    if (user.isAnonymous) throw new ForbiddenException('Guests have no birthday; sign up first');
    if (user.handle) throw new ConflictException('Sign-up is already finished');

    const keys = [`user:${userId}`, `device:${deviceId}`];
    const lock = await this.prisma.ageLock.findFirst({
      where: { key: { in: keys }, until: { gt: now } },
      orderBy: { until: 'desc' },
    });
    if (lock) throw tooYoung(lock.until);

    if (ageOn(birthday, now.toISOString().slice(0, 10)) < MIN_AGE) {
      // The birthday itself isn't kept: no data about under-13s beyond the lock
      const until = new Date(now.getTime() + AGE_LOCK_MS);
      await this.prisma.$transaction(
        keys.map((key) => this.prisma.ageLock.upsert({ where: { key }, create: { key, until }, update: { until } })),
      );
      throw tooYoung(until);
    }

    return toMe(await this.prisma.user.update({ where: { id: userId }, data: { birthday: new Date(birthday) } }));
  }

  /** Settings → Privacy & safety. */
  async updatePrivacy(
    userId: string,
    input: { requestsFrom?: RequestsFrom; appearOffline?: boolean; showActivity?: boolean; showOnEveryone?: boolean },
  ): Promise<Me> {
    await this.signedUp(userId);
    const me = toMe(await this.prisma.user.update({ where: { id: userId }, data: input }));
    // Friends see the change at once (appearing offline, or back)
    if (input.appearOffline !== undefined || input.showActivity !== undefined) await this.presence.settle(userId, Date.now(), true);
    // Off the Everyone ranking means off it now, not when its cache runs out
    if (input.showOnEveryone !== undefined) this.focus.forgetEveryone();
    return me;
  }

  async updateNotifications(userId: string, input: { hideInvitesWhileFocusing?: boolean }): Promise<Me> {
    await this.signedUp(userId);
    return toMe(await this.prisma.user.update({ where: { id: userId }, data: input }));
  }

  /** The last step: character, display name and @handle. Then the app opens Home. */
  async signUp(userId: string, input: { name: string; handle: string; look: Partial<AvatarLook> }): Promise<Me> {
    // A new account owns nothing yet: free items only
    await this.shop.checkLook(userId, input.look);
    const user = await this.user(userId);
    if (user.isAnonymous) throw new ForbiddenException('Guests sign up with Google, Discord or email first');
    if (user.handle) throw new ConflictException('Sign-up is already finished');
    if (!user.birthday) throw new ForbiddenException('Birthday first');

    const check = await this.handles.check(input.handle, userId);
    if (!check.available) throw new ConflictException({ code: 'handle_unavailable', ...check });
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        // handleChangedAt stays empty: the 30-day wait counts from the first change, not from sign-up
        data: { name: input.name, handle: input.handle, look: input.look },
      });
      return toMe(updated);
    } catch (error) {
      // Someone claimed it between the check and now
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ code: 'handle_unavailable', ...(await this.handles.check(input.handle, userId)) });
      }
      throw error;
    }
  }

  /** A guest's name and character (from the invite page). */
  async setGuest(userId: string, input: { name: string; look: Partial<AvatarLook> }): Promise<Me> {
    const user = await this.user(userId);
    if (!user.isAnonymous) throw new ForbiddenException('Only guests set a guest name');
    await this.shop.checkLook(userId, input.look);
    return toMe(await this.prisma.user.update({ where: { id: userId }, data: { name: input.name, look: input.look } }));
  }

  /** Settings → My profile and My character: display name and look. */
  async updateProfile(userId: string, input: { name?: string; look?: Partial<AvatarLook> }): Promise<Me> {
    await this.signedUp(userId);
    if (input.look) await this.shop.checkLook(userId, input.look);
    const me = toMe(await this.prisma.user.update({ where: { id: userId }, data: { name: input.name, look: input.look } }));
    // Every room you're in shows it at once (the game servers take looks only from here, checked)
    if (input.look && me.look) this.game.roomEvent({ roomId: '*', type: 'look', userId, look: me.look });
    return me;
  }

  /**
   * A new @handle, once every 30 days. The old one is held for this person for 30 days, so nobody
   * can grab it to pretend to be them (and they can change back meanwhile).
   */
  async changeHandle(userId: string, handle: string, now = new Date()): Promise<Me> {
    const user = await this.signedUp(userId);
    if (handle === user.handle) return toMe(user);
    const next = nextHandleChange(user, now);
    if (next) throw new ConflictException({ code: 'too_soon', nextChangeAt: next.toISOString() });
    const check = await this.handles.check(handle, userId, now);
    if (!check.available) throw new ConflictException({ code: 'handle_unavailable', ...check });

    const old = user.handle!;
    const until = new Date(now.getTime() + HANDLE_HOLD_DAYS * DAY_MS);
    try {
      const [, updated] = await this.prisma.$transaction([
        // Taking back your own held handle ends its hold
        this.prisma.handleHold.deleteMany({ where: { handle } }),
        this.prisma.user.update({ where: { id: userId }, data: { handle, handleChangedAt: now } }),
        this.prisma.handleHold.upsert({
          where: { handle: old },
          create: { handle: old, userId, until },
          update: { userId, until },
        }),
      ]);
      return toMe(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ code: 'handle_unavailable', ...(await this.handles.check(handle, userId)) });
      }
      throw error;
    }
  }

  async accountDetails(userId: string, now = new Date()): Promise<AccountDetails> {
    const user = await this.signedUp(userId);
    const accounts = await this.prisma.account.findMany({ where: { userId }, select: { id: true, providerId: true } });
    const linked = (provider: string) => accounts.find((a) => a.providerId === provider)?.id ?? null;
    return {
      email: user.email,
      birthday: user.birthday?.toISOString().slice(0, 10) ?? null,
      linked: { google: linked('google'), discord: linked('discord') },
      available: this.providers,
      nextHandleChangeAt: nextHandleChange(user, now)?.toISOString() ?? null,
    };
  }

  /**
   * Deleting an account waits 7 days; signing in meanwhile offers "Keep my account". Every other
   * browser is signed out now. Confirmed by typing the @handle.
   */
  async requestDeletion(
    userId: string,
    sessionId: string,
    typedHandle: string,
    heirs: Record<string, string> = {},
    now = new Date(),
  ): Promise<Me> {
    const user = await this.signedUp(userId);
    if (typedHandle.trim().replace(/^@/, '') !== user.handle) throw new BadRequestException('Type your @handle to confirm');
    await this.rooms.setHeirs(userId, heirs);
    const deleteAt = new Date(now.getTime() + DELETE_GRACE_DAYS * DAY_MS);
    const [, updated] = await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { userId, id: { not: sessionId } } }),
      this.prisma.user.update({ where: { id: userId }, data: { deleteAt } }),
    ]);
    return toMe(updated);
  }

  /** "Keep my account". */
  async keepAccount(userId: string): Promise<Me> {
    await this.user(userId);
    await this.rooms.clearHeirs(userId);
    return toMe(await this.prisma.user.update({ where: { id: userId }, data: { deleteAt: null } }));
  }

  /**
   * Deletes accounts whose 7 days are up (run every hour). The row stays as "Deleted user" so their
   * messages still read; the name, email, birthday, look and sign-ins go, they leave every room (the
   * rooms they own pass on), and the @handle is held for 30 more days. Returns how many went.
   */
  async purgeDue(now = new Date()): Promise<number> {
    const due = await this.prisma.user.findMany({
      where: { deleteAt: { lte: now }, deletedAt: null },
      select: { id: true, handle: true },
    });
    const holdUntil = new Date(now.getTime() + HANDLE_HOLD_DAYS * DAY_MS);
    for (const user of due) {
      // Their rooms pass to the picked members first (or go, when nobody else is in them)
      await this.rooms.handOverAll(user.id);
      await this.friends.forget(user.id);
      await this.prisma.$transaction([
        this.prisma.session.deleteMany({ where: { userId: user.id } }),
        this.prisma.account.deleteMany({ where: { userId: user.id } }),
        // Focus history is personal too (rankings skip deleted people anyway)
        this.prisma.focusSession.deleteMany({ where: { userId: user.id } }),
        this.prisma.todo.deleteMany({ where: { userId: user.id } }),
        ...(user.handle
          ? [
              this.prisma.handleHold.upsert({
                where: { handle: user.handle },
                create: { handle: user.handle, userId: user.id, until: holdUntil },
                update: { userId: user.id, until: holdUntil },
              }),
            ]
          : []),
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            name: 'Deleted user',
            email: `deleted-${user.id}@deleted.connecta.invalid`,
            emailVerified: false,
            image: null,
            handle: null,
            birthday: null,
            look: Prisma.DbNull,
            deleteAt: null,
            deletedAt: now,
          },
        }),
      ]);
    }
    // Holds that have run out free their handles
    await this.prisma.handleHold.deleteMany({ where: { until: { lte: now } } });
    return due.length;
  }

  private signedUp(id: string): Promise<User> {
    return requireSignedUp(this.prisma, id);
  }

  private async user(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    return user;
  }
}

/** When the @handle can next change, or null if it can now. */
function nextHandleChange(user: User, now: Date): Date | null {
  if (!user.handleChangedAt) return null;
  const next = new Date(user.handleChangedAt.getTime() + HANDLE_CHANGE_DAYS * DAY_MS);
  return next > now ? next : null;
}
