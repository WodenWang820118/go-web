import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LobbyRoomStatus, LobbyRoomSummary } from '@org/go/contracts';
import { EMPTY, catchError, from, interval, switchMap, take } from 'rxjs';
import { OnlineLobbyService } from '../online/online-lobby.service';
import { OnlineRoomService } from '../online/online-room.service';

interface LobbySectionDefinition {
  status: LobbyRoomStatus;
  title: string;
  caption: string;
}

const LOBBY_SECTIONS: LobbySectionDefinition[] = [
  {
    status: 'live',
    title: 'Live rooms',
    caption: 'Watch ongoing games and jump into room chat while seats stay locked.',
  },
  {
    status: 'ready',
    title: 'Ready rooms',
    caption: 'Both seats are filled and the host can start the next match at any time.',
  },
  {
    status: 'waiting',
    title: 'Waiting rooms',
    caption: 'Open seats are still available for players to match up.',
  },
];

@Component({
  selector: 'lib-go-online-lobby-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './online-lobby-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyPageComponent {
  protected readonly onlineLobby = inject(OnlineLobbyService);
  protected readonly onlineRoom = inject(OnlineRoomService);

  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    displayName: new FormControl(this.onlineRoom.displayName() || 'Host', {
      nonNullable: true,
    }),
  });
  protected readonly sections = computed(() =>
    LOBBY_SECTIONS.map(section => ({
      ...section,
      rooms: this.onlineLobby.rooms().filter(room => room.status === section.status),
    }))
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

      if (displayName && this.form.controls.displayName.value !== displayName) {
        this.form.controls.displayName.setValue(displayName, {
          emitEvent: false,
        });
      }
    });
  }

  protected createRoom(): void {
    this.onlineRoom
      .createRoom(this.form.controls.displayName.value)
      .pipe(
        switchMap(response => from(this.router.navigate(['/online/room', response.roomId]))),
        catchError(() => EMPTY),
        take(1)
      )
      .subscribe();
  }

  protected roomStatusLabel(status: LobbyRoomStatus): string {
    switch (status) {
      case 'live':
        return 'Live - watch and chat';
      case 'ready':
        return 'Ready - waiting for host start';
      default:
        return 'Waiting - open seats';
    }
  }

  protected roomActionLabel(room: LobbyRoomSummary): string {
    return room.status === 'live' ? 'Watch room' : 'Open room';
  }

  protected roomModeLabel(room: LobbyRoomSummary): string {
    if (!room.mode || !room.boardSize) {
      return 'Mode selected in room';
    }

    return `${room.mode === 'go' ? 'Go' : 'Gomoku'} - ${room.boardSize} x ${room.boardSize}`;
  }

  protected roomStatusCopy(room: LobbyRoomSummary): string {
    switch (room.status) {
      case 'live':
        return 'New visitors join as spectators and can chat until the current match ends.';
      case 'ready':
        return 'Both seats are filled. Open the room to follow the countdown to the host start.';
      default:
        return 'Players can still claim black or white before the next hosted match begins.';
    }
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
