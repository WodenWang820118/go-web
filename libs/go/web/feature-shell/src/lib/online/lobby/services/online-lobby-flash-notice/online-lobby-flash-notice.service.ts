import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OnlineLobbyFlashNoticeService {
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly messageSignal = signal<string | null>(null);

  readonly message = this.messageSignal.asReadonly();

  show(message: string, durationMs = 4000): void {
    this.messageSignal.set(message);
    this.clearTimer();

    if (durationMs <= 0) {
      return;
    }

    this.dismissTimer = setTimeout(() => {
      this.messageSignal.set(null);
      this.dismissTimer = null;
    }, durationMs);
  }

  clear(): void {
    this.clearTimer();
    this.messageSignal.set(null);
  }

  private clearTimer(): void {
    if (this.dismissTimer === null) {
      return;
    }

    clearTimeout(this.dismissTimer);
    this.dismissTimer = null;
  }
}
