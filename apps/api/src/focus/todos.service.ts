import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TODO_DONE_DAYS, TODO_LIMIT } from '@connecta/shared';
import type { Todo as Row } from '../generated/prisma/client.js';
import { requireSignedUp } from '../accounts/signed-up.js';
import { LiveService } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Todo, TodoList } from './todos.schemas.js';

const DAY_MS = 86_400_000;
/** To your other tabs: your list changed, fetch it again */
export const TODOS_EVENT = 'todos';
const toTodo = (t: Row): Todo => ({ id: t.id, text: t.text, done: t.done });

/**
 * The to-do list (docs/features/07-study-tools.md): one per account, private, the same in every room. Guests have none
 * (sign-up keeps their character, not a list). Done items clear themselves after 7 days.
 */
@Injectable()
export class TodosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: LiveService,
  ) {}

  async list(userId: string, now = new Date()): Promise<TodoList> {
    await requireSignedUp(this.prisma, userId);
    const rows = await this.prisma.todo.findMany({
      // Old done ones are hidden at once, even before the nightly job removes them
      where: { userId, OR: [{ doneAt: null }, { doneAt: { gt: new Date(now.getTime() - TODO_DONE_DAYS * DAY_MS) } }] },
      orderBy: { position: 'asc' },
    });
    return { todos: rows.map(toTodo) };
  }

  async add(userId: string, text: string): Promise<Todo> {
    await requireSignedUp(this.prisma, userId);
    return this.prisma
      .$transaction(async (tx) => {
        const count = await tx.todo.count({ where: { userId } });
        if (count >= TODO_LIMIT) {
          throw new ConflictException({ code: 'full', message: `Your list is full (${TODO_LIMIT}). Clear some done ones first.` });
        }
        const last = await tx.todo.findFirst({ where: { userId }, orderBy: { position: 'desc' }, select: { position: true } });
        return toTodo(await tx.todo.create({ data: { userId, text, position: (last?.position ?? 0) + 1 } }));
      })
      .then((todo) => this.changed(userId, todo));
  }

  async tick(userId: string, id: string, done: boolean, now = new Date()): Promise<Todo> {
    await this.mine(userId, id);
    return this.changed(userId, toTodo(await this.prisma.todo.update({ where: { id }, data: { done, doneAt: done ? now : null } })));
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.mine(userId, id);
    await this.prisma.todo.delete({ where: { id } });
    this.changed(userId);
  }

  /** "Clear done" */
  async clearDone(userId: string): Promise<void> {
    await requireSignedUp(this.prisma, userId);
    await this.prisma.todo.deleteMany({ where: { userId, done: true } });
    this.changed(userId);
  }

  /** The nightly job: done items older than 7 days go. Returns how many. */
  async purgeDone(now = new Date()): Promise<number> {
    const { count } = await this.prisma.todo.deleteMany({ where: { doneAt: { lte: new Date(now.getTime() - TODO_DONE_DAYS * DAY_MS) } } });
    return count;
  }

  /** Your other tabs (and devices) fetch the list again */
  private changed<T>(userId: string, result?: T): T {
    this.live.toUser(userId, TODOS_EVENT, {});
    return result as T;
  }

  /** Someone else's item is as good as missing */
  private async mine(userId: string, id: string) {
    await requireSignedUp(this.prisma, userId);
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo || todo.userId !== userId) throw new NotFoundException();
    return todo;
  }
}
