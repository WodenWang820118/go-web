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
import { LobbyRoomStatus, LobbyRoomSummary } from '@gx/go/contracts';
import {
  DEFAULT_GO_RULE_OPTIONS,
  DEFAULT_GO_TIME_CONTROL,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  GO_KO_RULES,
  GO_SCORING_RULES,
  cloneTimeControlSettings,
  type BoardSize,
  type GameMode,
  type GoBoardSize,
  type GoKoRule,
  type GoScoringRule,
  type GoRuleOptions,
  type TimeControlSettings,
} from '@gx/go/domain';
import { GoAnalyticsService } from '@gx/go/state';
import { GoI18nService } from '@gx/go/state/i18n';
import { DialogModule } from 'primeng/dialog';
import { interval } from 'rxjs';
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
import { OnlineLobbyRoomNavigationService } from './services/online-lobby-room-navigation.service';
import { OnlineLobbyViewportService } from './services/online-lobby-viewport.service';
import { TimeControlPresetSelectorComponent } from '../../../shared/time-control/time-control-preset-selector.component';

@Component({
  selector: 'lib-go-online-lobby-page',
  standalone: true,
  imports: [
    HostedShellHeaderComponent,
    DialogModule,
    ReactiveFormsModule,
    TimeControlPresetSelectorComponent,
    OnlineLobbyRoomPanelComponent,
    OnlineLobbyAnnouncementPanelComponent,
    OnlineLobbyOnlinePlayersPanelComponent,
  ],
  templateUrl: './online-lobby-page.component.html',
  providers: [OnlineLobbyViewportService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyPageComponent {
  protected readonly i18n = inject(GoI18nService);
  protected readonly onlineLobby = inject(OnlineLobbyService);
  protected readonly onlineRoom = inject(OnlineRoomService);
  protected readonly flashNotice = inject(OnlineLobbyFlashNoticeService);
  protected readonly presentation = inject(OnlineLobbyPresentationService);
  private readonly analytics = inject(GoAnalyticsService);
  private readonly navigation = inject(OnlineLobbyRoomNavigationService);
  private readonly viewport = inject(OnlineLobbyViewportService);

  private readonly destroyRef = inject(DestroyRef);
  private readonly activeStatusSignal = signal<LobbyRoomStatus>('live');
  protected readonly GO_BOARD_SIZES = GO_BOARD_SIZES;
  protected readonly GOMOKU_BOARD_SIZE = GOMOKU_BOARD_SIZE;
  protected readonly koRuleOptions = GO_KO_RULES;
  protected readonly scoringRuleOptions = GO_SCORING_RULES;
  protected readonly activeStatus = this.activeStatusSignal.asReadonly();
  protected readonly createRoomDialogVisible = signal(false);
  protected readonly createRoomTimeControl = signal<TimeControlSettings>(
    cloneTimeControlSettings(DEFAULT_GO_TIME_CONTROL),
  );

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
    koRule: new FormControl<GoKoRule>(DEFAULT_GO_RULE_OPTIONS.koRule, {
      nonNullable: true,
    }),
    scoringRule: new FormControl<GoScoringRule>(
      DEFAULT_GO_RULE_OPTIONS.scoringRule,
      {
        nonNullable: true,
      },
    ),
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
  protected readonly isMdUp = this.viewport.isMdUp;
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
    this.viewport.bind(this.destroyRef);
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
    if (this.activeStatusSignal() === status) {
      return;
    }

    this.analytics.track({
      event: 'gx_lobby_filter_change',
      room_status: status,
    });
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
    if (mode === 'go') {
      this.navigation.createRoom(
        displayName,
        mode,
        boardSize,
        cloneTimeControlSettings(this.createRoomTimeControl()),
        this.createGoRuleOptions(),
      );
      return;
    }

    this.navigation.createRoom(displayName, mode, boardSize);
  }

  protected joinRoom(room: LobbyRoomSummary | null): void {
    const displayName = this.trimmedDisplayName();

    if (!room || !displayName) {
      return;
    }

    this.navigation.joinRoom(room, displayName);
  }

  protected trackRoomOpen(room: LobbyRoomSummary): void {
    this.navigation.trackRoomOpen(room);
  }

  private resolveCreateRoomBoardSize(mode: GameMode): BoardSize {
    return mode === 'gomoku'
      ? GOMOKU_BOARD_SIZE
      : this.createRoomSettings.controls.goBoardSize.value;
  }

  protected selectCreateRoomTimeControl(
    timeControl: TimeControlSettings,
  ): void {
    this.createRoomTimeControl.set(cloneTimeControlSettings(timeControl));
  }

  protected koRuleLabel(rule: GoKoRule): string {
    return this.i18n.t(`go_rules.ko_rule.${rule.replace('-', '_')}`);
  }

  protected scoringRuleLabel(rule: GoScoringRule): string {
    return this.i18n.t(`go_rules.scoring_rule.${rule.replace('-', '_')}`);
  }

  private createGoRuleOptions(): GoRuleOptions {
    return {
      koRule: this.createRoomSettings.controls.koRule.value,
      scoringRule: this.createRoomSettings.controls.scoringRule.value,
    };
  }
}
