import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createMessage } from '@gx/go/domain';
import { ParticipantSummary } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';
import { vi } from 'vitest';
import { OnlineRoomRosterPanelComponent } from './online-room-roster-panel.component';

describe('OnlineRoomRosterPanelComponent', () => {
  let fixture: ComponentFixture<OnlineRoomRosterPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnlineRoomRosterPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OnlineRoomRosterPanelComponent);
    fixture.componentRef.setInput('participants', participants);
    fixture.componentRef.setInput('seats', [
      {
        color: 'black',
        occupant: participants[0],
        canClaim: false,
        isViewerSeat: true,
      },
      {
        color: 'white',
        occupant: null,
        canClaim: true,
        isViewerSeat: false,
      },
    ]);
    fixture.componentRef.setInput('isHost', true);
    fixture.componentRef.setInput('realtimeConnected', true);
    fixture.componentRef.setInput('canChangeSeats', true);
    fixture.componentRef.setInput('match', null);
    fixture.componentRef.setInput('canPass', false);
    fixture.componentRef.setInput('canResign', false);
    fixture.componentRef.setInput('canFinalizeScoring', false);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders seats and participant controls without embedding the move log', () => {
    const root = fixture.nativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(root.querySelector('[data-testid="room-roster-panel"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="room-move-log-panel"]')).toBeNull();
    expect(root.querySelector('[data-testid="claim-white"]')).not.toBeNull();
    expect(root.textContent).toContain(i18n.t('common.role.host'));
    expect(root.textContent).toContain(i18n.t('common.status.offline'));
    expect(root.textContent).toContain(i18n.t('common.status.muted'));
  });

  it('emits claim actions for open seats', () => {
    const emit = vi.spyOn(fixture.componentInstance.claimSeatRequested, 'emit');
    const button = fixture.nativeElement.querySelector(
      '[data-testid="claim-white"]'
    ) as HTMLButtonElement;

    button.click();

    expect(emit).toHaveBeenCalledWith('white');
  });

  it('emits release actions for the viewer seat', () => {
    const emit = vi.spyOn(fixture.componentInstance.releaseSeatRequested, 'emit');
    const button = fixture.nativeElement.querySelector(
      '[data-testid="release-black"]'
    ) as HTMLButtonElement;

    button.click();

    expect(emit).toHaveBeenCalled();
  });

  it('disables seat actions when realtime is unavailable', async () => {
    fixture.componentRef.setInput('realtimeConnected', false);
    fixture.detectChanges();
    await fixture.whenStable();

    const claim = fixture.nativeElement.querySelector(
      '[data-testid="claim-white"]'
    ) as HTMLButtonElement;
    const release = fixture.nativeElement.querySelector(
      '[data-testid="release-black"]'
    ) as HTMLButtonElement;

    expect(claim.disabled).toBe(true);
    expect(release.disabled).toBe(true);
  });

  it('emits match action events while a live match is running', async () => {
    fixture.componentRef.setInput('match', {
      settings: {
        mode: 'gomoku',
        boardSize: 15,
        komi: 0,
        players: {
          black: 'Host',
          white: 'Guest',
        },
      },
      state: {
        mode: 'gomoku',
        boardSize: 15,
        board: Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null)),
        phase: 'playing',
        nextPlayer: 'black',
        captures: {
          black: 0,
          white: 0,
        },
        moveHistory: [],
        previousBoardHashes: [],
        result: null,
        lastMove: null,
        consecutivePasses: 0,
        winnerLine: [],
        message: createMessage('game.state.next_turn', {
          player: createMessage('common.player.black'),
        }),
        scoring: null,
      },
      startedAt: '2026-03-20T00:05:00.000Z',
    });
    fixture.componentRef.setInput('canPass', true);
    fixture.componentRef.setInput('canResign', true);
    fixture.componentRef.setInput('canFinalizeScoring', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const i18n = TestBed.inject(GoI18nService);
    const passEmit = vi.spyOn(fixture.componentInstance.passRequested, 'emit');
    const resignEmit = vi.spyOn(fixture.componentInstance.resignRequested, 'emit');
    const finalizeEmit = vi.spyOn(fixture.componentInstance.finalizeScoringRequested, 'emit');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

    buttons.find(button => button.textContent?.includes(i18n.t('common.move.pass')))?.click();
    buttons.find(button => button.textContent?.includes(i18n.t('common.move.resign')))?.click();
    buttons
      .find(button => button.textContent?.includes(i18n.t('room.participants.finalize_score')))
      ?.click();

    expect(passEmit).toHaveBeenCalled();
    expect(resignEmit).toHaveBeenCalled();
    expect(finalizeEmit).toHaveBeenCalled();
  });
});

const participants: ParticipantSummary[] = [
  {
    participantId: 'host-1',
    displayName: 'Host',
    seat: 'black',
    isHost: true,
    online: true,
    muted: false,
    joinedAt: '2026-03-20T00:00:00.000Z',
  },
  {
    participantId: 'guest-1',
    displayName: 'Guest',
    seat: null,
    isHost: false,
    online: false,
    muted: true,
    joinedAt: '2026-03-20T00:01:00.000Z',
  },
];
