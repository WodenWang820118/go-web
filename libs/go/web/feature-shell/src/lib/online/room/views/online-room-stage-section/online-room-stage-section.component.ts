import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { HostedMatchSnapshot } from '@gx/go/contracts';
import { BoardPoint } from '@gx/go/domain';
import { GameBoardComponent } from '@gx/go/ui';
import { ChipModule } from 'primeng/chip';
import { OnlineRoomShareChipComponent } from '../../components/online-room-share-chip/online-room-share-chip.component';
import {
  OnlineRoomBoardSectionViewModel,
  OnlineRoomShareChipViewModel,
  OnlineRoomSettingsChipViewModel,
  OnlineRoomStageViewModel,
} from '../../contracts/online-room-view.contracts';

@Component({
  selector: 'lib-go-online-room-stage-section',
  standalone: true,
  imports: [
    ChipModule,
    CommonModule,
    GameBoardComponent,
    OnlineRoomShareChipComponent,
  ],
  styleUrl: './online-room-stage-section.component.css',
  host: {
    class: 'block min-h-0 min-w-0',
  },
  template: `
    <section
      class="room-stage go-hosted-panel-dark relative min-h-0 overflow-hidden"
      data-testid="room-stage"
    >
      <div
        class="room-stage__layout"
        [class.room-stage__layout--with-dock]="showDock()"
        data-testid="room-stage-layout"
      >
        @if (match()) {
          <div
            class="room-stage__board-wrap"
            [class.room-stage__board-wrap--with-hud]="
              !!boardSection().statusLine
            "
            data-testid="room-board-wrap"
          >
            <div class="room-stage__board" data-testid="room-stage-board">
              <lib-go-game-board
                [mode]="match()!.settings.mode"
                [boardSize]="match()!.state.boardSize"
                [board]="match()!.state.board"
                [phase]="match()!.state.phase"
                [currentPlayer]="match()!.state.nextPlayer"
                [lastMove]="boardSection().lastPlacedPoint"
                [winningLine]="match()!.state.winnerLine"
                [deadStones]="match()!.state.scoring?.deadStones ?? []"
                [interactive]="boardSection().interactive"
                (pointSelected)="pointSelected.emit($event)"
              />
            </div>

            @if (boardSection().statusLine) {
              <div
                class="room-stage__hud rounded-[0.375rem] border border-white/10 bg-white/5 px-4 py-3"
                data-testid="room-stage-hud"
              >
                <p class="text-sm leading-6 text-stone-200/80">
                  {{ boardSection().statusLine }}
                </p>
              </div>
            }
          </div>
        } @else {
          <div class="room-stage__empty" data-testid="room-stage-empty">
            <p class="go-hosted-eyebrow-muted">{{ roomStage()!.label }}</p>
            <h1 class="text-3xl font-semibold text-stone-50 sm:text-4xl">
              {{ roomStage()!.title }}
            </h1>
            <p class="max-w-xl text-sm leading-7 text-stone-300/80">
              {{ roomStage()!.description }}
            </p>
          </div>
        }

        @if (showDock()) {
          <div class="room-stage__dock" data-testid="room-stage-dock">
            @if (settingsChip(); as settingsChip) {
              <div
                class="room-stage__settings-anchor"
                data-testid="room-stage-settings-anchor"
              >
                <button
                  type="button"
                  class="room-stage-settings-chip__button-reset"
                  data-testid="room-settings-chip-button"
                  [attr.aria-label]="settingsChip.ariaLabel"
                  [attr.title]="settingsChip.title"
                  (click)="settingsRequested.emit()"
                >
                  <p-chip class="room-stage-settings-chip__trigger">
                    <span class="room-stage-settings-chip__label">
                      {{ settingsChip.label }}
                    </span>
                  </p-chip>
                </button>
              </div>
            }

            @if (shareChip().shareUrl) {
              <div
                class="room-stage__share-anchor"
                [class.room-stage__share-anchor--board]="!!match()"
                data-testid="room-stage-share-anchor"
              >
                <lib-go-online-room-share-chip
                  [shareUrl]="shareChip().shareUrl!"
                  [shareLabel]="shareChip().shareLabel"
                  [copiedLabel]="shareChip().copiedLabel"
                  [copyAriaLabel]="shareChip().copyAriaLabel"
                  [retryAriaLabel]="shareChip().retryAriaLabel"
                  [copiedMessage]="shareChip().copiedMessage"
                  [copyFailedMessage]="shareChip().copyFailedMessage"
                  [manualCopyInstruction]="shareChip().manualCopyInstruction"
                  [manualUrlAriaLabel]="shareChip().manualUrlAriaLabel"
                  [dismissLabel]="shareChip().dismissLabel"
                  [connectionState]="shareChip().connectionState"
                  [connectionLabel]="shareChip().connectionLabel"
                  [feedbackState]="shareChip().feedbackState"
                  (copyRequested)="copyRequested.emit()"
                  (manualFallbackDismissed)="manualFallbackDismissed.emit()"
                />
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomStageSectionComponent {
  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly roomStage = input<OnlineRoomStageViewModel | null>(null);
  readonly boardSection = input.required<OnlineRoomBoardSectionViewModel>();
  readonly shareChip = input.required<OnlineRoomShareChipViewModel>();
  readonly settingsChip = input<OnlineRoomSettingsChipViewModel | null>(null);
  protected readonly showDock = computed(
    () => !!this.settingsChip() || !!this.shareChip().shareUrl,
  );

  readonly pointSelected = output<BoardPoint>();
  readonly copyRequested = output<void>();
  readonly manualFallbackDismissed = output<void>();
  readonly settingsRequested = output<void>();
}
