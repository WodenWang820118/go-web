import { Injectable } from '@angular/core';

export type GoServerOriginLocation = Pick<Location, 'protocol' | 'hostname' | 'port'>;
export type GoServerOriginStorage = Pick<Storage, 'getItem'>;

function readGlobalStorage(): GoServerOriginStorage | undefined {
  return typeof globalThis.localStorage === 'undefined'
    ? undefined
    : globalThis.localStorage;
}

function normalizeOriginOverride(value: string | null): string {
  return value?.trim().replace(/\/+$/, '') ?? '';
}

@Injectable({ providedIn: 'root' })
export class GoServerOriginResolverService {
  resolveOrigin(
    location: GoServerOriginLocation | undefined = globalThis.location,
    storage: GoServerOriginStorage | undefined = readGlobalStorage(),
  ): string {
    return GoServerOriginResolverService.resolveOriginValue(location, storage);
  }

  static resolveOriginValue(
    location: GoServerOriginLocation | undefined,
    storage: GoServerOriginStorage | undefined,
  ): string {
    if (!location) {
      return '';
    }

    const override = normalizeOriginOverride(
      storage?.getItem('gx.go.serverOrigin') ?? null,
    );

    if (override) {
      return override;
    }

    if (location.port === '4200' || location.port === '4201') {
      return `${location.protocol}//${location.hostname}:3000`;
    }

    return '';
  }
}
