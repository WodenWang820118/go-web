import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LobbyRoomStatus, LobbyRoomSummary } from '@gx/go/contracts';
import {
  BoardSize,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  GameMode,
  GoBoardSize,
} from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { DialogModule } from 'primeng/dialog';
import { EMPTY, catchError, from, interval, switchMap, take } from 'rxjs';
import {
  LobbyAnnouncementCardViewModel,
  LobbyOnlinePlayerGroupViewModel,
  LobbyOverviewStatsViewModel,
  LobbyRoomTableRowViewModel,
  OnlineLobbyPresentationService,
} from '../online-lobby-presentation.service';
import { HostedShellHeaderComponent } from '../../shared/hosted-shell-header/hosted-shell-header.component';
import { OnlineRoomService } from '../../room/services/online-room/online-room.service';
import { OnlineLobbyService } from '../services/online-lobby/online-lobby.service';
import { OnlineLobbyFlashNoticeService } from '../services/online-lobby-flash-notice/online-lobby-flash-notice.service';
import { OnlineLobbyAnnouncementPanelComponent } from './components/online-lobby-announcement-panel/online-lobby-announcement-panel.component';
import { OnlineLobbyOnlinePlayersPanelComponent } from './components/online-lobby-online-players-panel/online-lobby-online-players-panel.component';
import { OnlineLobbyRoomPanelComponent } from './components/online-lobby-room-panel/online-lobby-room-panel.component';

