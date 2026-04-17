import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toSignal,
} from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LobbyRoomStatus, LobbyRoomSummary } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';
import { TagModule } from 'primeng/tag';
import { EMPTY, catchError, from, interval, switchMap, take } from 'rxjs';
import {
  buildLobbyAnnouncementCards,
  buildLobbyOnlinePlayerGroups,
  buildLobbyTableRows,
  buildLobbySections,
  countLabel,
  emptySectionLabel,
  LobbyAnnouncementCardViewModel,
  LobbyOnlinePlayerGroupViewModel,
  LobbyOverviewStatsViewModel,
  LobbyRoomTableRowViewModel,
} from '../online-lobby.presentation';
import { HostedShellHeaderComponent } from '../../shared/hosted-shell-header/hosted-shell-header.component';
import { OnlineRoomService } from '../../room/services/online-room/online-room.service';
import { OnlineLobbyService } from '../services/online-lobby/online-lobby.service';
import { OnlineLobbyFlashNoticeService } from '../services/online-lobby-flash-notice/online-lobby-flash-notice.service';

@Component({
  selector: 'lib-go-online-lobby-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TagModule,
    HostedShellHeaderComponent,
  ],
  templateUrl: './online-lobby-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyPageComponent {
  protected readonly i18n = inject(GoI18nService);
  protected readonly onlineLobby = inject(OnlineLobbyService);
  protected readonly onlineRoom = inject(OnlineRoomService);
  protected readonly flashNotice = inject(OnlineLobbyFlashNoticeService);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly roomTableScroll = viewChild<ElementRef<HTMLDivElement>>('roomTableScroll');
  private readonly activeStatusSignal = signal<LobbyRoomStatus>('live');
  private readonly mdUpSignal = signal(this.resolveMdUp());

  protected readonly displayName = new FormControl(
    this.onlineRoom.displayName() || '',
    {
      nonNullable: true,
    }
  );
  private readonly displayNameValue = toSignal(
    this.displayName.valueChanges,
    {
      initialValue: this.displayName.value,
    }
  );

  protected readonly sections = computed(() =>
    buildLobbySections(this.i18n, this.onlineLobby.rooms())
  );
  protected readonly activeSection = computed(() =>
    this.sections().find(section => section.status === this.activeStatusSignal()) ??
    this.sections()[0] ??
    null
  );
  protected readonly activeRows = computed<LobbyRoomTableRowViewModel[]>(() =>
    buildLobbyTableRows(this.i18n, this.activeSection()?.rooms ?? [])
  );
  protected readonly activeSectionStats = computed<LobbyOverviewStatsViewModel>(() =>
    ({
      liveCount: this.activeSection()?.status === 'live' ? this.activeRows().length : 0,
      readyCount: this.activeSection()?.status === 'ready' ? this.activeRows().length : 0,
      waitingCount: this.activeSection()?.status === 'waiting' ? this.activeRows().length : 0,
      roomCount: this.activeSection()?.rooms.length ?? 0,
      participantCount: (this.activeSection()?.rooms ?? []).reduce(
        (total, room) => total + room.participantCount,
        0
      ),
      onlineCount: (this.activeSection()?.rooms ?? []).reduce(
        (total, room) => total + room.onlineCount,
        0
      ),
      spectatorCount: (this.activeSection()?.rooms ?? []).reduce(
        (total, room) => total + room.spectatorCount,
        0
      ),
    })
  );
  protected readonly announcementCards = computed<LobbyAnnouncementCardViewModel[]>(() =>
    buildLobbyAnnouncementCards(this.i18n)
  );
  protected readonly onlinePlayerGroups = computed<LobbyOnlinePlayerGroupViewModel[]>(() =>
    buildLobbyOnlinePlayerGroups(this.i18n, this.onlineLobby.onlineParticipants())
  );
  protected readonly totalOnlinePlayers = computed(
    () => this.onlineLobby.onlineParticipants().length
  );
  protected readonly isMdUp = this.mdUpSignal.asReadonly();
  protected readonly trimmedDisplayName = computed(() =>
    this.displayNameValue().trim()
  );
  protected readonly canSubmitIdentity = computed(
    () => this.trimmedDisplayName().length > 0
  );
  protected readonly actionBarMessage = computed(
    () =>
      this.onlineRoom.lastError() ??
      this.onlineLobby.lastError() ??
      this.flashNotice.message() ??
      this.i18n.t('lobby.identity.description')
  );
  protected readonly actionBarMessageIsError = computed(
    () => !!(this.onlineRoom.lastError() ?? this.onlineLobby.lastError())
  );
  protected readonly countLabel = (
    count: number,
    unit: 'room' | 'person' | 'online' | 'spectator'
  ) => countLabel(this.i18n, count, unit);
  protected readonly emptySectionLabel = (status: LobbyRoomStatus) =>
    emptySectionLabel(this.i18n, status);

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
          section => section.status === activeStatus && section.rooms.length > 0
        )
      ) {
        return;
      }

      const nextStatus = sections.find(section => section.rooms.length > 0)?.status;

      if (nextStatus) {
        this.activeStatusSignal.set(nextStatus);
        this.scrollRoomTableToTop();
      }
    });
  }

  protected setActiveStatus(status: LobbyRoomStatus): void {
    this.activeStatusSignal.set(status);
    this.scrollRoomTableToTop();
  }

  protected isActiveStatus(status: LobbyRoomStatus): boolean {
    return this.activeStatusSignal() === status;
  }

  protected createRoom(): void {
    const displayName = this.trimmedDisplayName();

    if (!displayName) {
      return;
    }

    this.onlineRoom
      .createRoom(displayName)
      .pipe(
        switchMap(response =>
          from(this.router.navigate(['/online/room', response.roomId]))
        ),
        catchError(() => EMPTY),
        take(1)
      )
      .subscribe();
  }

  protected joinRoom(room: LobbyRoomSummary | null): void {
    const displayName = this.trimmedDisplayName();

    if (!room || !displayName) {
      return;
    }

    this.onlineRoom
      .joinRoom(room.roomId, displayName)
      .pipe(
        switchMap(() => from(this.router.navigate(['/online/room', room.roomId]))),
        catchError(() => EMPTY),
        take(1)
      )
      .subscribe();
  }

  private bindViewportMode(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
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
    return typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia('(min-width: 768px)').matches;
  }

  private scrollRoomTableToTop(): void {
    const element = this.roomTableScroll()?.nativeElement;

    if (!element) {
      return;
    }

    if (typeof element.scrollTo === 'function') {
      element.scrollTo({
        top: 0,
      });
      return;
    }

    element.scrollTop = 0;
  }
}
