import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { GoI18nService } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-online-room-hero',
  standalone: true,
  template: `
    <header
      class="mt-5 rounded-[2rem] border border-slate-900/5 bg-[linear-gradient(140deg,_rgba(15,23,42,0.96),_rgba(30,41,59,0.92))] px-6 py-7 text-stone-50 shadow-2xl shadow-slate-950/25 sm:px-8"
    >
      <div class="flex flex-wrap items-start justify-between gap-6">
        <div class="max-w-3xl space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/70">
            {{ i18n.t('room.hero.eyebrow') }}
          </p>
          <h1 class="text-3xl font-semibold sm:text-4xl">
            @if (roomId()) {
              {{ i18n.t('room.hero.title', { roomId: roomId()! }) }}
            } @else {
              {{ i18n.t('room.hero.loading_title') }}
            }
          </h1>
          <p class="max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
            {{ i18n.t('room.hero.description') }}
          </p>
        </div>

        <div
          class="min-w-[16rem] rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-stone-200"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
            {{ i18n.t('room.hero.connection') }}
          </p>
          <p class="mt-2 font-semibold text-stone-50">
            {{ connectionLabel() }}
          </p>

          @if (shareUrl()) {
            <label
              [for]="shareUrlInputId"
              class="mt-4 block text-xs font-semibold uppercase tracking-[0.24em] text-stone-400"
            >
              {{ i18n.t('room.hero.share_url') }}
            </label>
            <div class="mt-2 flex gap-2">
              <input
                [id]="shareUrlInputId"
                [value]="shareUrl()"
                readonly
                class="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-stone-200 outline-none"
              />
              <button
                type="button"
                class="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-stone-50 transition hover:border-white/30 hover:bg-white/10"
                (click)="copyRequested.emit()"
              >
                {{ i18n.t('room.hero.copy') }}
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomHeroComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly roomId = input<string | null>(null);
  readonly connectionLabel = input.required<string>();
  readonly shareUrl = input<string>('');
  readonly copyRequested = output<void>();

  protected readonly shareUrlInputId = 'room-share-url';
}
