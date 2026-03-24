import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  ChatMessage,
  CreateRoomResponse,
  GameCommand,
  GameStartSettings,
  GetRoomResponse,
  HostedMatchSnapshot,
  JoinRoomResponse,
  ListRoomsResponse,
  LobbyRoomStatus,
  LobbyRoomSummary,
  RoomSnapshot,
  SystemNotice,
} from '@gx/go/contracts';
import {
  DEFAULT_GO_KOMI,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  MatchSettings,
  PlayerColor,
  createMessage,
  GoMessageDescriptor,
  getRulesEngine,
} from '@gx/go/domain';

const ROOM_ID_LENGTH = 6;
const ROOM_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_IDLE_TTL_MS = 60 * 60 * 1000;
const THROTTLE_WINDOW_MS = 60 * 1000;
const CREATE_ATTEMPTS_PER_WINDOW = 6;
const JOIN_ATTEMPTS_PER_WINDOW = 12;
const CHAT_WINDOW_MS = 10 * 1000;
const CHAT_MESSAGES_PER_WINDOW = 5;
const MAX_CHAT_MESSAGES = 100;
const MAX_CHAT_LENGTH = 280;
const MAX_DISPLAY_NAME_LENGTH = 24;

interface ParticipantRecord {
  id: string;
  token: string;
  displayName: string;
  seat: PlayerColor | null;
  isHost: boolean;
  online: boolean;
  muted: boolean;
  joinedAt: string;
  socketIds: Set<string>;
  chatTimestamps: number[];
}

interface RoomRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  hostParticipantId: string;
  participants: Map<string, ParticipantRecord>;
  tokenIndex: Map<string, string>;
  match: HostedMatchSnapshot | null;
  chat: ChatMessage[];
  emptySince: number | null;
}

interface SocketIndexEntry {
  roomId: string;
  participantId: string;
}

interface MutationResult {
  snapshot: RoomSnapshot;
  notice?: SystemNotice;
}

interface ChatResult {
  snapshot: RoomSnapshot;
  message: ChatMessage;
}

interface KickResult extends MutationResult {
  kickedSocketIds: string[];
}

function roomMessage(
  key: string,
  params?: GoMessageDescriptor['params']
): GoMessageDescriptor {
  return createMessage(key, params);
}

function badRequestMessage(
  key: string,
  params?: GoMessageDescriptor['params']
): BadRequestException {
  return new BadRequestException({
    message: roomMessage(key, params),
  });
}

function conflictMessage(
  key: string,
  params?: GoMessageDescriptor['params']
): ConflictException {
  return new ConflictException({
    message: roomMessage(key, params),
  });
}

function forbiddenMessage(
  key: string,
  params?: GoMessageDescriptor['params']
): ForbiddenException {
  return new ForbiddenException({
    message: roomMessage(key, params),
  });
}

function notFoundMessage(
  key: string,
  params?: GoMessageDescriptor['params']
): NotFoundException {
  return new NotFoundException({
    message: roomMessage(key, params),
  });
}

function throttledMessage(
  key: string,
  params?: GoMessageDescriptor['params']
): HttpException {
  return new HttpException(
    {
      message: roomMessage(key, params),
    },
    HttpStatus.TOO_MANY_REQUESTS
  );
}

@Injectable()
export class RoomsService implements OnModuleDestroy {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly socketIndex = new Map<string, SocketIndexEntry>();
  private readonly attemptWindows = new Map<string, number[]>();
  private readonly cleanupTimer = setInterval(
    () => this.pruneExpiredRooms(),
    60 * 1000
  );

