import '@angular/compiler';
import {
  GO_SERVER_ORIGIN_STORAGE_KEY,
  resolveGoServerOrigin,
} from './go-server-origin.token';
import { Injector, runInInjectionContext } from '@angular/core';
import { GoServerOriginResolverService } from './go-server-origin-resolver.service';

describe('resolveGoServerOrigin', () => {
  it('prefers the stored override when one is present', () => {
    const storage = {
      getItem: (key: string) =>
        key === GO_SERVER_ORIGIN_STORAGE_KEY ? 'http://127.0.0.1:3001/' : null,
    };

    expect(
      resolveGoServerOrigin(
        {
          protocol: 'http:',
          hostname: 'localhost',
          port: '4200',
        },
        storage,
      ),
    ).toBe('http://127.0.0.1:3001');
  });

  it('falls back to the local go-server port for the Angular dev server', () => {
    expect(
      resolveGoServerOrigin(
        {
          protocol: 'http:',
          hostname: 'localhost',
          port: '4200',
        },
        undefined,
      ),
    ).toBe('http://localhost:3000');
  });

  it('supports the DI-backed factory path used by the Angular app config', () => {
    const originalLocation = globalThis.location;
    const injector = Injector.create({
      providers: [GoServerOriginResolverService],
    });

    try {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: {
          protocol: 'http:',
          hostname: 'localhost',
          port: '4200',
        },
      });

      expect(
        runInInjectionContext(injector, () => resolveGoServerOrigin()),
      ).toBe('http://localhost:3000');
    } finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});
