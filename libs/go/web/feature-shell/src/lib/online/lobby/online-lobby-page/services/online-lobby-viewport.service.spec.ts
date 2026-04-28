import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { OnlineLobbyViewportService } from './online-lobby-viewport.service';

describe('OnlineLobbyViewportService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the current media-query match as the initial state', () => {
    stubMatchMedia(true);

    const service = createService();

    expect(service.isMdUp()).toBe(true);
  });

  it('updates the viewport signal when the media query changes', () => {
    const mediaQuery = stubMatchMedia(true);
    const destroyRef = createDestroyRef();
    const service = createService();

    service.bind(destroyRef.ref);
    mediaQuery.emit(false);

    expect(service.isMdUp()).toBe(false);
  });

  it('removes the media-query listener on destroy', () => {
    const mediaQuery = stubMatchMedia(true);
    const destroyRef = createDestroyRef();
    const service = createService();

    service.bind(destroyRef.ref);
    destroyRef.destroy();

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
      'change',
      mediaQuery.listener,
    );
  });

  it('treats missing browser media-query APIs as desktop width', () => {
    vi.stubGlobal('matchMedia', undefined);
    const destroyRef = createDestroyRef();
    let service: OnlineLobbyViewportService | null = null;

    expect(() => {
      service = createService();
      service.bind(destroyRef.ref);
    }).not.toThrow();

    expect(service?.isMdUp()).toBe(true);
    expect(destroyRef.onDestroy).not.toHaveBeenCalled();
  });
});

function createService(): OnlineLobbyViewportService {
  TestBed.configureTestingModule({
    providers: [OnlineLobbyViewportService],
  });

  return TestBed.inject(OnlineLobbyViewportService);
}

function createDestroyRef() {
  const callbacks: Array<() => void> = [];
  const onDestroy = vi.fn((callback: () => void) => {
    callbacks.push(callback);
    return () => undefined;
  });

  return {
    ref: {
      onDestroy,
    } as unknown as DestroyRef,
    onDestroy,
    destroy: () => {
      for (const callback of callbacks) {
        callback();
      }
    },
  };
}

function stubMatchMedia(matches: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | null = null;
  const mediaQuery = {
    matches,
    media: '(min-width: 768px)',
    onchange: null,
    addEventListener: vi.fn(
      (event: 'change', callback: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listener = callback;
        }
      },
    ),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    get listener() {
      return listener;
    },
    emit(nextMatches: boolean) {
      listener?.({ matches: nextMatches } as MediaQueryListEvent);
    },
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery),
  );

  return mediaQuery;
}