  createRoom(displayName: string, requesterKey: string): CreateRoomResponse {
    this.assertAttemptWithinLimit(
      requesterKey,
      CREATE_ATTEMPTS_PER_WINDOW,
      'room.error.too_many_create_attempts'
    );

    const sanitizedName = this.sanitizeDisplayName(displayName);
    const now = this.timestamp();
    const host = this.createParticipant(sanitizedName, true, now);
    const room: RoomRecord = {
      id: this.generateRoomId(),
      createdAt: now,
      updatedAt: now,
      hostParticipantId: host.id,
      participants: new Map([[host.id, host]]),
      tokenIndex: new Map([[host.token, host.id]]),
      match: null,
      chat: [],
      emptySince: null,
    };

    this.rooms.set(room.id, room);

    return {
      roomId: room.id,
      participantToken: host.token,
      participantId: host.id,
      snapshot: this.snapshotFor(room),
    };
  }

  joinRoom(
    roomId: string,
    displayName: string,
    participantToken: string | undefined,
    requesterKey: string
  ): JoinRoomResponse {
    this.assertAttemptWithinLimit(
      requesterKey,
      JOIN_ATTEMPTS_PER_WINDOW,
      'room.error.too_many_join_attempts'
    );

    const room = this.getRoomRecord(roomId);
    const sanitizedName = this.sanitizeDisplayName(displayName);
    let participant =
      participantToken && participantToken.trim().length > 0
        ? this.tryGetParticipantByToken(room, participantToken)
        : null;
    const resumed = participant !== null;

    if (participant) {
      participant.displayName = sanitizedName;
    } else {
      participant = this.createParticipant(sanitizedName, false, this.timestamp());
      room.participants.set(participant.id, participant);
      room.tokenIndex.set(participant.token, participant.id);
    }

    this.touchRoom(room);

    return {
      roomId: room.id,
      participantToken: participant.token,
      participantId: participant.id,
      resumed,
      snapshot: this.snapshotFor(room),
    };
  }

  getRoom(roomId: string): GetRoomResponse {
    return {
      snapshot: this.snapshotFor(this.getRoomRecord(roomId)),
    };
  }

  listRooms(): ListRoomsResponse {
    const rooms = [...this.rooms.values()]
      .filter(room => !this.isRoomOffline(room))
      .map(room => this.lobbySummaryFor(room))
      .sort((left, right) => {
        const statusOrder = this.compareLobbyStatus(left.status, right.status);

        if (statusOrder !== 0) {
          return statusOrder;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });

    return {
      rooms,
    };
  }

  connectParticipantSocket(
    roomId: string,
    participantToken: string,
    socketId: string
  ): RoomSnapshot {
    const room = this.getRoomRecord(roomId);
    const participant = this.getParticipantByToken(room, participantToken);

    participant.socketIds.add(socketId);
    participant.online = true;
    this.socketIndex.set(socketId, {
      roomId: room.id,
      participantId: participant.id,
    });
    room.emptySince = null;
    this.touchRoom(room);

    return this.snapshotFor(room);
  }

  disconnectSocket(socketId: string): RoomSnapshot | null {
    const entry = this.socketIndex.get(socketId);

    if (!entry) {
      return null;
    }

    this.socketIndex.delete(socketId);

    const room = this.rooms.get(entry.roomId);

    if (!room) {
      return null;
    }

    const participant = room.participants.get(entry.participantId);

    if (participant) {
      participant.socketIds.delete(socketId);
      participant.online = participant.socketIds.size > 0;
    }

    if (this.isRoomOffline(room)) {
      room.emptySince ??= Date.now();
    }

    this.touchRoom(room);
    return this.snapshotFor(room);
  }

  claimSeat(
    roomId: string,
    participantToken: string,
    color: PlayerColor
  ): MutationResult {
    const room = this.getRoomRecord(roomId);
    const participant = this.getParticipantByToken(room, participantToken);

    this.assertSeatChangeAllowed(room);

    const seatHolder = this.getSeatHolder(room, color);
    if (seatHolder && seatHolder.id !== participant.id) {
      throw conflictMessage('room.error.seat_already_claimed');
    }

    if (participant.seat === color) {
      return { snapshot: this.snapshotFor(room) };
    }

    const previousSeat = participant.seat;
    participant.seat = color;
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      notice: this.createNotice(
        previousSeat
          ? roomMessage('room.notice.seat_moved', {
              displayName: participant.displayName,
              seat: roomMessage(`common.seat.${color}`),
            })
          : roomMessage('room.notice.seat_claimed', {
              displayName: participant.displayName,
              seat: roomMessage(`common.seat.${color}`),
            })
      ),
    };
  }

