import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toSignal,
} from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LobbyRoomStatus, LobbyRoomSummary } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';
import { EMPTY, catchError, from, interval, switchMap, take } from 'rxjs';
import { OnlineLobbyService } from '../online/online-lobby.service';
import { OnlineRoomService } from '../online/online-room.service';
import { HostedShellHeaderComponent } from './hosted-shell-header.component';

interface LobbySectionDefinition {
  status: LobbyRoomStatus;
}

const LOBBY_SECTIONS: LobbySectionDefinition[] = [
  { status: 'live' },
  { status: 'ready' },
  { status: 'waiting' },
];

@Component({
  selector: 'lib-go-online-lobby-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HostedShellHeaderComponent],
  templateUrl: './online-lobby-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyPageComponent {
  protected readonly i18n = inject(GoI18nService);
  protected readonly onlineLobby = inject(OnlineLobbyService);
  protected readonly onlineRoom = inject(OnlineRoomService);

  private readonly router = inject(Router);
  private readonly selectedRoomIdSignal = signal<string | null>(null);

  protected readonly displayName = new FormControl(
    this.onlineRoom.displayName() || this.i18n.t('common.role.host'),
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
    LOBBY_SECTIONS.map(section => ({
      ...section,
      title: this.i18n.t(`lobby.section.${section.status}.title`),
      caption: this.i18n.t(`lobby.section.${section.status}.caption`),
      rooms: this.onlineLobby.rooms().filter(room => room.status === section.status),
    }))
  );
  protected readonly selectedRoom = computed<LobbyRoomSummary | null>(() => {
    const rooms = this.onlineLobby.rooms();
    const selectedRoomId = this.selectedRoomIdSignal();

    if (rooms.length === 0) {
      return null;
    }

    return rooms.find(room => room.roomId === selectedRoomId) ?? rooms[0] ?? null;
  });
  protected readonly trimmedDisplayName = computed(() =>
    this.displayNameValue().trim()
  );
  protected readonly canSubmitIdentity = computed(
    () => this.trimmedDisplayName().length > 0
  );

  constructor() {
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
  }

  protected selectRoom(roomId: string): void {
    this.selectedRoomIdSignal.set(roomId);
  }

  protected isSelectedRoom(roomId: string): boolean {
    return this.selectedRoom()?.roomId === roomId;
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

  protected joinSelectedRoom(): void {
    const room = this.selectedRoom();
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

  protected roomStatusLabel(status: LobbyRoomStatus): string {
    return this.i18n.t(`lobby.status.${status}`);
  }

  protected roomStatusHeadline(room: LobbyRoomSummary): string {
    return this.i18n.t(`lobby.room.status.${room.status}.headline`);
  }

  protected roomStatusCopy(room: LobbyRoomSummary): string {
    return this.i18n.t(`lobby.room.status.${room.status}.copy`);
  }

  protected roomModeLabel(room: LobbyRoomSummary): string {
    if (!room.mode || !room.boardSize) {
      return this.i18n.t('lobby.room.mode_pending');
    }

    return this.i18n.t('lobby.room.mode_with_board', {
      mode: this.i18n.t(`common.mode.${room.mode}`),
      size: room.boardSize,
    });
  }

  protected roomActionLabel(room: LobbyRoomSummary): string {
    return room.status === 'live'
      ? this.i18n.t('lobby.room.action.live')
      : this.i18n.t('lobby.room.action.join');
  }

  protected roomActionHint(room: LobbyRoomSummary): string {
    return room.status === 'live'
      ? this.i18n.t('lobby.room.action_hint.live')
      : this.i18n.t('lobby.room.action_hint.join');
  }

  protected seatLabel(name: string | null, color: 'black' | 'white'): string {
    return (
      name ??
      this.i18n.t('lobby.room.open_seat', {
        seat: this.i18n.t(`common.seat.${color}`),
      })
    );
  }

  protected countLabel(count: number, unit: 'room' | 'person' | 'online' | 'spectator'): string {
    return this.i18n.t(`lobby.count.${unit}.${count === 1 ? 'one' : 'other'}`, {
      count,
    });
  }

  protected roomCardTitle(host: string): string {
    return this.i18n.t('lobby.room.card.title', {
      host,
    });
  }

  protected roomCardLabel(roomId: string): string {
    return this.i18n.t('lobby.room.card.label', {
      roomId,
    });
  }

  protected updatedLabel(updatedAt: string): string {
    const formatted = new Intl.DateTimeFormat(
      this.i18n.locale() === 'zh-TW' ? 'zh-TW' : 'en',
      {
        timeStyle: 'short',
      }
    ).format(new Date(updatedAt));

    return this.i18n.t('lobby.selected.updated', {
      time: formatted,
    });
  }

  protected emptySectionLabel(status: LobbyRoomStatus): string {
    return this.i18n.t('lobby.section.empty', {
      section: this.i18n.t(`lobby.section.${status}.title`).toLowerCase(),
    });
  }
}
