import { DestroyRef, Injectable, signal } from '@angular/core';

@Injectable()
export class OnlineLobbyViewportService {
  private readonly mdUpSignal = signal(this.resolveMdUp());
  readonly isMdUp = this.mdUpSignal.asReadonly();

  bind(destroyRef: DestroyRef): void {
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
    destroyRef.onDestroy(() => {
      mediaQuery.removeEventListener('change', listener);
    });
  }

  private resolveMdUp(): boolean {
    return typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia('(min-width: 768px)').matches;
  }
}
