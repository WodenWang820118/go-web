import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { vi } from 'vitest';
import { OnlineRoomChatPanelComponent } from './online-room-chat-panel.component';

describe('OnlineRoomChatPanelComponent', () => {
  let fixture: ComponentFixture<OnlineRoomChatPanelComponent>;
  let component: OnlineRoomChatPanelComponent;
  let messageInput: HTMLTextAreaElement;

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
    messageInput = fixture.nativeElement.querySelector(
      '[data-testid="chat-message-input"]'
    ) as HTMLTextAreaElement;
  });

  it('submits chat when Enter is pressed without modifiers', () => {
    const emitSpy = vi.spyOn(component.sendRequested, 'emit');
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    messageInput.dispatchEvent(event);

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps Shift+Enter available for multiline chat drafts', () => {
    const emitSpy = vi.spyOn(component.sendRequested, 'emit');
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    messageInput.dispatchEvent(event);

    expect(emitSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('scrolls to the newest chat message when messages are appended', async () => {
    const chatList = fixture.nativeElement.querySelector('.chat-feed') as HTMLElement;

    Object.defineProperty(chatList, 'scrollHeight', {
      configurable: true,
      value: 240,
    });
    chatList.scrollTop = 0;

    fixture.componentRef.setInput('messages', [
      {
        id: 'chat-1',
        participantId: 'host-1',
        displayName: 'Host',
        message: 'Hello room',
        sentAt: '2026-03-20T00:05:00.000Z',
      },
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

    expect(chatList.scrollTop).toBe(240);
  });
});
