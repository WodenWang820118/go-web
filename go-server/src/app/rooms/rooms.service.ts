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
  RoomSnapshot,
  SystemNotice,
} from '@org/go/contracts';
import {
  DEFAULT_GO_KOMI,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  MatchSettings,
  PlayerColor,
  getRulesEngine,
} from '@org/go/domain';

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
      'Too many room creation attempts. Please try again shortly.'
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
      'Too many room join attempts. Please wait a moment and try again.'
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
      throw new ConflictException('That seat is already claimed.');
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
          ? `${participant.displayName} moved to the ${color} seat.`
          : `${participant.displayName} claimed the ${color} seat.`
      ),
    };
  }

  releaseSeat(roomId: string, participantToken: string): MutationResult {
    const room = this.getRoomRecord(roomId);
    const participant = this.getParticipantByToken(room, participantToken);

    this.assertSeatChangeAllowed(room);

    if (!participant.seat) {
      throw new BadRequestException('You do not currently occupy a player seat.');
    }

    const releasedSeat = participant.seat;
    participant.seat = null;
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      notice: this.createNotice(
        `${participant.displayName} released the ${releasedSeat} seat.`
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
      throw new BadRequestException(
        'The current match must finish before a new one can start.'
      );
    }

    const black = this.getSeatHolder(room, 'black');
    const white = this.getSeatHolder(room, 'white');

    if (!black || !white) {
      throw new BadRequestException(
        'Both black and white seats must be claimed before starting a match.'
      );
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
        `${host.displayName} started a ${normalizedSettings.mode} match.`
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
      throw new ForbiddenException('Spectators cannot submit game commands.');
    }

    if (command.type === 'toggle-dead') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw new BadRequestException(
          'Dead-group toggling is only available during Go scoring.'
        );
      }

      const nextState = getRulesEngine('go').toggleDeadGroup?.(
        match.state,
        match.settings,
        command.point
      );

      if (!nextState) {
        throw new BadRequestException('Unable to update scoring preview.');
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
        throw new BadRequestException(
          'Score finalization is only available during Go scoring.'
        );
      }

      const nextState = getRulesEngine('go').finalizeScoring?.(
        match.state,
        match.settings
      );

      if (!nextState) {
        throw new BadRequestException('Unable to finalize scoring.');
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
      throw new BadRequestException('The match is not accepting new moves.');
    }

    if (command.type !== 'resign' && match.state.nextPlayer !== participant.seat) {
      throw new ForbiddenException('It is not your turn.');
    }

    if (command.type === 'resign' && command.player && command.player !== participant.seat) {
      throw new ForbiddenException('Players may only resign on their own behalf.');
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
      throw new BadRequestException(result.error ?? 'Move rejected.');
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
      throw new ForbiddenException('You are muted in this room.');
    }

    const sanitizedMessage = this.sanitizeChatMessage(message);
    const now = Date.now();
    participant.chatTimestamps = participant.chatTimestamps.filter(
      timestamp => now - timestamp < CHAT_WINDOW_MS
    );

    if (participant.chatTimestamps.length >= CHAT_MESSAGES_PER_WINDOW) {
      throw new HttpException(
        'You are sending chat messages too quickly.',
        HttpStatus.TOO_MANY_REQUESTS
      );
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
      throw new BadRequestException('The host cannot be muted.');
    }

    target.muted = true;
    this.touchRoom(room);

    return {
      snapshot: this.snapshotFor(room),
      notice: this.createNotice(
        `${host.displayName} muted ${target.displayName}.`
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
        `${host.displayName} unmuted ${target.displayName}.`
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
      throw new BadRequestException('The host cannot be kicked.');
    }

    if (target.seat && room.match && room.match.state.phase !== 'finished') {
      throw new BadRequestException(
        'Seated players cannot be kicked during an active match.'
      );
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
      notice: this.createNotice(`${host.displayName} removed ${target.displayName}.`),
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

  private getRoomRecord(roomId: string): RoomRecord {
    const normalized = roomId.trim().toUpperCase();
    const room = this.rooms.get(normalized);

    if (!room) {
      throw new NotFoundException(`Room ${normalized} was not found.`);
    }

    return room;
  }

  private requireMatch(room: RoomRecord): HostedMatchSnapshot {
    if (!room.match) {
      throw new BadRequestException('No hosted match has been started yet.');
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
      throw new ForbiddenException('Participant token is invalid for this room.');
    }

    return participant;
  }

  private getParticipantById(
    room: RoomRecord,
    participantId: string
  ): ParticipantRecord {
    const participant = room.participants.get(participantId);

    if (!participant) {
      throw new NotFoundException('Participant was not found in this room.');
    }

    return participant;
  }

  private assertHostParticipant(
    room: RoomRecord,
    participantToken: string
  ): ParticipantRecord {
    const participant = this.getParticipantByToken(room, participantToken);

    if (!participant.isHost) {
      throw new ForbiddenException('Only the room host can perform this action.');
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

  private assertSeatChangeAllowed(room: RoomRecord): void {
    if (room.match && room.match.state.phase !== 'finished') {
      throw new BadRequestException(
        'Seats cannot be changed while a match is in progress.'
      );
    }
  }

  private normalizeSettings(
    settings: GameStartSettings,
    blackName: string,
    whiteName: string
  ): MatchSettings {
    if (settings.mode !== 'go' && settings.mode !== 'gomoku') {
      throw new BadRequestException('Unsupported game mode.');
    }

    if (settings.mode === 'go') {
      if (!GO_BOARD_SIZES.includes(settings.boardSize as 9 | 13 | 19)) {
        throw new BadRequestException(
          'Go matches must use a 9x9, 13x13, or 19x19 board.'
        );
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
      throw new BadRequestException('Gomoku matches must use a 15x15 board.');
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
      throw new BadRequestException('Display name is required.');
    }

    if (normalized.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new BadRequestException(
        `Display names must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`
      );
    }

    return normalized;
  }

  private sanitizeChatMessage(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0) {
      throw new BadRequestException('Chat messages cannot be empty.');
    }

    if (normalized.length > MAX_CHAT_LENGTH) {
      throw new BadRequestException(
        `Chat messages must be ${MAX_CHAT_LENGTH} characters or fewer.`
      );
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

  private createNotice(message: string): SystemNotice {
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
    message: string
  ): void {
    const now = Date.now();
    const timestamps = (this.attemptWindows.get(key) ?? []).filter(
      timestamp => now - timestamp < THROTTLE_WINDOW_MS
    );

    if (timestamps.length >= limit) {
      this.attemptWindows.set(key, timestamps);
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
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
