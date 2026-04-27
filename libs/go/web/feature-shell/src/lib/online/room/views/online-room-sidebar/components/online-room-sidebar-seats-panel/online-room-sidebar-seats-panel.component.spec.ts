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
            t: (key: string, params?: Record<string, number>) =>
              params?.['count'] === undefined
                ? key
                : `${key}:${params['count']}`,
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

    expect(root.textContent).toContain('10:00');

    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    expect(root.textContent).toContain('9:59');
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
        mainTimeMs: 600_000,
        periodTimeMs: 30_000,
        periodsRemaining: 5,
      },
      white: {
        mainTimeMs: 600_000,
        periodTimeMs: 30_000,
        periodsRemaining: 5,
      },
    },
  },
};
