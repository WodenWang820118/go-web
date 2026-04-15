import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { CreateRoomResponse, JoinRoomResponse } from '@gx/go/contracts';
import { Socket, io } from 'socket.io-client';

import { AppModule } from '../app.module';
import { configureApp } from '../app.bootstrap';
import { RoomsErrorsService } from '../core/rooms-errors/rooms-errors.service';
import { RoomsRulesEngineService } from '../core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsSnapshotMapper } from '../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../core/rooms-store/rooms-store.service';
import { RoomsChatService } from '../features/rooms-chat/rooms-chat.service';
import { RoomsLifecycleService } from '../features/rooms-lifecycle/rooms-lifecycle.service';
import { RoomsMatchService } from '../features/rooms-match/rooms-match.service';
import { RoomsModerationService } from '../features/rooms-moderation/rooms-moderation.service';

export interface NestTestAppContext {
  app: INestApplication;
  baseUrl: string;
}

export interface RoomsServicesTestContext {
  store: RoomsStore;
  snapshotMapper: RoomsSnapshotMapper;
  rulesEngines: RoomsRulesEngineService;
  lifecycle: RoomsLifecycleService;
  match: RoomsMatchService;
  chat: RoomsChatService;
  moderation: RoomsModerationService;
  destroy(): void;
}

export async function createNestTestApp(): Promise<NestTestAppContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0, '127.0.0.1');

  const address = app.getHttpServer().address();
  const port = typeof address === 'string' ? 0 : address.port;

  return {
    app,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

export async function closeNestTestApp(
  context: NestTestAppContext,
  sockets: Socket[] = []
): Promise<void> {
  for (const socket of sockets) {
    socket.disconnect();
  }

  await context.app.close();
}

export function openRoomSocket(
  baseUrl: string,
  transports: Array<'websocket' | 'polling'> = ['websocket']
): Socket {
  return io(baseUrl, {
    path: '/socket.io',
    transports,
    forceNew: true,
  });
}

export function waitForConnect(socket: Socket): Promise<void> {
  if (socket.connected) {
    return Promise.resolve();
  }

  return once(socket, 'connect');
}

export function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise(resolve => {
    socket.once(event, resolve);
  });
}

export function onceWhere<T>(
  socket: Socket,
  event: string,
  predicate: (payload: T) => boolean,
  timeoutMs = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);

    const handler = (payload: T) => {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timeout);
      socket.off(event, handler);
      resolve(payload);
    };

    socket.on(event, handler);
  });
}

export async function finishGomokuMatchOverSocket(
  hostSocket: Socket,
  guestSocket: Socket,
  host: CreateRoomResponse,
  guest: JoinRoomResponse
): Promise<void> {
  const sequence = [
    { socket: hostSocket, token: host.participantToken, point: { x: 0, y: 0 } },
    { socket: guestSocket, token: guest.participantToken, point: { x: 0, y: 1 } },
    { socket: hostSocket, token: host.participantToken, point: { x: 1, y: 0 } },
    { socket: guestSocket, token: guest.participantToken, point: { x: 1, y: 1 } },
    { socket: hostSocket, token: host.participantToken, point: { x: 2, y: 0 } },
    { socket: guestSocket, token: guest.participantToken, point: { x: 2, y: 1 } },
    { socket: hostSocket, token: host.participantToken, point: { x: 3, y: 0 } },
    { socket: guestSocket, token: guest.participantToken, point: { x: 3, y: 1 } },
    { socket: hostSocket, token: host.participantToken, point: { x: 4, y: 0 } },
  ];

  for (const [index, move] of sequence.entries()) {
    const finishedMove = index === sequence.length - 1;
    const nextUpdate = onceWhere<{ match: { state: { phase: string } } }>(
      move.socket === hostSocket ? guestSocket : hostSocket,
      'game.updated',
      event => event.match.state.phase === (finishedMove ? 'finished' : 'playing')
    );

    move.socket.emit('game.command', {
      roomId: host.roomId,
      participantToken: move.token,
      command: {
        type: 'place',
        point: move.point,
      },
    });

    await nextUpdate;
  }
}

export function createRoomsServicesTestContext(): RoomsServicesTestContext {
  const roomsErrors = new RoomsErrorsService();
  const store = new RoomsStore(roomsErrors);
  const snapshotMapper = new RoomsSnapshotMapper(store);
  const rulesEngines = new RoomsRulesEngineService();
  const lifecycle = new RoomsLifecycleService(store, snapshotMapper, roomsErrors);
  const match = new RoomsMatchService(
    store,
    snapshotMapper,
    rulesEngines,
    roomsErrors
  );
  const chat = new RoomsChatService(store, snapshotMapper, roomsErrors);
  const moderation = new RoomsModerationService(
    store,
    snapshotMapper,
    roomsErrors
  );

  return {
    store,
    snapshotMapper,
    rulesEngines,
    lifecycle,
    match,
    chat,
    moderation,
    destroy() {
      lifecycle.onModuleDestroy();
    },
  };
}

export function finishGomokuMatch(
  match: RoomsMatchService,
  roomId: string,
  hostToken: string,
  guestToken: string
): void {
  const sequence = [
    { token: hostToken, point: { x: 0, y: 0 } },
    { token: guestToken, point: { x: 0, y: 1 } },
    { token: hostToken, point: { x: 1, y: 0 } },
    { token: guestToken, point: { x: 1, y: 1 } },
    { token: hostToken, point: { x: 2, y: 0 } },
    { token: guestToken, point: { x: 2, y: 1 } },
    { token: hostToken, point: { x: 3, y: 0 } },
    { token: guestToken, point: { x: 3, y: 1 } },
    { token: hostToken, point: { x: 4, y: 0 } },
  ];

  for (const move of sequence) {
    match.applyGameCommand(roomId, move.token, {
      type: 'place',
      point: move.point,
    });
  }
}
