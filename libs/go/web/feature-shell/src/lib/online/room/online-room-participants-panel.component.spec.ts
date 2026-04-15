import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { ParticipantSummary } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomParticipantsPanelComponent } from './online-room-participants-panel.component';

describe('OnlineRoomParticipantsPanelComponent', () => {
  let fixture: ComponentFixture<OnlineRoomParticipantsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnlineRoomParticipantsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OnlineRoomParticipantsPanelComponent);
    fixture.componentRef.setInput(
      'joinForm',
      new FormGroup({
        displayName: new FormControl('', {
          nonNullable: true,
        }),
      })
    );
    fixture.componentRef.setInput(
      'settingsForm',
      new FormGroup({
        mode: new FormControl('go', {
          nonNullable: true,
        }),
        boardSize: new FormControl(19, {
          nonNullable: true,
        }),
      })
    );
    fixture.componentRef.setInput('boardSizeOptions', [9, 13, 19]);
    fixture.componentRef.setInput('participantId', 'host-1');
    fixture.componentRef.setInput('joining', false);
    fixture.componentRef.setInput('viewer', participants[0]);
    fixture.componentRef.setInput('viewerSeat', 'black');
    fixture.componentRef.setInput('isHost', true);
    fixture.componentRef.setInput('realtimeConnected', true);
    fixture.componentRef.setInput('canChangeSeats', true);
    fixture.componentRef.setInput('canEditNextMatchSettings', true);
    fixture.componentRef.setInput('settingsLockedMessage', null);
    fixture.componentRef.setInput('canPass', false);
    fixture.componentRef.setInput('canResign', false);
    fixture.componentRef.setInput('canFinalizeScoring', false);
    fixture.componentRef.setInput('joinCardTitle', 'Join room');
    fixture.componentRef.setInput('joinCardDescription', 'Join the room');
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
    fixture.componentRef.setInput('match', null);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders compact participant chips without embedding the move log', () => {
    const root = fixture.nativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(root.querySelector('[data-testid="room-participants-panel"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="room-move-log-panel"]')).toBeNull();
    expect(root.querySelector('[data-testid="room-next-match-form"]')).not.toBeNull();
    expect(root.textContent).toContain(i18n.t('common.role.host'));
    expect(root.textContent).toContain(i18n.t('common.status.offline'));
    expect(root.textContent).toContain(i18n.t('common.status.muted'));
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
