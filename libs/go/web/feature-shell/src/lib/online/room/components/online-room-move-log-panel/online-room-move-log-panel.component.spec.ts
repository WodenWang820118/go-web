import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoveRecord } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomMoveLogPanelComponent } from './online-room-move-log-panel.component';

describe('OnlineRoomMoveLogPanelComponent', () => {
  let fixture: ComponentFixture<OnlineRoomMoveLogPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnlineRoomMoveLogPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OnlineRoomMoveLogPanelComponent);
    fixture.componentRef.setInput('moveHistory', [createMoveRecord()]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders a compact move log card with move metadata', () => {
    const root = fixture.nativeElement as HTMLElement;
    const i18n = TestBed.inject(GoI18nService);

    expect(root.querySelector('[data-testid="room-move-log-panel"]')).not.toBeNull();
    expect(root.textContent).toContain('1. D16');
    expect(root.textContent).toContain(i18n.playerLabel('black'));
  });
});

function createMoveRecord(): MoveRecord {
  return {
    id: 'move-1',
    moveNumber: 1,
    player: 'black',
    command: {
      type: 'place',
      point: { x: 3, y: 3 },
    },
    notation: 'D16',
    boardHashAfterMove: 'hash-1',
    phaseAfterMove: 'playing',
    capturedPoints: [],
    capturesAfterMove: {
      black: 0,
      white: 0,
    },
  };
}
