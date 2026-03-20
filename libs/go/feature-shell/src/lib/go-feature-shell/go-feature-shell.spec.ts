import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { GameSessionStore } from '@org/go/state';
import { goFeatureShellRoutes } from '../go-feature-shell.routes';

describe('goFeatureShellRoutes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(goFeatureShellRoutes),
        MessageService,
        ConfirmationService,
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
});
