import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DEFAULT_GO_KOMI,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  isGameMode,
  type GoBoardSize,
} from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { GameSessionStore } from '@gx/go/state/session';
import { map } from 'rxjs';

@Component({
  selector: 'lib-go-setup-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    @if (meta()) {
      <section
        class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8"
      >
        <a
          routerLink="/"
          class="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-stone-500 transition hover:text-stone-900"
        >
          <span class="text-lg">&larr;</span>
          {{ i18n.t('setup.back_to_modes') }}
        </a>

        <div class="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section
            class="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white/90 shadow-xl shadow-amber-950/10"
          >
            <div
              class="border-b border-stone-200/80 bg-[linear-gradient(135deg,_rgba(254,249,240,0.98),_rgba(255,255,255,0.92))] px-6 py-6"
            >
              <p
                class="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500"
              >
                {{ i18n.t('setup.match_setup') }}
              </p>
              <h1 class="mt-2 text-3xl font-semibold text-stone-950">
                {{ meta()!.title }}
              </h1>
              <p class="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                {{ meta()!.setupHint }}
              </p>
            </div>

            <form
              class="space-y-6 px-6 py-6"
              data-testid="setup-form"
              [formGroup]="form"
              (ngSubmit)="startMatch()"
            >
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="space-y-2 text-sm font-medium text-stone-700">
                  <span>{{ i18n.t('setup.black_player') }}</span>
                  <input
                    formControlName="blackName"
                    class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:bg-white"
                  />
                </label>

                <label class="space-y-2 text-sm font-medium text-stone-700">
                  <span>{{ i18n.t('setup.white_player') }}</span>
                  <input
                    formControlName="whiteName"
                    class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:bg-white"
                  />
                </label>
              </div>

              @if (mode() === 'go') {
                <div class="space-y-3">
                  <p class="text-sm font-medium text-stone-700">
                    {{ i18n.t('setup.board_size') }}
                  </p>
                  <div class="flex flex-wrap gap-3">
                    @for (option of boardSizeOptions; track option.value) {
                      <button
                        type="button"
                        class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                        [class.border-stone-950]="
                          form.controls.boardSize.value === option.value
                        "
                        [class.bg-stone-950]="
                          form.controls.boardSize.value === option.value
                        "
                        [class.text-stone-50]="
                          form.controls.boardSize.value === option.value
                        "
                        [class.border-stone-200]="
                          form.controls.boardSize.value !== option.value
                        "
                        [class.bg-white]="
                          form.controls.boardSize.value !== option.value
                        "
                        [class.text-stone-700]="
                          form.controls.boardSize.value !== option.value
                        "
                        [class.hover:border-stone-400]="
                          form.controls.boardSize.value !== option.value
                        "
                        (click)="form.controls.boardSize.setValue(option.value)"
                      >
                        {{ option.label }}
                      </button>
                    }
                  </div>
                  <p class="text-sm text-stone-500">
                    {{
                      i18n.t('setup.go_komi_note', { komi: DEFAULT_GO_KOMI })
                    }}
                  </p>
                </div>
              } @else {
                <div
                  class="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-600"
                >
                  {{
                    i18n.t('setup.gomoku_fixed_board', {
                      size: GOMOKU_BOARD_SIZE,
                    })
                  }}
                </div>
              }

              <button
                type="submit"
                class="inline-flex items-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
              >
                {{ i18n.t('setup.start_local_match') }}
              </button>
            </form>
          </section>

          <section
            class="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/85 text-stone-50 shadow-2xl shadow-slate-950/30"
          >
            <div class="border-b border-white/10 px-6 py-6">
              <p
                class="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/60"
              >
                {{ i18n.t('setup.rules_refresher') }}
              </p>
              <h2 class="mt-2 text-2xl font-semibold">
                {{ meta()!.strapline }}
              </h2>
            </div>

            <div class="space-y-4 px-6 py-6 text-sm leading-6 text-stone-300">
              <p>{{ meta()!.description }}</p>
              <ul class="space-y-3">
                @for (fact of meta()!.help; track fact) {
                  <li class="flex gap-3">
                    <span class="mt-2 h-2 w-2 rounded-full bg-amber-400"></span>
                    <span>{{ fact }}</span>
                  </li>
                }
              </ul>
            </div>
          </section>
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPageComponent {
  protected readonly DEFAULT_GO_KOMI = DEFAULT_GO_KOMI;
  protected readonly GOMOKU_BOARD_SIZE = GOMOKU_BOARD_SIZE;

  protected readonly i18n = inject(GoI18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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

  protected async startMatch(): Promise<void> {
    const mode = this.mode();

    if (!mode) {
      await this.router.navigate(['/']);
      return;
    }

    this.store.startMatch({
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
    });

    await this.router.navigate(['/play', mode]);
  }
}

function sanitizeName(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}
