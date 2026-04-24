import type {
  CreateRoomResponse,
  GameStartSettings,
  GetRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
  RoomSnapshot,
} from '@gx/go/contracts';
import request from 'supertest';
import type { Socket } from 'socket.io-client';

import {
  closeNestTestApp,
  createNestTestApp,
  once,
  openRoomSocket,
  waitForConnect,
  type NestTestAppContext,
} from './test-fixtures';

export type RoomParticipantSession = CreateRoomResponse | JoinRoomResponse;

export interface RoomsContractHarness {
  context: NestTestAppContext;
  closeRoom(roomId: string, participantToken: string): Promise<void>;
  createRoom(
    displayName: string,
    settings?: GameStartSettings,
  ): Promise<CreateRoomResponse>;
  dispose(): Promise<void>;
  getRoom(roomId: string): Promise<GetRoomResponse>;
  http(): ReturnType<typeof request>;
  joinParticipantSocket(
    participant: RoomParticipantSession,
    transports?: Array<'polling' | 'websocket'>,
  ): Promise<{
    snapshot: RoomSnapshot;
    socket: Socket;
  }>;
  joinRoom(roomId: string, displayName: string): Promise<JoinRoomResponse>;
  listRooms(): Promise<ListRoomsResponse>;
}

/**
 * Creates a reusable harness for REST and realtime room-contract tests.
 */
export async function createRoomsContractHarness(): Promise<RoomsContractHarness> {
  const context = await createNestTestApp();
  const sockets: Socket[] = [];
  const http = () => request(context.app.getHttpServer());

  return {
    context,
    http,
    async createRoom(displayName, settings = { mode: 'go', boardSize: 19 }) {
      const response = await http()
        .post('/api/rooms')
        .send({ displayName, ...settings })
        .expect(201);

      return response.body as CreateRoomResponse;
    },
    async joinRoom(roomId, displayName) {
      const response = await http()
        .post(`/api/rooms/${roomId}/join`)
        .send({ displayName })
        .expect(201);

      return response.body as JoinRoomResponse;
    },
    async getRoom(roomId) {
      const response = await http().get(`/api/rooms/${roomId}`).expect(200);

      return response.body as GetRoomResponse;
    },
    async listRooms() {
      const response = await http().get('/api/rooms').expect(200);

      return response.body as ListRoomsResponse;
    },
    async closeRoom(roomId, participantToken) {
      await http()
        .post(`/api/rooms/${roomId}/close`)
        .send({ participantToken })
        .expect(204);
    },
    async joinParticipantSocket(participant, transports = ['websocket']) {
      const socket = openRoomSocket(context.baseUrl, transports);
      sockets.push(socket);
      await waitForConnect(socket);

      const joined = once<RoomSnapshot>(socket, 'room.snapshot');
      socket.emit('room.join', {
        roomId: participant.roomId,
        participantToken: participant.participantToken,
      });

      return {
        socket,
        snapshot: await joined,
      };
    },
    async dispose() {
      await closeNestTestApp(context, sockets);
      sockets.length = 0;
    },
  };
}
