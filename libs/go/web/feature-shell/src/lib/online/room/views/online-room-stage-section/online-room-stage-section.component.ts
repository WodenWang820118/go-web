import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HostedMatchSnapshot } from '@gx/go/contracts';
import { BoardPoint } from '@gx/go/domain';
import { GameBoardComponent } from '@gx/go/ui';
import { OnlineRoomShareChipComponent } from '../../components/online-room-share-chip/online-room-share-chip.component';
import {
  OnlineRoomBoardSectionViewModel,
  OnlineRoomShareChipViewModel,
  OnlineRoomStageViewModel,
} from '../../contracts/online-room-view.contracts';

@Component({
  selector: 'lib-go-online-room-stage-section',
  standalone: true,
  imports: [CommonModule, GameBoardComponent, OnlineRoomShareChipComponent],
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
        [class.room-stage__layout--with-dock]="!!shareChip().shareUrl"
        data-testid="room-stage-layout"
      >
        @if (match()) {
          <div
            class="room-stage__board-wrap"
            [class.room-stage__board-wrap--with-hud]="!!boardSection().statusLine"
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
                class="room-stage__hud rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3"
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

        @if (shareChip().shareUrl) {
          <div class="room-stage__dock" data-testid="room-stage-dock">
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

  readonly pointSelected = output<BoardPoint>();
  readonly copyRequested = output<void>();
  readonly manualFallbackDismissed = output<void>();
}
