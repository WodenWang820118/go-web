import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { GameSessionStore } from '@gx/go/state';
import { OnlineLobbyService } from '../online/online-lobby.service';
import { OnlineRoomService } from '../online/online-room.service';
import { goFeatureShellRoutes } from '../go-feature-shell.routes';
import { vi } from 'vitest';

describe('goFeatureShellRoutes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(goFeatureShellRoutes),
        MessageService,
        ConfirmationService,
        {
          provide: OnlineLobbyService,
          useValue: {
            rooms: signal([]),
            loading: signal(false),
            lastError: signal<string | null>(null),
            hasRooms: computed(() => false),
            refresh: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: OnlineRoomService,
          useValue: {
            displayName: signal('Host'),
            creating: signal(false),
            lastError: signal<string | null>(null),
            clearTransientMessages: vi.fn(),
            createRoom: vi.fn(),
          },
        },
      ],
    });
  });

  it('redirects play routes to setup when no session exists', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/play/go');

    expect(router.url).toBe('/setup/go');
  });

  it('allows play routes after a local session is created', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    const store = TestBed.inject(GameSessionStore);

    store.startMatch({
      mode: 'go',
      boardSize: 9,
      komi: 6.5,
      players: {
        black: 'Lee',
        white: 'Cho',
      },
    });

    await harness.navigateByUrl('/play/go');

    expect(router.url).toBe('/play/go');
  });

  it('redirects the retired online create route to the new lobby', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/online/new');

    expect(router.url).toBe('/online');
  });
});
