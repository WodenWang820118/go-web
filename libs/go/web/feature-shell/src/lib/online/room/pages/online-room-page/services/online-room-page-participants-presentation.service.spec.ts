import { TestBed } from '@angular/core/testing';
import {
  createParticipantSummary,
  createRoomSnapshot,
} from '@gx/go/contracts/testing';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomPageParticipantsPresentationService } from './online-room-page-participants-presentation.service';

describe('OnlineRoomPageParticipantsPresentationService', () => {
  let service: OnlineRoomPageParticipantsPresentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OnlineRoomPageParticipantsPresentationService,
        {
          provide: GoI18nService,
          useValue: createI18n(),
        },
      ],
    });

    service = TestBed.inject(OnlineRoomPageParticipantsPresentationService);
  });

  it('builds seat cards with occupants and claim state', () => {
    const snapshot = createRoomSnapshot({
      participants: [
        createParticipantSummary({
          participantId: 'host-1',
          displayName: 'Host',
          seat: 'black',
        }),
      ],
      seatState: {
        black: 'host-1',
        white: null,
      },
      nextMatchSettings: {
        mode: 'gomoku',
        boardSize: 15,
      },
    });

    expect(
      service.buildRoomSeatViewModels(snapshot, {
        participantId: 'guest-1',
        viewerSeat: null,
        canChangeSeats: true,
      }),
    ).toEqual([
      expect.objectContaining({
        color: 'black',
        occupant: expect.objectContaining({ displayName: 'Host' }),
        canClaim: false,
        isViewerSeat: false,
      }),
      expect.objectContaining({
        color: 'white',
        occupant: null,
        canClaim: true,
        isViewerSeat: false,
      }),
    ]);
  });

  it('does not make Go seats claimable because colors are assigned by nigiri', () => {
    const snapshot = createRoomSnapshot({
      participants: [
        createParticipantSummary({
          participantId: 'host-1',
          displayName: 'Host',
          seat: null,
        }),
        createParticipantSummary({
          participantId: 'guest-1',
          displayName: 'Guest',
          isHost: false,
          seat: null,
        }),
      ],
      seatState: {
        black: null,
        white: null,
      },
      nextMatchSettings: {
        mode: 'go',
        boardSize: 19,
      },
    });

    expect(
      service.buildRoomSeatViewModels(snapshot, {
        participantId: 'guest-1',
        viewerSeat: null,
        canChangeSeats: true,
      }),
    ).toEqual([
      expect.objectContaining({ color: 'black', canClaim: false }),
      expect.objectContaining({ color: 'white', canClaim: false }),
    ]);
  });

  it('returns no seat cards when no room snapshot is available', () => {
    expect(
      service.buildRoomSeatViewModels(null, {
        participantId: 'guest-1',
        viewerSeat: null,
        canChangeSeats: true,
      }),
    ).toEqual([]);
  });

  it('does not make open seats claimable for anonymous viewers', () => {
    const snapshot = createRoomSnapshot({
      participants: [],
      seatState: {
        black: null,
        white: null,
      },
    });

    expect(
      service.buildRoomSeatViewModels(snapshot, {
        participantId: null,
        viewerSeat: null,
        canChangeSeats: true,
      }),
    ).toEqual([
      expect.objectContaining({ color: 'black', canClaim: false }),
      expect.objectContaining({ color: 'white', canClaim: false }),
    ]);
  });

  it('does not make seats claimable when seat changes are disabled', () => {
    const snapshot = createRoomSnapshot({
      participants: [],
      seatState: {
        black: null,
        white: null,
      },
    });

    expect(
      service.buildRoomSeatViewModels(snapshot, {
        participantId: 'guest-1',
        viewerSeat: 'white',
        canChangeSeats: false,
      }),
    ).toEqual([
      expect.objectContaining({
        color: 'black',
        canClaim: false,
        isViewerSeat: false,
      }),
      expect.objectContaining({
        color: 'white',
        canClaim: false,
        isViewerSeat: true,
      }),
    ]);
  });

  it('returns no nigiri view when nigiri has not started', () => {
    expect(
      service.buildRoomNigiriViewModel({
        nigiri: null,
        participants: [],
        viewerSeat: 'black',
        realtimeConnected: true,
      }),
    ).toBeNull();
  });

  it('builds a pending nigiri view for the guessing player', () => {
    expect(
      service.buildRoomNigiriViewModel({
        nigiri: {
          status: 'pending',
          commitment: 'abc123',
          guesser: 'white',
        },
        participants: [
          createParticipantSummary({
            displayName: 'Guest',
            seat: 'white',
          }),
        ],
        viewerSeat: 'white',
        realtimeConnected: true,
      }),
    ).toMatchObject({
      status: 'pending',
      description: 'pending Guest',
      commitment: 'abc123',
      canGuess: true,
    });
  });

  it('returns no nigiri view after nigiri resolves', () => {
    expect(
      service.buildRoomNigiriViewModel({
        nigiri: {
          status: 'resolved',
          commitment: 'abc123',
          guesser: 'white',
          guess: 'odd',
          parity: 'odd',
          nonce: 'nonce',
          assignedBlack: 'white',
        },
        participants: [
          createParticipantSummary({
            displayName: 'Guest',
            seat: 'black',
          }),
        ],
        viewerSeat: 'white',
        realtimeConnected: true,
      }),
    ).toBeNull();
  });

  it('uses player labels when pending nigiri participants are unavailable', () => {
    expect(
      service.buildRoomNigiriViewModel({
        nigiri: {
          status: 'pending',
          commitment: 'abc123',
          guesser: 'white',
        },
        participants: [],
        viewerSeat: null,
        realtimeConnected: true,
      }),
    ).toMatchObject({
      status: 'pending',
      description: 'pending Player white',
      canGuess: false,
    });
  });

  it('finds the viewer rematch seat and builds rematch statuses', () => {
    const rematch = {
      participants: {
        black: 'host-1',
        white: 'guest-1',
      },
      responses: {
        black: 'accepted',
        white: 'pending',
      },
    } as const;
    const participants = [
      createParticipantSummary({
        participantId: 'host-1',
        displayName: 'Host',
      }),
      createParticipantSummary({
        participantId: 'guest-1',
        displayName: 'Guest',
      }),
    ];

    expect(service.findRoomRematchViewerSeat('guest-1', rematch)).toBe('white');
    expect(
      service.findRoomRematchViewerSeat('spectator-1', rematch),
    ).toBeNull();
    expect(
      service.buildRoomRematchStatuses(participants, rematch, 'guest-1'),
    ).toEqual([
      {
        color: 'black',
        name: 'Host',
        response: 'accepted',
        isViewer: false,
      },
      {
        color: 'white',
        name: 'Guest',
        response: 'pending',
        isViewer: true,
      },
    ]);
  });

  it('returns no rematch statuses when no rematch is active', () => {
    expect(
      service.buildRoomRematchStatuses(
        [createParticipantSummary({ participantId: 'host-1' })],
        null,
        'host-1',
      ),
    ).toEqual([]);
  });

  it('uses player labels for missing rematch participants', () => {
    const rematch = {
      participants: {
        black: 'host-1',
        white: 'guest-1',
      },
      responses: {
        black: 'pending',
        white: 'accepted',
      },
    } as const;

    expect(service.buildRoomRematchStatuses([], rematch, null)).toEqual([
      {
        color: 'black',
        name: 'Player black',
        response: 'pending',
        isViewer: false,
      },
      {
        color: 'white',
        name: 'Player white',
        response: 'accepted',
        isViewer: false,
      },
    ]);
  });
});

function createI18n(): Pick<GoI18nService, 'playerLabel' | 't'> {
  return {
    playerLabel: (color) => `Player ${color}`,
    t: (key, params) => {
      const player = params?.player ? ` ${String(params.player)}` : '';

      switch (key) {
        case 'room.nigiri.pending.description':
          return `pending${player}`;
        case 'room.nigiri.resolved.description':
          return `resolved${player}`;
        case 'room.nigiri.resolved.assigned_black':
          return `assigned${player}`;
        default:
          return key;
      }
    },
  };
}
