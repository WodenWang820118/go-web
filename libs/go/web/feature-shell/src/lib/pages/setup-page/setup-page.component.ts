import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NigiriGuess } from '@gx/go/contracts';
import {
  DEFAULT_GO_KOMI,
  GO_AREA_AGREEMENT_RULESET,
  GOMOKU_BOARD_SIZE,
  GO_DIGITAL_NIGIRI_OPENING,
  GO_BOARD_SIZES,
  isGameMode,
  type GoBoardSize,
  type MatchSettings,
  type PlayerColor,
} from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import { map } from 'rxjs';

import { HostedShellHeaderComponent } from '../../online/shared/hosted-shell-header/hosted-shell-header.component';

interface SetupFactViewModel {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

interface LocalNigiriResult {
  guess: NigiriGuess;
  parity: NigiriGuess;
  assignedBlack: 'black' | 'white';
}

@Component({
  selector: 'lib-go-setup-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    HostedShellHeaderComponent,
  ],
  templateUrl: './setup-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPageComponent {
  protected readonly DEFAULT_GO_KOMI = DEFAULT_GO_KOMI;
  protected readonly GOMOKU_BOARD_SIZE = GOMOKU_BOARD_SIZE;

  protected readonly i18n = inject(GoI18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analytics = inject(GoAnalyticsService);
  private readonly store = inject(GameSessionStore);

  protected readonly mode = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('mode')),
      map((mode) => (isGameMode(mode) ? mode : null)),
    ),
    {
      initialValue: null,
    },
  );
  protected readonly meta = computed(() => {
    const mode = this.mode();
    return mode ? this.i18n.gameModeMeta(mode) : null;
  });
  protected readonly boardSizeOptions = GO_BOARD_SIZES.map((size) => ({
    label: `${size} x ${size}`,
    value: size,
  }));
  protected readonly form = new FormGroup({
    blackName: new FormControl(this.i18n.playerLabel('black'), {
      nonNullable: true,
    }),
    whiteName: new FormControl(this.i18n.playerLabel('white'), {
      nonNullable: true,
    }),
    boardSize: new FormControl<GoBoardSize>(19, { nonNullable: true }),
  });
  private readonly blackName = toSignal(
    this.form.controls.blackName.valueChanges,
    {
      initialValue: this.form.controls.blackName.value,
    },
  );
  private readonly whiteName = toSignal(
    this.form.controls.whiteName.valueChanges,
    {
      initialValue: this.form.controls.whiteName.value,
    },
  );
  private readonly selectedBoardSize = toSignal(
    this.form.controls.boardSize.valueChanges,
    {
      initialValue: this.form.controls.boardSize.value,
    },
  );
  protected readonly boardSizeSummary = computed(() => {
    const size = this.selectedBoardSize();
    return `${size} x ${size}`;
  });
  protected readonly nigiriResult = signal<LocalNigiriResult | null>(null);
  protected readonly canResolveNigiri = computed(
    () => this.mode() === 'go' && this.nigiriResult() === null,
  );
  protected readonly canStartMatch = computed(
    () => this.mode() !== 'go' || this.nigiriResult() !== null,
  );
  protected readonly nigiriResultText = computed(() => {
    const result = this.nigiriResult();

    if (!result) {
      return this.i18n.t('setup.nigiri.pending');
    }

    return this.i18n.t('setup.nigiri.result', {
      guess: this.i18n.t(`room.nigiri.guess.${result.guess}`),
      parity: this.i18n.t(`room.nigiri.guess.${result.parity}`),
      player: this.i18n.playerLabel(result.assignedBlack),
    });
  });
  protected readonly actionHint = computed(() => {
    const mode = this.mode();

    if (mode === 'go') {
      return `${this.boardSizeSummary()} · ${this.i18n.t('setup.go_komi_note', {
        komi: DEFAULT_GO_KOMI,
      })}`;
    }

    if (mode === 'gomoku') {
      return this.i18n.t('setup.gomoku_fixed_board', {
        size: GOMOKU_BOARD_SIZE,
      });
    }

    return '';
  });
  protected readonly setupFacts = computed<SetupFactViewModel[]>(() => {
    const mode = this.mode();

    if (!mode) {
      return [];
    }

    const facts: SetupFactViewModel[] = [
      {
        id: 'black',
        label: this.i18n.t('setup.black_player'),
        value: sanitizeName(this.blackName(), this.i18n.playerLabel('black')),
      },
      {
        id: 'white',
        label: this.i18n.t('setup.white_player'),
        value: sanitizeName(this.whiteName(), this.i18n.playerLabel('white')),
      },
    ];

    if (mode === 'go') {
      facts.push({
        id: 'board',
        label: this.i18n.t('setup.board_size'),
        value: this.boardSizeSummary(),
        hint: this.i18n.t('setup.go_komi_note', {
          komi: DEFAULT_GO_KOMI,
        }),
      });

      return facts;
    }

    facts.push({
      id: 'board',
      label: this.i18n.t('setup.board_size'),
      value: `${GOMOKU_BOARD_SIZE} x ${GOMOKU_BOARD_SIZE}`,
      hint: this.i18n.t('setup.gomoku_fixed_board', {
        size: GOMOKU_BOARD_SIZE,
      }),
    });

    return facts;
  });

  protected async startMatch(): Promise<void> {
    const mode = this.mode();

    if (!mode) {
      await this.router.navigate(['/']);
      return;
    }

    if (mode === 'go' && !this.nigiriResult()) {
      return;
    }

    const settings: MatchSettings = {
      mode,
      boardSize:
        mode === 'go' ? this.form.controls.boardSize.value : GOMOKU_BOARD_SIZE,
      komi: mode === 'go' ? DEFAULT_GO_KOMI : 0,
      players: {
        black: sanitizeName(
          this.form.controls.blackName.value,
          this.i18n.playerLabel('black'),
        ),
        white: sanitizeName(
          this.form.controls.whiteName.value,
          this.i18n.playerLabel('white'),
        ),
      },
      ...(mode === 'go'
        ? {
            ruleset: GO_AREA_AGREEMENT_RULESET,
            openingRule: GO_DIGITAL_NIGIRI_OPENING,
            timeControl: null,
          }
        : {}),
    };

    this.store.startMatch(settings);
    this.analytics.track({
      board_size: settings.boardSize,
      event: 'gx_match_start',
      game_mode: settings.mode,
      play_context: 'local',
      start_source: 'setup',
    });

    await this.router.navigate(['/play', mode]);
  }

  protected resolveNigiri(guess: NigiriGuess): void {
    if (!this.canResolveNigiri()) {
      return;
    }

    const parity: NigiriGuess = Math.random() < 0.5 ? 'odd' : 'even';
    const assignedBlack: PlayerColor = guess === parity ? 'white' : 'black';

    if (assignedBlack === 'white') {
      const blackName = this.form.controls.blackName.value;
      const whiteName = this.form.controls.whiteName.value;

      this.form.controls.blackName.setValue(whiteName);
      this.form.controls.whiteName.setValue(blackName);
    }

    this.nigiriResult.set({
      guess,
      parity,
      assignedBlack,
    });
  }
}

function sanitizeName(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}
