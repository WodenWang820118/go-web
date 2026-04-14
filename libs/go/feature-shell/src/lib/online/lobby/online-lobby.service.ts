import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { LobbyRoomSummary } from '@gx/go/contracts';
import { EMPTY, Subscription, catchError, finalize, tap } from 'rxjs';
import { OnlineRoomsHttpService } from '../room/services/online-rooms-http.service';

/**
 * Facade for the public hosted-room lobby.
 */
@Injectable({ providedIn: 'root' })
export class OnlineLobbyService {
  private readonly api = inject(OnlineRoomsHttpService);
  private refreshSubscription: Subscription | null = null;

  private readonly roomsSignal = signal<LobbyRoomSummary[]>([]);
  private readonly loadingSignal = signal(true);
  private readonly lastErrorSignal = signal<string | null>(null);
  private readonly initializedSignal = signal(false);

  readonly rooms = this.roomsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly lastError = this.lastErrorSignal.asReadonly();
  readonly hasRooms = computed(() => this.roomsSignal().length > 0);

  /**
   * Refreshes the publicly visible room summaries while collapsing overlapping requests.
   */
  refresh(): void {
    if (this.refreshSubscription) {
      return;
    }

    const isInitialLoad = !this.initializedSignal();

    if (isInitialLoad) {
      this.loadingSignal.set(true);
    }

    this.lastErrorSignal.set(null);

    this.refreshSubscription = this.api
      .listRooms()
      .pipe(
        tap(response => {
          this.roomsSignal.set([...response.rooms]);
          this.initializedSignal.set(true);
        }),
        catchError((error: unknown) => {
          this.initializedSignal.set(true);

          if (this.isMissingLobby(error)) {
            this.roomsSignal.set([]);
            return EMPTY;
          }

          this.lastErrorSignal.set(
            this.api.describeHttpError(
              error,
              'lobby.error.load_failed'
            )
          );
          return EMPTY;
        }),
        finalize(() => {
          if (isInitialLoad) {
            this.loadingSignal.set(false);
          }

          this.refreshSubscription = null;
        })
      )
      .subscribe();
  }

  private isMissingLobby(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse && error.status === 404;
  }
}
