import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HostedMatchSnapshot, ParticipantSummary } from '@gx/go/contracts';
import { createMessage } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnlineRoomSeatViewModel } from '../../../../contracts/online-room-view.contracts';
import { OnlineRoomSidebarSeatsPanelComponent } from './online-room-sidebar-seats-panel.component';

describe('OnlineRoomSidebarSeatsPanelComponent', () => {
  let fixture: ComponentFixture<OnlineRoomSidebarSeatsPanelComponent>;
  let destroyed: boolean;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));

    await TestBed.configureTestingModule({
      imports: [OnlineRoomSidebarSeatsPanelComponent],
      providers: [
        {
          provide: GoI18nService,
          useValue: {
            t: (key: string, params?: Record<string, number | string>) =>
              params
                ? `${key}:${Object.entries(params)
                    .map(([paramKey, value]) => `${paramKey}=${String(value)}`)
                    .join(',')}`
                : key,
            playerLabel: (color: string) => color,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnlineRoomSidebarSeatsPanelComponent);
    destroyed = false;
    fixture.componentRef.setInput('seats', seats);
    fixture.componentRef.setInput('match', null);
    fixture.componentRef.setInput('canChangeSeats', true);
    fixture.componentRef.setInput('realtimeConnected', true);
  });

  afterEach(() => {
    if (!destroyed) {
      fixture.destroy();
    }

    vi.useRealTimers();
  });

  it('starts the clock ticker only while a hosted clock is playing', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    fixture.detectChanges();

    expect(setIntervalSpy).not.toHaveBeenCalled();

    fixture.componentRef.setInput('match', playingMatch);
    fixture.detectChanges();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

    fixture.detectChanges();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('does not start the clock ticker for untimed playing matches', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    fixture.componentRef.setInput('match', {
      ...playingMatch,
      clock: null,
    });
    fixture.detectChanges();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('updates the active clock display as the ticker fires', () => {
    fixture.componentRef.setInput('match', playingMatch);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const blackSeat = root.querySelector('[data-testid="room-player-black"]');
    const whiteSeat = root.querySelector('[data-testid="room-player-white"]');

    expect(blackSeat?.textContent).toContain('10:00');
    expect(whiteSeat?.textContent).toContain('10:00');

    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    expect(blackSeat?.textContent).toContain('9:59');
    expect(whiteSeat?.textContent).toContain('10:00');
  });

  it('formats hosted clock displays for every supported time system', () => {
    const cases: Array<{
      clock: NonNullable<HostedMatchSnapshot['clock']>;
      expectedAriaLabel: string;
    }> = [
      {
        clock: {
          config: {
            type: 'byo-yomi',
            mainTimeMs: 600_000,
            periodTimeMs: 30_000,
            periods: 5,
          },
          activeColor: 'black',
          lastStartedAt: '2026-03-20T00:00:00.000Z',
          revision: 1,
          players: {
            black: {
              type: 'byo-yomi',
              mainTimeMs: 0,
              periodTimeMs: 10_000,
              periodsRemaining: 2,
            },
            white: {
              type: 'byo-yomi',
              mainTimeMs: 600_000,
              periodTimeMs: 30_000,
              periodsRemaining: 5,
            },
          },
        },
        expectedAriaLabel: 'room.clock.byo_yomi_periods:count=2 0:40',
      },
      {
        clock: {
          config: {
            type: 'fischer',
            mainTimeMs: 300_000,
            incrementMs: 20_000,
          },
          activeColor: 'black',
          lastStartedAt: '2026-03-20T00:00:00.000Z',
          revision: 1,
          players: {
            black: {
              type: 'fischer',
              remainingMs: 65_000,
            },
            white: {
              type: 'fischer',
              remainingMs: 300_000,
            },
          },
        },
        expectedAriaLabel: 'room.clock.fischer_increment:increment=0:20 1:05',
      },
      {
        clock: {
          config: {
            type: 'canadian',
            mainTimeMs: 600_000,
            periodTimeMs: 300_000,
            stonesPerPeriod: 20,
          },
          activeColor: 'black',
          lastStartedAt: '2026-03-20T00:00:00.000Z',
          revision: 1,
          players: {
            black: {
              type: 'canadian',
              mainTimeMs: 0,
              periodTimeMs: 120_000,
              stonesRemaining: 5,
            },
            white: {
              type: 'canadian',
              mainTimeMs: 600_000,
              periodTimeMs: 300_000,
              stonesRemaining: 20,
            },
          },
        },
        expectedAriaLabel: 'room.clock.canadian_stones:count=5 2:00',
      },
      {
        clock: {
          config: {
            type: 'absolute',
            mainTimeMs: 600_000,
          },
          activeColor: 'black',
          lastStartedAt: '2026-03-20T00:00:00.000Z',
          revision: 1,
          players: {
            black: {
              type: 'absolute',
              remainingMs: 45_000,
            },
            white: {
              type: 'absolute',
              remainingMs: 600_000,
            },
          },
        },
        expectedAriaLabel: 'room.clock.absolute 0:45',
      },
    ];

    for (const testCase of cases) {
      fixture.componentRef.setInput('match', {
        ...playingMatch,
        clock: testCase.clock,
      });
      fixture.detectChanges();

      const ariaLabels = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label]'),
      ).map((element) => element.getAttribute('aria-label'));

      expect(ariaLabels).toContain(testCase.expectedAriaLabel);
    }
  });

  it('stops the clock ticker when play stops and on destroy', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    fixture.componentRef.setInput('match', playingMatch);
    fixture.detectChanges();

    fixture.componentRef.setInput('match', {
      ...playingMatch,
      state: {
        ...playingMatch.state,
        phase: 'scoring',
      },
    });
    fixture.detectChanges();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('match', playingMatch);
    fixture.detectChanges();
    fixture.destroy();
    destroyed = true;

    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
  });

  it('stops the clock ticker when the match is cleared', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    fixture.componentRef.setInput('match', playingMatch);
    fixture.detectChanges();

    fixture.componentRef.setInput('match', null);
    fixture.detectChanges();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});

