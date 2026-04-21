import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LobbyRoomStatus, LobbyRoomSummary } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';
import { TagModule } from 'primeng/tag';
import {
  emptySectionLabel,
  LobbyOverviewStatsViewModel,
  LobbyRoomTableRowViewModel,
  LobbySectionViewModel,
} from '../../../online-lobby.presentation';
import { OnlineLobbyIdentityBarComponent } from '../online-lobby-identity-bar/online-lobby-identity-bar.component';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'lib-go-online-lobby-room-panel',
  standalone: true,
  imports: [RouterLink, TagModule, OnlineLobbyIdentityBarComponent],
  templateUrl: './online-lobby-room-panel.component.html',
  host: {
    class: 'block h-full min-h-0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyRoomPanelComponent {
  readonly i18n = inject(GoI18nService);

  readonly sections = input.required<readonly LobbySectionViewModel[]>();
  readonly activeStatus = input.required<LobbyRoomStatus>();
  readonly activeSection = input.required<LobbySectionViewModel | null>();
  readonly activeRows = input.required<readonly LobbyRoomTableRowViewModel[]>();
  readonly activeStats = input.required<LobbyOverviewStatsViewModel>();
  readonly displayName = input.required<FormControl<string>>();
  readonly canSubmitIdentity = input.required<boolean>();
  readonly creating = input.required<boolean>();
  readonly joining = input.required<boolean>();
  readonly loading = input.required<boolean>();
  readonly actionMessage = input.required<string>();
  readonly actionMessageIsError = input.required<boolean>();
  readonly isMdUp = input.required<boolean>();

  readonly activeStatusChange = output<LobbyRoomStatus>();
  readonly createRoomRequested = output<void>();
  readonly joinRoomRequested = output<LobbyRoomSummary>();

  private readonly roomTableScroll =
    viewChild<ElementRef<HTMLDivElement>>('roomTableScroll');

  protected readonly emptySectionLabel = (status: LobbyRoomStatus) =>
    emptySectionLabel(this.i18n, status);

  constructor() {
    effect(() => {
      this.activeStatus();
      this.scrollToTop();
    });
  }

  protected onJoinRoomRequested(room: LobbyRoomSummary): void {
    this.joinRoomRequested.emit(room);
  }

  private scrollToTop(): void {
    const element = this.roomTableScroll()?.nativeElement;

    if (!element) {
      return;
    }

    if (typeof element.scrollTo === 'function') {
      element.scrollTo({ top: 0 });
      return;
    }

    element.scrollTop = 0;
  }
}
