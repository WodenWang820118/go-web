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
import { EMPTY, catchError, from, interval, switchMap, take } from 'rxjs';
import { OnlineLobbyService } from '../online/online-lobby.service';
import { OnlineRoomService } from '../online/online-room.service';
import { HostedShellHeaderComponent } from './hosted-shell-header.component';

interface LobbySectionDefinition {
  status: LobbyRoomStatus;
  title: string;
  caption: string;
}

const LOBBY_SECTIONS: LobbySectionDefinition[] = [
  {
    status: 'live',
    title: 'Live rooms',
    caption: 'Games in progress stay open for spectators who want to watch and chat.',
  },
  {
    status: 'ready',
    title: 'Ready rooms',
    caption: 'Both seats are filled and the host can start the match as soon as everyone is set.',
  },
  {
    status: 'waiting',
    title: 'Waiting rooms',
    caption: 'Open seats are still available, so these are the best rooms for fresh players to join.',
  },
];

@Component({
  selector: 'lib-go-online-lobby-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HostedShellHeaderComponent],
  templateUrl: './online-lobby-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyPageComponent {
  protected readonly onlineLobby = inject(OnlineLobbyService);
  protected readonly onlineRoom = inject(OnlineRoomService);

  private readonly router = inject(Router);
  private readonly selectedRoomIdSignal = signal<string | null>(null);

  protected readonly displayName = new FormControl(
    this.onlineRoom.displayName() || 'Host',
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
    switch (status) {
      case 'live':
        return 'Live';
      case 'ready':
        return 'Ready';
      default:
        return 'Waiting';
    }
  }

  protected roomStatusHeadline(room: LobbyRoomSummary): string {
    switch (room.status) {
      case 'live':
        return 'Watch the live board and join chat as a spectator.';
      case 'ready':
        return 'Players are seated, and the host can start as soon as everyone is ready.';
      default:
        return 'Join the room, claim a seat inside, and get the next match moving.';
    }
  }

  protected roomStatusCopy(room: LobbyRoomSummary): string {
    switch (room.status) {
      case 'live':
        return 'Joining from the lobby takes you straight into spectator chat while the active game stays locked.';
      case 'ready':
        return 'Enter the room to chat, confirm the lineup, or spectate the start countdown.';
      default:
        return 'Enter the room first, then claim black or white from the in-room seat controls.';
    }
  }

  protected roomModeLabel(room: LobbyRoomSummary): string {
    if (!room.mode || !room.boardSize) {
      return 'Mode and board size are chosen in-room before the match begins.';
    }

    return `${room.mode === 'go' ? 'Go' : 'Gomoku'} on a ${room.boardSize} x ${room.boardSize} board`;
  }

  protected roomActionLabel(room: LobbyRoomSummary): string {
    return room.status === 'live'
      ? 'Watch and chat live'
      : 'Join selected room';
  }

  protected roomActionHint(room: LobbyRoomSummary): string {
    return room.status === 'live'
      ? 'You will enter as a spectator while the match is live.'
      : 'Seat claims and host controls stay inside the room after you join.';
  }

  protected seatLabel(name: string | null, color: 'black' | 'white'): string {
    return name ?? `Open ${color} seat`;
  }

  protected countLabel(
    count: number,
    singular: string,
    plural = `${singular}s`
  ): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }
}