  releaseSeat(roomId: string, participantToken: string): MutationResult {
    const room = this.getRoomRecord(roomId);
    const participant = this.getParticipantByToken(room, participantToken);

    this.assertSeatChangeAllowed(room);

    if (!participant.seat) {
      throw badRequestMessage('room.error.no_player_seat');
    }

    const releasedSeat = participant.seat;
    participant.seat = null;
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      notice: this.createNotice(
        roomMessage('room.notice.seat_released', {
          displayName: participant.displayName,
          seat: roomMessage(`common.seat.${releasedSeat}`),
        })
      ),
    };
  }

  startMatch(
    roomId: string,
    participantToken: string,
    settings: GameStartSettings
  ): MutationResult {
    const room = this.getRoomRecord(roomId);
    const host = this.assertHostParticipant(room, participantToken);

    if (room.match && room.match.state.phase !== 'finished') {
      throw badRequestMessage('room.error.match_must_finish');
    }

    const black = this.getSeatHolder(room, 'black');
    const white = this.getSeatHolder(room, 'white');

    if (!black || !white) {
      throw badRequestMessage('room.error.both_seats_required');
    }

    const normalizedSettings = this.normalizeSettings(
      settings,
      black.displayName,
      white.displayName
    );
    room.match = {
      settings: normalizedSettings,
      state: getRulesEngine(normalizedSettings.mode).createInitialState(
        normalizedSettings
      ),
      startedAt: this.timestamp(),
    };
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      notice: this.createNotice(
        roomMessage('room.notice.match_started', {
          displayName: host.displayName,
          mode: roomMessage(`common.mode.${normalizedSettings.mode}`),
        })
      ),
    };
  }

  applyGameCommand(
    roomId: string,
    participantToken: string,
    command: GameCommand
  ): MutationResult {
    const room = this.getRoomRecord(roomId);
    const participant = this.getParticipantByToken(room, participantToken);
    const match = this.requireMatch(room);

    if (!participant.seat) {
      throw forbiddenMessage('room.error.spectators_cannot_play');
    }

    if (command.type === 'toggle-dead') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw badRequestMessage('room.error.dead_group_toggle_unavailable');
      }

      const nextState = getRulesEngine('go').toggleDeadGroup?.(
        match.state,
        match.settings,
        command.point
      );

      if (!nextState) {
        throw badRequestMessage('room.error.scoring_preview_unavailable');
      }

      room.match = {
        ...match,
        state: nextState,
      };
      this.touchRoom(room);
      return {
        snapshot: this.snapshotFor(room),
      };
    }

    if (command.type === 'finalize-scoring') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw badRequestMessage('room.error.score_finalization_unavailable');
      }

      const nextState = getRulesEngine('go').finalizeScoring?.(
        match.state,
        match.settings
      );

      if (!nextState) {
        throw badRequestMessage('room.error.finalize_scoring_failed');
      }

      room.match = {
        ...match,
        state: nextState,
      };
      this.touchRoom(room);
      return {
        snapshot: this.snapshotFor(room),
      };
    }

    if (match.state.phase !== 'playing') {
      throw badRequestMessage('room.error.match_not_accepting_moves');
    }

    if (command.type !== 'resign' && match.state.nextPlayer !== participant.seat) {
      throw forbiddenMessage('room.error.not_your_turn');
    }

    if (command.type === 'resign' && command.player && command.player !== participant.seat) {
      throw forbiddenMessage('room.error.resign_only_for_self');
    }

    const normalizedCommand =
      command.type === 'resign'
        ? {
            type: 'resign' as const,
            player: participant.seat,
          }
        : command;
    const result = getRulesEngine(match.settings.mode).applyMove(
      match.state,
      match.settings,
      normalizedCommand
    );

    if (!result.ok) {
      throw new BadRequestException({
        message: result.error ?? roomMessage('room.error.move_rejected'),
      });
    }

    room.match = {
      ...match,
      state: result.state,
    };
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
    };
  }

  sendChatMessage(
    roomId: string,
    participantToken: string,
    message: string
  ): ChatResult {
    const room = this.getRoomRecord(roomId);
    const participant = this.getParticipantByToken(room, participantToken);

    if (participant.muted) {
      throw forbiddenMessage('room.error.you_are_muted');
    }

    const sanitizedMessage = this.sanitizeChatMessage(message);
    const now = Date.now();
    participant.chatTimestamps = participant.chatTimestamps.filter(
      timestamp => now - timestamp < CHAT_WINDOW_MS
    );

    if (participant.chatTimestamps.length >= CHAT_MESSAGES_PER_WINDOW) {
      throw throttledMessage('room.error.chat_rate_limited');
    }

    participant.chatTimestamps.push(now);

    const chatMessage: ChatMessage = {
      id: this.createId(),
      participantId: participant.id,
      displayName: participant.displayName,
      message: sanitizedMessage,
      sentAt: this.timestamp(),
      system: false,
    };

    room.chat.push(chatMessage);
    room.chat = room.chat.slice(-MAX_CHAT_MESSAGES);
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      message: chatMessage,
    };
  }

  muteParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string
  ): MutationResult {
    const room = this.getRoomRecord(roomId);
    const host = this.assertHostParticipant(room, participantToken);
    const target = this.getParticipantById(room, targetParticipantId);

    if (target.isHost) {
      throw badRequestMessage('room.error.host_cannot_be_muted');
    }

    target.muted = true;
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      notice: this.createNotice(
        roomMessage('room.notice.participant_muted', {
          actorDisplayName: host.displayName,
          targetDisplayName: target.displayName,
        })
      ),
    };
  }

  unmuteParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string
  ): MutationResult {
    const room = this.getRoomRecord(roomId);
    const host = this.assertHostParticipant(room, participantToken);
    const target = this.getParticipantById(room, targetParticipantId);

    target.muted = false;
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      notice: this.createNotice(
        roomMessage('room.notice.participant_unmuted', {
          actorDisplayName: host.displayName,
          targetDisplayName: target.displayName,
        })
      ),
    };
  }

  kickParticipant(
    roomId: string,
    participantToken: string,
    targetParticipantId: string
  ): KickResult {
    const room = this.getRoomRecord(roomId);
    const host = this.assertHostParticipant(room, participantToken);
    const target = this.getParticipantById(room, targetParticipantId);

    if (target.isHost) {
      throw badRequestMessage('room.error.host_cannot_be_kicked');
    }

    if (target.seat && room.match && room.match.state.phase !== 'finished') {
      throw badRequestMessage('room.error.cannot_kick_active_player');
    }

    const kickedSocketIds = [...target.socketIds];
    room.participants.delete(target.id);
    room.tokenIndex.delete(target.token);

    for (const socketId of kickedSocketIds) {
      this.socketIndex.delete(socketId);
    }

    if (this.isRoomOffline(room)) {
      room.emptySince ??= Date.now();
    }

    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      kickedSocketIds,
      notice: this.createNotice(
        roomMessage('room.notice.participant_removed', {
          actorDisplayName: host.displayName,
          targetDisplayName: target.displayName,
        })
      ),
    };
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  private snapshotFor(room: RoomRecord): RoomSnapshot {
    const participants = [...room.participants.values()]
      .map(participant => ({
        participantId: participant.id,
        displayName: participant.displayName,
        seat: participant.seat,
        isHost: participant.isHost,
        online: participant.online,
        muted: participant.muted,
        joinedAt: participant.joinedAt,
      }))
      .sort((left, right) => {
        if (left.isHost !== right.isHost) {
          return left.isHost ? -1 : 1;
        }

        return left.joinedAt.localeCompare(right.joinedAt);
      });

    return {
      roomId: room.id,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      hostParticipantId: room.hostParticipantId,
      participants,
      seatState: {
        black: this.getSeatHolder(room, 'black')?.id ?? null,
        white: this.getSeatHolder(room, 'white')?.id ?? null,
      },
      match: room.match ? structuredClone(room.match) : null,
      chat: structuredClone(room.chat),
    };
  }

  private lobbySummaryFor(room: RoomRecord): LobbyRoomSummary {
    const host = room.participants.get(room.hostParticipantId);
    const black = this.getSeatHolder(room, 'black');
    const white = this.getSeatHolder(room, 'white');
    const onlineCount = [...room.participants.values()].filter(
      participant => participant.online
    ).length;

    return {
      roomId: room.id,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      hostDisplayName: host?.displayName ?? 'Host',
      status: this.getLobbyStatus(room, black, white),
      mode: room.match?.settings.mode ?? null,
      boardSize: room.match?.settings.boardSize ?? null,
      players: {
        black: black?.displayName ?? null,
        white: white?.displayName ?? null,
      },
      participantCount: room.participants.size,
      onlineCount,
      spectatorCount: [...room.participants.values()].filter(
        participant => participant.seat === null
      ).length,
    };
  }

  private getRoomRecord(roomId: string): RoomRecord {
    const normalized = roomId.trim().toUpperCase();
    const room = this.rooms.get(normalized);

    if (!room) {
      throw notFoundMessage('room.error.not_found', {
        roomId: normalized,
      });
    }

    return room;
  }

  private requireMatch(room: RoomRecord): HostedMatchSnapshot {
    if (!room.match) {
      throw badRequestMessage('room.error.no_match_started');
    }

    return room.match;
  }

  private tryGetParticipantByToken(
    room: RoomRecord,
    participantToken: string
  ): ParticipantRecord | null {
    const participantId = room.tokenIndex.get(participantToken.trim());

    return participantId ? room.participants.get(participantId) ?? null : null;
  }

  private getParticipantByToken(
    room: RoomRecord,
    participantToken: string
  ): ParticipantRecord {
    const participant = this.tryGetParticipantByToken(room, participantToken);

    if (!participant) {
      throw forbiddenMessage('room.error.invalid_participant_token');
    }

    return participant;
  }

  private getParticipantById(
    room: RoomRecord,
    participantId: string
  ): ParticipantRecord {
    const participant = room.participants.get(participantId);

    if (!participant) {
      throw notFoundMessage('room.error.participant_not_found');
    }

    return participant;
  }

  private assertHostParticipant(
    room: RoomRecord,
    participantToken: string
  ): ParticipantRecord {
    const participant = this.getParticipantByToken(room, participantToken);

    if (!participant.isHost) {
      throw forbiddenMessage('room.error.host_only_action');
    }

    return participant;
  }

  private getSeatHolder(
    room: RoomRecord,
    color: PlayerColor
  ): ParticipantRecord | null {
    for (const participant of room.participants.values()) {
      if (participant.seat === color) {
        return participant;
      }
    }

    return null;
  }

  private getLobbyStatus(
    room: RoomRecord,
    black: ParticipantRecord | null,
    white: ParticipantRecord | null
  ): LobbyRoomStatus {
    if (room.match && room.match.state.phase !== 'finished') {
      return 'live';
    }

    if (black && white) {
      return 'ready';
    }

    return 'waiting';
  }

  private compareLobbyStatus(
    left: LobbyRoomStatus,
    right: LobbyRoomStatus
  ): number {
    const order: Record<LobbyRoomStatus, number> = {
      live: 0,
      ready: 1,
      waiting: 2,
    };

    return order[left] - order[right];
  }

  private assertSeatChangeAllowed(room: RoomRecord): void {
    if (room.match && room.match.state.phase !== 'finished') {
      throw badRequestMessage('room.error.seat_change_while_live');
    }
  }

  private normalizeSettings(
    settings: GameStartSettings,
    blackName: string,
    whiteName: string
  ): MatchSettings {
    if (settings.mode !== 'go' && settings.mode !== 'gomoku') {
      throw badRequestMessage('room.error.unsupported_mode');
    }

    if (settings.mode === 'go') {
      if (!GO_BOARD_SIZES.includes(settings.boardSize as 9 | 13 | 19)) {
        throw badRequestMessage('room.error.invalid_go_board_size');
      }

      return {
        mode: 'go',
        boardSize: settings.boardSize as 9 | 13 | 19,
        komi:
          typeof settings.komi === 'number' && Number.isFinite(settings.komi)
            ? settings.komi
            : DEFAULT_GO_KOMI,
        players: {
          black: blackName,
          white: whiteName,
        },
      };
    }

    if (settings.boardSize !== GOMOKU_BOARD_SIZE) {
      throw badRequestMessage('room.error.invalid_gomoku_board_size');
    }

    return {
      mode: 'gomoku',
      boardSize: GOMOKU_BOARD_SIZE,
      komi: 0,
      players: {
        black: blackName,
        white: whiteName,
      },
    };
  }

  private sanitizeDisplayName(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0) {
      throw badRequestMessage('room.error.display_name_required');
    }

    if (normalized.length > MAX_DISPLAY_NAME_LENGTH) {
      throw badRequestMessage('room.error.display_name_too_long', {
        max: MAX_DISPLAY_NAME_LENGTH,
      });
    }

    return normalized;
  }

  private sanitizeChatMessage(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0) {
      throw badRequestMessage('room.error.chat_required');
    }

    if (normalized.length > MAX_CHAT_LENGTH) {
      throw badRequestMessage('room.error.chat_too_long', {
        max: MAX_CHAT_LENGTH,
      });
    }

    return normalized;
  }

  private createParticipant(
    displayName: string,
    isHost: boolean,
    joinedAt: string
  ): ParticipantRecord {
    return {
      id: this.createId(),
      token: this.createId(),
      displayName,
      seat: null,
      isHost,
      online: false,
      muted: false,
      joinedAt,
      socketIds: new Set<string>(),
      chatTimestamps: [],
    };
  }

  private createNotice(message: GoMessageDescriptor): SystemNotice {
    return {
      id: this.createId(),
      message,
      createdAt: this.timestamp(),
    };
  }

  private touchRoom(room: RoomRecord): void {
    room.updatedAt = this.timestamp();
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  private createId(): string {
    return crypto.randomUUID();
  }

  private generateRoomId(): string {
    let roomId = '';

    do {
      roomId = Array.from({ length: ROOM_ID_LENGTH }, () => {
        const index = Math.floor(Math.random() * ROOM_ID_ALPHABET.length);
        return ROOM_ID_ALPHABET[index];
      }).join('');
    } while (this.rooms.has(roomId));

    return roomId;
  }

  private isRoomOffline(room: RoomRecord): boolean {
    return [...room.participants.values()].every(participant => !participant.online);
  }

  private assertAttemptWithinLimit(
    key: string,
    limit: number,
    messageKey: string
  ): void {
    const now = Date.now();
    const timestamps = (this.attemptWindows.get(key) ?? []).filter(
      timestamp => now - timestamp < THROTTLE_WINDOW_MS
    );

    if (timestamps.length >= limit) {
      this.attemptWindows.set(key, timestamps);
      throw throttledMessage(messageKey);
    }

    timestamps.push(now);
    this.attemptWindows.set(key, timestamps);
  }

  private pruneExpiredRooms(): void {
    const now = Date.now();

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.emptySince && now - room.emptySince >= ROOM_IDLE_TTL_MS) {
        this.rooms.delete(roomId);
      }
    }

    for (const [key, timestamps] of this.attemptWindows.entries()) {
      const active = timestamps.filter(
        timestamp => now - timestamp < THROTTLE_WINDOW_MS
      );

      if (active.length === 0) {
        this.attemptWindows.delete(key);
      } else {
        this.attemptWindows.set(key, active);
      }
    }
  }
}
