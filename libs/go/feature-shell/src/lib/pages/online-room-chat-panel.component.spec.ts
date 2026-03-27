import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { vi } from 'vitest';
import { OnlineRoomChatPanelComponent } from './online-room-chat-panel.component';

describe('OnlineRoomChatPanelComponent', () => {
  let fixture: ComponentFixture<OnlineRoomChatPanelComponent>;
  let component: OnlineRoomChatPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnlineRoomChatPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OnlineRoomChatPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput(
      'chatForm',
      new FormGroup({
        message: new FormControl('Hello room', {
          nonNullable: true,
        }),
      })
    );
    fixture.componentRef.setInput('participantId', 'guest-1');
    fixture.componentRef.setInput('isMuted', false);
    fixture.componentRef.setInput('realtimeConnected', true);
    fixture.componentRef.setInput('messages', []);
    fixture.componentRef.setInput('helperText', 'Spectators and players can chat in real time.');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('submits chat when Enter is pressed without modifiers', () => {
    const emitSpy = vi.spyOn(component.sendRequested, 'emit');
    const preventDefault = vi.fn();

    (component as any).onMessageKeydown({
      key: 'Enter',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isComposing: false,
      preventDefault,
    } as KeyboardEvent);

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('keeps Shift+Enter available for multiline chat drafts', () => {
    const emitSpy = vi.spyOn(component.sendRequested, 'emit');
    const preventDefault = vi.fn();

    (component as any).onMessageKeydown({
      key: 'Enter',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isComposing: false,
      preventDefault,
    } as KeyboardEvent);

    expect(emitSpy).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