@Component({
  selector: 'lib-go-online-lobby-page',
  standalone: true,
  imports: [
    HostedShellHeaderComponent,
    DialogModule,
    ReactiveFormsModule,
    OnlineLobbyRoomPanelComponent,
    OnlineLobbyAnnouncementPanelComponent,
    OnlineLobbyOnlinePlayersPanelComponent,
  ],
  templateUrl: './online-lobby-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyPageComponent {
  protected readonly i18n = inject(GoI18nService);
  protected readonly onlineLobby = inject(OnlineLobbyService);
  protected readonly onlineRoom = inject(OnlineRoomService);
  protected readonly flashNotice = inject(OnlineLobbyFlashNoticeService);
  protected readonly presentation = inject(OnlineLobbyPresentationService);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeStatusSignal = signal<LobbyRoomStatus>('live');
  protected readonly GO_BOARD_SIZES = GO_BOARD_SIZES;
  protected readonly GOMOKU_BOARD_SIZE = GOMOKU_BOARD_SIZE;
  protected readonly activeStatus = this.activeStatusSignal.asReadonly();
  private readonly mdUpSignal = signal(this.resolveMdUp());
  protected readonly createRoomDialogVisible = signal(false);

  protected readonly displayName = new FormControl(
    this.onlineRoom.displayName() || '',
    {
      nonNullable: true,
    },
  );
  private readonly displayNameValue = toSignal(this.displayName.valueChanges, {
    initialValue: this.displayName.value,
  });
  protected readonly createRoomSettings = new FormGroup({
    mode: new FormControl<GameMode>('go', {
      nonNullable: true,
    }),
    goBoardSize: new FormControl<GoBoardSize>(19, {
      nonNullable: true,
    }),
  });
  private readonly createRoomModeValue = toSignal(
    this.createRoomSettings.controls.mode.valueChanges,
    {
      initialValue: this.createRoomSettings.controls.mode.value,
    },
  );
  protected readonly selectedCreateRoomMode = computed(() =>
    this.createRoomModeValue(),
  );

  protected readonly sections = computed(() =>
    this.presentation.buildLobbySections(this.onlineLobby.rooms()),
  );
  protected readonly activeSection = computed(
    () =>
      this.sections().find(
        (section) => section.status === this.activeStatusSignal(),
      ) ??
      this.sections()[0] ??
      null,
  );
  protected readonly activeRows = computed<
    readonly LobbyRoomTableRowViewModel[]
  >(() =>
    this.presentation.buildLobbyTableRows(this.activeSection()?.rooms ?? []),
  );
  protected readonly activeSectionStats = computed<LobbyOverviewStatsViewModel>(
    () =>
      this.presentation.buildLobbyOverviewStats(
        this.activeSection()?.rooms ?? [],
      ),
  );
  protected readonly announcementCards = computed<
    LobbyAnnouncementCardViewModel[]
  >(() => this.presentation.buildLobbyAnnouncementCards());
  protected readonly onlinePlayerGroups = computed<
    LobbyOnlinePlayerGroupViewModel[]
  >(() =>
    this.presentation.buildLobbyOnlinePlayerGroups(
      this.onlineLobby.onlineParticipants(),
    ),
  );
  protected readonly totalOnlinePlayers = computed(
    () => this.onlineLobby.onlineParticipants().length,
  );
  protected readonly isMdUp = this.mdUpSignal.asReadonly();
  protected readonly trimmedDisplayName = computed(() =>
    this.displayNameValue().trim(),
  );
  protected readonly canSubmitIdentity = computed(
    () => this.trimmedDisplayName().length > 0,
  );
  protected readonly actionBarMessage = computed(
    () =>
      this.onlineRoom.lastError() ??
      this.onlineLobby.lastError() ??
      this.flashNotice.message() ??
      this.i18n.t('lobby.identity.description'),
  );
  protected readonly actionBarMessageIsError = computed(
    () => !!(this.onlineRoom.lastError() ?? this.onlineLobby.lastError()),
  );

  constructor() {
    this.bindViewportMode();
    this.onlineRoom.clearTransientMessages();
    this.onlineLobby.refresh();
    interval(10000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.onlineLobby.refresh();
      });

    effect(() => {
      const displayName = this.onlineRoom.displayName();

      if (displayName && this.displayName.value !== displayName) {
        this.displayName.setValue(displayName, {
          emitEvent: false,
        });
      }
    });

    effect(() => {
      const sections = this.sections();
      const activeStatus = this.activeStatusSignal();

      if (
        sections.some(
          (section) =>
            section.status === activeStatus && section.rooms.length > 0,
        )
      ) {
        return;
      }

      const nextStatus = sections.find(
        (section) => section.rooms.length > 0,
      )?.status;

      if (nextStatus) {
        this.activeStatusSignal.set(nextStatus);
      }
    });

    this.createRoomSettings.controls.mode.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((mode) => {
        if (mode === 'go') {
          this.createRoomSettings.controls.goBoardSize.setValue(19);
        }
      });
  }

  protected setActiveStatus(status: LobbyRoomStatus): void {
    this.activeStatusSignal.set(status);
  }

  protected openCreateRoomDialog(): void {
    const displayName = this.trimmedDisplayName();

    if (!displayName) {
      return;
    }

    this.createRoomDialogVisible.set(true);
  }

  protected cancelCreateRoomDialog(): void {
    this.createRoomDialogVisible.set(false);
  }

  protected confirmCreateRoom(): void {
    const displayName = this.trimmedDisplayName();

    if (!displayName) {
      this.createRoomDialogVisible.set(false);
      return;
    }

    const mode = this.createRoomSettings.controls.mode.value;
    const boardSize = this.resolveCreateRoomBoardSize(mode);

    this.createRoomDialogVisible.set(false);
    this.onlineRoom
      .createRoom(displayName, mode, boardSize)
      .pipe(
        switchMap((response) =>
          from(this.router.navigate(['/online/room', response.roomId])),
        ),
        catchError(() => EMPTY),
        take(1),
      )
      .subscribe();
  }

  protected joinRoom(room: LobbyRoomSummary | null): void {
    const displayName = this.trimmedDisplayName();

    if (!room || !displayName) {
      return;
    }

    this.onlineRoom
      .joinRoom(room.roomId, displayName, 'lobby')
      .pipe(
        switchMap(() =>
          from(this.router.navigate(['/online/room', room.roomId])),
        ),
        catchError(() => EMPTY),
        take(1),
      )
      .subscribe();
  }

  private bindViewportMode(): void {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const listener = (event: MediaQueryListEvent) => {
      this.mdUpSignal.set(event.matches);
    };

    this.mdUpSignal.set(mediaQuery.matches);
    mediaQuery.addEventListener('change', listener);
    this.destroyRef.onDestroy(() => {
      mediaQuery.removeEventListener('change', listener);
    });
  }

  private resolveMdUp(): boolean {
    return typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia('(min-width: 768px)').matches;
  }

  private resolveCreateRoomBoardSize(mode: GameMode): BoardSize {
    return mode === 'gomoku'
      ? GOMOKU_BOARD_SIZE
      : this.createRoomSettings.controls.goBoardSize.value;
  }
}
