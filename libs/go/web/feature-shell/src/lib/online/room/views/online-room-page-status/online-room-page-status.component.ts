import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'lib-go-online-room-page-status',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <section class="go-safe-page grid min-h-dvh place-items-center gap-3">
      <a
        routerLink="/"
        pButton
        class="go-hosted-button-secondary"
        [attr.data-testid]="backTestId()"
      >
        <span aria-hidden="true">&larr;</span>
        {{ backLabel() }}
      </a>

      <div class="go-hosted-panel-dark w-full max-w-2xl p-6 sm:p-8">
        <p class="go-hosted-eyebrow-muted">{{ eyebrow() }}</p>
        <h1 class="mt-3 text-3xl font-semibold text-stone-50 sm:text-4xl">
          {{ title() }}
        </h1>

        @if (description()) {
          <p class="mt-4 max-w-2xl text-sm leading-7 text-stone-300/80">
            {{ description() }}
          </p>
        }

        @if (actionLabel() && actionTestId()) {
          <a
            routerLink="/"
            pButton
            class="go-hosted-button-primary mt-5"
            [attr.data-testid]="actionTestId()"
          >
            {{ actionLabel() }}
          </a>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomPageStatusComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  readonly backLabel = input.required<string>();
  readonly backTestId = input.required<string>();
  readonly actionTestId = input<string | null>(null);
}
