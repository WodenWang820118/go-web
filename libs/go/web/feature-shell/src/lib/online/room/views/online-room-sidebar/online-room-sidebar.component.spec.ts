import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
  ChatMessage,
  HostedMatchSnapshot,
  ParticipantSummary,
} from '@gx/go/contracts';
import { createMessage } from '@gx/go/domain';
import { vi } from 'vitest';
import { OnlineRoomSidebarComponent } from './online-room-sidebar.component';

describe('OnlineRoomSidebarComponent', () => {
  let fixture: ComponentFixture<OnlineRoomSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnlineRoomSidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OnlineRoomSidebarComponent);
    fixture.componentRef.setInput(
      'joinForm',
      new FormGroup({
        displayName: new FormControl('Host', {
          nonNullable: true,
        }),
      }),
    );
    fixture.componentRef.setInput(
      'chatForm',
      new FormGroup({
        message: new FormControl('Hello room', {
          nonNullable: true,
        }),
      }),
    );
    fixture.componentRef.setInput('participantId', 'host-1');
    fixture.componentRef.setInput('joining', false);
    fixture.componentRef.setInput('isMuted', false);
    fixture.componentRef.setInput('realtimeConnected', true);
    fixture.componentRef.setInput('canChangeSeats', true);
    fixture.componentRef.setInput('joinCardTitle', 'Join the room');
    fixture.componentRef.setInput(
      'joinCardDescription',
      'Pick a display name.',
    );
    fixture.componentRef.setInput('seats', seats);
    fixture.componentRef.setInput('participants', participants);
    fixture.componentRef.setInput('match', liveMatch);
    fixture.componentRef.setInput('messages', chatMessages);
    fixture.componentRef.setInput('helperText', 'Send a message to the room.');
    fixture.componentRef.setInput('roomMessages', [
      {
        tone: 'warning',
        message: 'Realtime is reconnecting.',
        testId: 'room-sidebar-message-warning',
      },
    ]);
    fixture.componentRef.setInput('canPass', true);
    fixture.componentRef.setInput('canResign', true);
    fixture.componentRef.setInput('canConfirmScoring', false);
    fixture.componentRef.setInput('canDisputeScoring', false);
    fixture.componentRef.setInput('showRematch', true);
    fixture.componentRef.setInput('canRespondToRematch', true);
    fixture.componentRef.setInput('rematchStatuses', [
      {
        color: 'black',
        name: 'Host',
        response: 'accepted',
        isViewer: true,
      },
      {
        color: 'white',
        name: 'Guest',
        response: 'pending',
        isViewer: false,
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the composed sidebar panels', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="room-sidebar"]')).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-message-warning"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-players"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-rematch"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-testid="room-sidebar-chat"]'),
    ).not.toBeNull();
    expect(
      root.querySelectorAll('[data-testid="room-sidebar-chat-metric"]'),
    ).toHaveLength(2);
    expect(
      root.querySelector('[data-testid="room-sidebar-actions"]'),
    ).not.toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).toBeNull();
  });

  it('shows the join panel when the viewer has not joined yet', async () => {
    fixture.componentRef.setInput('participantId', null);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;

    expect(
      root.querySelector('[data-testid="room-sidebar-identity"]'),
    ).not.toBeNull();
    expect(root.querySelector('[data-testid="join-room-form"]')).not.toBeNull();
  });

  it('bubbles seat, rematch, and match action events through the sidebar', () => {
    const claimEmit = vi.spyOn(
      fixture.componentInstance.claimSeatRequested,
      'emit',
    );
    const releaseEmit = vi.spyOn(
      fixture.componentInstance.releaseSeatRequested,
      'emit',
    );
    const acceptEmit = vi.spyOn(
      fixture.componentInstance.acceptRematchRequested,
      'emit',
    );
    const declineEmit = vi.spyOn(
      fixture.componentInstance.declineRematchRequested,
      'emit',
    );
    const passEmit = vi.spyOn(fixture.componentInstance.passRequested, 'emit');
    const resignEmit = vi.spyOn(
      fixture.componentInstance.resignRequested,
      'emit',
    );
    const backEmit = vi.spyOn(
      fixture.componentInstance.backToLobbyRequested,
      'emit',
    );
    const root = fixture.nativeElement as HTMLElement;

    (
      root.querySelector('[data-testid="claim-white"]') as HTMLButtonElement
    ).click();
    (
      root.querySelector('[data-testid="release-black"]') as HTMLButtonElement
    ).click();
    (
      root.querySelectorAll(
        '[data-testid="room-sidebar-rematch"] button',
      )[0] as HTMLButtonElement
    ).click();
    (
      root.querySelectorAll(
        '[data-testid="room-sidebar-rematch"] button',
      )[1] as HTMLButtonElement
    ).click();

    const actionButtons = Array.from(
      root.querySelectorAll('[data-testid="room-sidebar-actions"] button'),
    ) as HTMLButtonElement[];
    actionButtons[0]?.click();
    actionButtons[1]?.click();
    actionButtons[2]?.click();

    expect(claimEmit).toHaveBeenCalledWith('white');
    expect(releaseEmit).toHaveBeenCalled();
    expect(acceptEmit).toHaveBeenCalled();
    expect(declineEmit).toHaveBeenCalled();
    expect(passEmit).toHaveBeenCalled();
    expect(resignEmit).toHaveBeenCalled();
    expect(backEmit).toHaveBeenCalled();
  });

  it('bubbles hosted scoring agreement actions', async () => {
    const confirmEmit = vi.spyOn(
      fixture.componentInstance.confirmScoringRequested,
      'emit',
    );
    const disputeEmit = vi.spyOn(
      fixture.componentInstance.disputeScoringRequested,
      'emit',
    );

    fixture.componentRef.setInput('match', {
      ...liveMatch,
      state: {
        ...liveMatch.state,
        phase: 'scoring',
      },
    });
    fixture.componentRef.setInput('canPass', false);
    fixture.componentRef.setInput('canResign', false);
    fixture.componentRef.setInput('canConfirmScoring', true);
    fixture.componentRef.setInput('canDisputeScoring', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const confirmButton = root.querySelector(
      '[data-testid="room-confirm-scoring"]',
    ) as HTMLButtonElement | null;
    const disputeButton = root.querySelector(
      '[data-testid="room-dispute-scoring"]',
    ) as HTMLButtonElement | null;

    expect(confirmButton).not.toBeNull();
    expect(disputeButton).not.toBeNull();

    confirmButton?.click();
    disputeButton?.click();

    expect(confirmEmit).toHaveBeenCalled();
    expect(disputeEmit).toHaveBeenCalled();
  });

  it('renders pending nigiri and bubbles odd/even guesses', async () => {
    const guessEmit = vi.spyOn(
      fixture.componentInstance.nigiriGuessRequested,
      'emit',
    );

    fixture.componentRef.setInput('match', null);
    fixture.componentRef.setInput('nigiri', {
      status: 'pending',
      title: 'Digital nigiri',
      description: 'Guest guesses odd or even.',
      commitmentLabel: 'Commitment',
      commitment: 'commitment',
      canGuess: true,
      oddLabel: 'Odd',
      evenLabel: 'Even',
      resultLabel: null,
      assignedBlackLabel: null,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const oddButton = root.querySelector(
      '[data-testid="room-nigiri-guess-odd"]',
    ) as HTMLButtonElement | null;
    const evenButton = root.querySelector(
      '[data-testid="room-nigiri-guess-even"]',
    ) as HTMLButtonElement | null;

    expect(
      root.querySelector('[data-testid="room-sidebar-nigiri-panel"]'),
    ).not.toBeNull();
    expect(root.textContent).toContain('Guest guesses odd or even.');

    oddButton?.click();
    evenButton?.click();

    expect(guessEmit).toHaveBeenCalledWith('odd');
    expect(guessEmit).toHaveBeenCalledWith('even');
  });

  it('renders resolved nigiri without guess buttons', async () => {
    fixture.componentRef.setInput('match', liveMatch);
    fixture.componentRef.setInput('nigiri', {
      status: 'resolved',
      title: 'Nigiri resolved',
      description: 'Guest takes Black.',
      commitmentLabel: 'Commitment',
      commitment: 'commitment',
      canGuess: false,
      oddLabel: 'Odd',
      evenLabel: 'Even',
      resultLabel: 'Guess: Odd. Hidden stones: Odd.',
      assignedBlackLabel: 'Guest is Black.',
      guess: 'odd',
      parity: 'odd',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;

    expect(
      root.querySelector('[data-testid="room-sidebar-nigiri-panel"]'),
    ).not.toBeNull();
    expect(root.textContent).toContain('Guess: Odd. Hidden stones: Odd.');
    expect(root.textContent).toContain('Guest is Black.');
    expect(
      root.querySelector('[data-testid="room-nigiri-guess-odd"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-testid="room-nigiri-guess-even"]'),
    ).toBeNull();
  });

  it('keeps hosted scoring agreement actions disabled when unavailable', async () => {
    fixture.componentRef.setInput('match', {
      ...liveMatch,
      state: {
        ...liveMatch.state,
        phase: 'scoring',
      },
    });
    fixture.componentRef.setInput('canPass', false);
    fixture.componentRef.setInput('canResign', false);
    fixture.componentRef.setInput('canConfirmScoring', false);
    fixture.componentRef.setInput('canDisputeScoring', false);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const confirmButton = root.querySelector(
      '[data-testid="room-confirm-scoring"]',
    ) as HTMLButtonElement | null;
    const disputeButton = root.querySelector(
      '[data-testid="room-dispute-scoring"]',
    ) as HTMLButtonElement | null;

    expect(confirmButton).not.toBeNull();
    expect(disputeButton).not.toBeNull();
    expect(confirmButton?.disabled).toBe(true);
    expect(disputeButton?.disabled).toBe(true);
  });

  it('renders hosted clock snapshots and keeps seat actions on one line', async () => {
    fixture.componentRef.setInput('match', {
      ...liveMatch,
      clock: {
        config: {
          mainTimeMs: 600_000,
          periodTimeMs: 30_000,
          periods: 5,
        },
        activeColor: 'white',
        lastStartedAt: '2026-03-20T00:05:00.000Z',
        revision: 1,
        players: {
          black: {
            mainTimeMs: 590_000,
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
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const claimButton = root.querySelector(
      '[data-testid="claim-white"]',
    ) as HTMLButtonElement | null;
    const releaseButton = root.querySelector(
      '[data-testid="release-black"]',
    ) as HTMLButtonElement | null;
    const clockLabels = Array.from(root.querySelectorAll('[aria-label]')).map(
      (element) => element.getAttribute('aria-label'),
    );

    expect(root.textContent).toContain('9:50');
    expect(clockLabels.some((label) => label?.includes('9:50'))).toBe(true);
    expect(claimButton?.className).toContain('whitespace-nowrap');
    expect(claimButton?.className).toContain('shrink-0');
    expect(releaseButton?.className).toContain('whitespace-nowrap');
    expect(releaseButton?.className).toContain('shrink-0');
  });

  it('submits chat on Enter but keeps Shift+Enter for multiline drafts', () => {
    const sendEmit = vi.spyOn(fixture.componentInstance.sendRequested, 'emit');
    const input = fixture.nativeElement.querySelector(
      '[data-testid="chat-message-input"]',
    ) as HTMLTextAreaElement;
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    const shiftEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    input.dispatchEvent(enterEvent);
    input.dispatchEvent(shiftEnterEvent);

    expect(sendEmit).toHaveBeenCalledTimes(1);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(shiftEnterEvent.defaultPrevented).toBe(false);
  });

  it('keeps chat stretched and actions anchored to the bottom of the sidebar', () => {
    const root = fixture.nativeElement as HTMLElement;
    const chatHost = root.querySelector(
      'lib-go-online-room-sidebar-chat-panel',
    ) as HTMLElement;
    const actionsHost = root.querySelector(
      'lib-go-online-room-sidebar-actions',
    ) as HTMLElement;
    const chatList = root.querySelector(
      '[data-testid="room-sidebar-chat-list"]',
    ) as HTMLElement;

    expect(chatHost.className).toContain('flex-1');
    expect(chatHost.className).toContain('min-h-0');
    expect(actionsHost.className).toContain('mt-auto');
    expect(chatList.className).toContain('flex-1');
    expect(chatList.className).not.toContain('max-h-[clamp');
  });

  it('scrolls the chat feed to the newest message when messages are appended', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const chatList = root.querySelector(
      '[data-testid="room-sidebar-chat-list"]',
    ) as HTMLElement;

    Object.defineProperty(chatList, 'scrollHeight', {
      configurable: true,
      value: 320,
    });
    chatList.scrollTop = 0;

    fixture.componentRef.setInput('messages', [
      ...chatMessages,
      {
        id: 'chat-2',
        participantId: 'guest-1',
        displayName: 'Guest',
        message: 'Newest message',
        sentAt: '2026-03-20T00:06:00.000Z',
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(chatList.scrollTop).toBe(320);
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
    muted: false,
    joinedAt: '2026-03-20T00:01:00.000Z',
  },
];

const seats = [
  {
    color: 'black' as const,
    occupant: participants[0],
    canClaim: false,
    isViewerSeat: true,
  },
  {
    color: 'white' as const,
    occupant: null,
    canClaim: true,
    isViewerSeat: false,
  },
];

const chatMessages: ChatMessage[] = [
  {
    id: 'chat-1',
    participantId: 'host-1',
    displayName: 'Host',
    message: 'Hello room',
    sentAt: '2026-03-20T00:05:00.000Z',
  },
];

const liveMatch: HostedMatchSnapshot = {
  settings: {
    mode: 'go',
    boardSize: 19,
    komi: 6.5,
    players: {
      black: 'Host',
      white: 'Guest',
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
      black: 2,
      white: 1,
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
};
