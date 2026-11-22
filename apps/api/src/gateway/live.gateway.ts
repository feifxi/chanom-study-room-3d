import { Inject, Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { fromNodeHeaders } from 'better-auth/node';
import type { Server, Socket } from 'socket.io';
import type { createAuth } from '../auth/auth.js';
import { liveRoom } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import type { Person } from '../rooms/rooms.schemas.js';

export const GATEWAY_AUTH = Symbol('GATEWAY_AUTH');

/** The web app reaches the gateway at /live on its own origin (nginx, or a Next rewrite locally). */
export const LIVE_PATH = '/live';

type LiveSocket = Socket<Record<string, never>, Record<string, never>, Record<string, never>, { userId: string; person: Person }>;
type Ack = { ok: true } | { ok: false; error: string };

/**
 * The live connection (docs/v2/features/04-chat-and-dms.md): signed-in people's tabs connect here.
 * It only delivers: writes go through the REST API, which publishes the results via Redis. The one
 * thing that comes in is "typing", which is never stored.
 */
@WebSocketGateway({ path: LIVE_PATH, addTrailingSlash: false, serveClient: false })
export class LiveGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly log = new Logger(LiveGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(GATEWAY_AUTH) private readonly auth: ReturnType<typeof createAuth>,
  ) {}

  /**
   * Signed in with a finished account (the session cookie), or the connection is refused. This runs
   * as middleware, before the connection opens: a tab sends "watch" the moment it's connected, and
   * that must not race the session check.
   */
  afterInit(server: Server) {
    server.use((socket, next) => {
      this.authenticate(socket as LiveSocket).then(
        (ok) => next(ok ? undefined : new Error('unauthorized')),
        (error: unknown) => {
          this.log.warn(`Couldn't open a live connection: ${String(error)}`);
          next(new Error('unavailable'));
        },
      );
    });
  }

  async handleConnection(socket: LiveSocket) {
    await socket.join(liveRoom.user(socket.data.userId));
  }

  private async authenticate(socket: LiveSocket): Promise<boolean> {
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(socket.handshake.headers) });
    const user = session && (await this.prisma.user.findUnique({ where: { id: session.user.id } }));
    if (!user || user.isAnonymous || !user.handle || user.deleteAt) return false;
    socket.data = { userId: user.id, person: toPerson(user) };
    return true;
  }

  /** Start getting a room's chat: members only. */
  @SubscribeMessage('watch')
  async watch(@ConnectedSocket() socket: LiveSocket, @MessageBody() roomId: unknown): Promise<Ack> {
    if (typeof roomId !== 'string' || !socket.data?.userId) return { ok: false, error: 'bad_request' };
    const member = await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId: socket.data.userId } } });
    if (!member) return { ok: false, error: 'not_found' };
    await socket.join(liveRoom.room(roomId));
    return { ok: true };
  }

  @SubscribeMessage('unwatch')
  async unwatch(@ConnectedSocket() socket: LiveSocket, @MessageBody() roomId: unknown): Promise<Ack> {
    if (typeof roomId === 'string') await socket.leave(liveRoom.room(roomId));
    return { ok: true };
  }

  /** "Mai is typing…" to the others watching the room. Sent again every few seconds while typing. */
  @SubscribeMessage('typing')
  typing(@ConnectedSocket() socket: LiveSocket, @MessageBody() roomId: unknown) {
    if (typeof roomId !== 'string' || !socket.rooms.has(liveRoom.room(roomId))) return;
    socket.to(liveRoom.room(roomId)).emit('typing' as never, { roomId, person: socket.data.person } as never);
  }
}
