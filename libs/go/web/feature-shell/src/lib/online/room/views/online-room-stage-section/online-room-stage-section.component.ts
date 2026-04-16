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
  template: `
    <section
      class="room-stage go-hosted-panel-dark relative flex min-h-0 items-stretch justify-center overflow-hidden p-2 sm:p-3"
      data-testid="room-stage"
    >
      @if (match()) {
        <div
          class="room-stage__board-wrap flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center gap-3"
          [class.room-stage__board-wrap--with-hud]="!!boardSection().statusLine"
          data-testid="room-board-wrap"
        >
          <div
            class="room-stage__board w-full max-w-full overflow-hidden rounded-[1.5rem]"
            data-testid="room-stage-board"
          >
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

          @if (shareChip().shareUrl) {
            <div
              class="room-stage__share-anchor room-stage__share-anchor--board flex w-full justify-end"
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
      } @else {
        <div
          class="mx-auto grid w-full max-w-2xl place-items-center gap-3 self-center px-4 py-8 text-center"
          data-testid="room-stage-empty"
        >
          <p class="go-hosted-eyebrow-muted">{{ roomStage()!.label }}</p>
          <h1 class="text-3xl font-semibold text-stone-50 sm:text-4xl">
            {{ roomStage()!.title }}
          </h1>
          <p class="max-w-xl text-sm leading-7 text-stone-300/80">
            {{ roomStage()!.description }}
          </p>
        </div>

        @if (shareChip().shareUrl) {
          <div
            class="room-stage__share-anchor flex w-full justify-end pt-1"
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
      }
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