const participants: ParticipantSummary[] = [
  {
    participantId: 'black-1',
    displayName: 'Black',
    seat: 'black',
    isHost: true,
    online: true,
    muted: false,
    joinedAt: '2026-03-20T00:00:00.000Z',
  },
  {
    participantId: 'white-1',
    displayName: 'White',
    seat: 'white',
    isHost: false,
    online: true,
    muted: false,
    joinedAt: '2026-03-20T00:01:00.000Z',
  },
];

const seats: readonly OnlineRoomSeatViewModel[] = [
  {
    color: 'black',
    occupant: participants[0],
    canClaim: false,
    isViewerSeat: true,
  },
  {
    color: 'white',
    occupant: participants[1],
    canClaim: false,
    isViewerSeat: false,
  },
];

const playingMatch: HostedMatchSnapshot = {
  settings: {
    mode: 'go',
    boardSize: 19,
    komi: 6.5,
    players: {
      black: 'Black',
      white: 'White',
    },
  },
  state: {
    mode: 'go',
    boardSize: 19,
    board: Array.from({ length: 19 }, () =>
      Array.from({ length: 19 }, () => null),
    ),
    phase: 'playing',
    nextPlayer: 'black',
    captures: {
      black: 0,
      white: 0,
    },
    moveHistory: [],
    previousBoardHashes: [],
    lastMove: null,
    consecutivePasses: 0,
    winnerLine: [],
    message: createMessage('game.state.next_turn', {
      player: createMessage('common.player.black'),
    }),
    scoring: null,
    result: null,
  },
  startedAt: '2026-03-20T00:00:00.000Z',
  clock: {
    config: {
      type: 'byo-yomi',
      mainTimeMs: 600_000,
      periodTimeMs: 30_000,
      periods: 5,
    },
    activeColor: 'black',
    lastStartedAt: '2026-03-20T00:00:00.000Z',
    revision: 1,
    players: {
      black: {
        type: 'byo-yomi',
        mainTimeMs: 600_000,
        periodTimeMs: 30_000,
        periodsRemaining: 5,
      },
      white: {
        type: 'byo-yomi',
        mainTimeMs: 600_000,
        periodTimeMs: 30_000,
        periodsRemaining: 5,
      },
    },
  },
};
