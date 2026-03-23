import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DEFAULT_GO_KOMI,
  DEFAULT_PLAYER_NAMES,
  getGameModeMeta,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  isGameMode,
  type GoBoardSize,
} from '@gx/go/domain';
import { GameSessionStore } from '@gx/go/state';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { map } from 'rxjs';

@Component({
  selector: 'lib-go-setup-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    SelectButtonModule,
  ],
  template: `
    @if (meta()) {
      <section class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <a
          routerLink="/"
          class="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-stone-500 transition hover:text-stone-900"
        >
          <span class="text-lg">&larr;</span>
          Back to modes
        </a>

        <div class="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <p-card styleClass="rounded-[1.75rem] border border-black/5 bg-white/90 shadow-xl shadow-amber-950/10">
            <ng-template pTemplate="header">
              <div class="border-b border-stone-200/80 bg-[linear-gradient(135deg,_rgba(254,249,240,0.98),_rgba(255,255,255,0.92))] px-6 py-6">
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Match setup
                </p>
                <h1 class="mt-2 text-3xl font-semibold text-stone-950">
                  {{ meta()!.title }}
                </h1>
                <p class="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                  {{ meta()!.setupHint }}
                </p>
              </div>
            </ng-template>

            <form
              class="space-y-6 px-1 pb-2 pt-1"
              data-testid="setup-form"
              [formGroup]="form"
              (ngSubmit)="startMatch()"
            >
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="space-y-2 text-sm font-medium text-stone-700">
                  <span>Black player</span>
                  <input pInputText formControlName="blackName" class="w-full" />
                </label>

                <label class="space-y-2 text-sm font-medium text-stone-700">
                  <span>White player</span>
                  <input pInputText formControlName="whiteName" class="w-full" />
                </label>
              </div>

              @if (mode() === 'go') {
                <div class="space-y-3">
                  <p class="text-sm font-medium text-stone-700">Board size</p>
                  <p-selectbutton
                    [options]="boardSizeOptions"
                    optionLabel="label"
                    optionValue="value"
                    formControlName="boardSize"
                  />
                  <p class="text-sm text-stone-500">
                    White komi is fixed at {{ DEFAULT_GO_KOMI }} for this local release.
                  </p>
                </div>
              } @else {
                <div class="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-600">
                  Gomoku uses a fixed {{ GOMOKU_BOARD_SIZE }}x{{ GOMOKU_BOARD_SIZE }} board.
                </div>
              }

              <button
                type="submit"
                class="inline-flex items-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
              >
                Start local match
              </button>
            </form>
          </p-card>

          <p-card styleClass="rounded-[1.75rem] border border-white/10 bg-slate-950/85 text-stone-50 shadow-2xl shadow-slate-950/30">
            <ng-template pTemplate="header">
              <div class="border-b border-white/10 px-6 py-6">
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/60">
                  Rules refresher
                </p>
                <h2 class="mt-2 text-2xl font-semibold">{{ meta()!.strapline }}</h2>
              </div>
            </ng-template>

            <div class="space-y-4 px-1 pb-2 pt-1 text-sm leading-6 text-stone-300">
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
          </p-card>
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPageComponent {
  protected readonly DEFAULT_GO_KOMI = DEFAULT_GO_KOMI;
  protected readonly GOMOKU_BOARD_SIZE = GOMOKU_BOARD_SIZE;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(GameSessionStore);

  protected readonly mode = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('mode')),
      map(mode => (isGameMode(mode) ? mode : null))
    ),
    {
      initialValue: null,
    }
  );
  protected readonly meta = computed(() => {
    const mode = this.mode();
    return mode ? getGameModeMeta(mode) : null;
  });
  protected readonly boardSizeOptions = GO_BOARD_SIZES.map(size => ({
    label: `${size} x ${size}`,
    value: size,
  }));
  protected readonly form = new FormGroup({
    blackName: new FormControl(DEFAULT_PLAYER_NAMES.black, { nonNullable: true }),
    whiteName: new FormControl(DEFAULT_PLAYER_NAMES.white, { nonNullable: true }),
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
      boardSize: mode === 'go' ? this.form.controls.boardSize.value : GOMOKU_BOARD_SIZE,
      komi: mode === 'go' ? DEFAULT_GO_KOMI : 0,
      players: {
        black: sanitizeName(this.form.controls.blackName.value, DEFAULT_PLAYER_NAMES.black),
        white: sanitizeName(this.form.controls.whiteName.value, DEFAULT_PLAYER_NAMES.white),
      },
    });

    await this.router.navigate(['/play', mode]);
  }
}

function sanitizeName(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}
