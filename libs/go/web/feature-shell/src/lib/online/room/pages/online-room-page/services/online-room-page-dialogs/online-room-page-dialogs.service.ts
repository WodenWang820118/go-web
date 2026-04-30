import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { OnlineRoomService } from '../../../../services/online-room/online-room.service';
import { OnlineRoomPageViewStateService } from '../online-room-page-view-state/online-room-page-view-state.service';

@Injectable()
export class OnlineRoomPageDialogsService {
  private readonly onlineRoom = inject(OnlineRoomService);
  private readonly view = inject(OnlineRoomPageViewStateService);
  private lastRematchDialogKey: string | null = null;
  private lastResignDialogKey: string | null = null;
  private readonly dismissedNigiriDialogKey = signal<string | null>(null);

  readonly nigiriDialogVisible = computed(() => {
    const panel = this.view.nigiriPanel();

    if (!panel) {
      return false;
    }

    if (panel.canGuess) {
      return true;
    }

    const dialogKey = this.nigiriDialogKey();

    return !!dialogKey && dialogKey !== this.dismissedNigiriDialogKey();
  });
  readonly rematchDialogVisible = signal(false);
  readonly resignResultDialogVisible = signal(false);
  readonly nextMatchSettingsDialogVisible = signal(false);
  readonly shouldShowRematchDialog = computed(
    () =>
      this.view.match()?.state.phase === 'finished' &&
      !!this.view.rematch() &&
      !this.resignResultDialogVisible(),
  );
  readonly resignResultMessage = computed(() => {
    const match = this.view.match();

    if (
      !match ||
      match.state.phase !== 'finished' ||
      match.state.result?.reason !== 'resign'
    ) {
      return null;
    }

    return this.view.i18n.translateMessage(match.state.result.summary);
  });

  constructor() {
    effect(() => {
      const resignDialogKey = this.resignDialogKey();

      if (!resignDialogKey || resignDialogKey === this.lastResignDialogKey) {
        return;
      }

      this.lastResignDialogKey = resignDialogKey;
      this.resignResultDialogVisible.set(true);
    });

    effect(() => {
      if (!this.resignResultMessage()) {
        this.resignResultDialogVisible.set(false);
      }
    });

    effect(() => {
      if (!this.view.nextMatchSettings()) {
        this.nextMatchSettingsDialogVisible.set(false);
      }
    });

    effect(() => {
      const rematchDialogKey = this.rematchDialogKey();

      if (!this.shouldShowRematchDialog() || !rematchDialogKey) {
        this.rematchDialogVisible.set(false);
        return;
      }

      if (rematchDialogKey === this.lastRematchDialogKey) {
        return;
      }

      this.lastRematchDialogKey = rematchDialogKey;
      this.rematchDialogVisible.set(true);
    });
  }

  acceptRematch(): void {
    this.onlineRoom.respondToRematch(true);
    this.rematchDialogVisible.set(false);
  }

  declineRematch(): void {
    this.onlineRoom.respondToRematch(false);
    this.rematchDialogVisible.set(false);
  }

  dismissRematchDialog(): void {
    this.rematchDialogVisible.set(false);
  }

  dismissResignResultDialog(): void {
    this.resignResultDialogVisible.set(false);
  }

  dismissNigiriDialog(): void {
    const dialogKey = this.nigiriDialogKey();

    if (dialogKey) {
      this.dismissedNigiriDialogKey.set(dialogKey);
    }
  }

  openNextMatchSettingsDialog(): void {
    if (!this.view.nextMatchSettings()) {
      return;
    }

    this.nextMatchSettingsDialogVisible.set(true);
  }

  dismissNextMatchSettingsDialog(): void {
    this.nextMatchSettingsDialogVisible.set(false);
  }

  private nigiriDialogKey(): string | null {
    const nigiri = this.view.nigiri();

    if (!nigiri || nigiri.status !== 'pending') {
      return null;
    }

    return [nigiri.commitment, nigiri.guesser].join(':');
  }

  private resignDialogKey(): string | null {
    const match = this.view.match();

    if (
      !match ||
      match.state.phase !== 'finished' ||
      match.state.result?.reason !== 'resign'
    ) {
      return null;
    }

    return [
      match.startedAt,
      match.state.result.winner,
      match.state.result.resignedBy ?? '',
      match.state.moveHistory.length,
    ].join(':');
  }

  private rematchDialogKey(): string | null {
    const match = this.view.match();
    const rematch = this.view.rematch();

    if (!match || match.state.phase !== 'finished' || !rematch) {
      return null;
    }

    return [
      match.startedAt,
      rematch.participants.black,
      rematch.participants.white,
    ].join(':');
  }
}
