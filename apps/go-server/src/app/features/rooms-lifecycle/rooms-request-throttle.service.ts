import { Inject, Injectable } from '@nestjs/common';
import { THROTTLE_WINDOW_MS } from '../../core/rooms-config/rooms.constants';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';

@Injectable()
export class RoomsRequestThrottleService {
  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
  ) {}

  assertWithinLimit(key: string, limit: number, messageKey: string): void {
    const now = Date.now();
    const timestamps = (this.store.attemptWindows.get(key) ?? []).filter(
      (timestamp) => now - timestamp < THROTTLE_WINDOW_MS,
    );

    if (timestamps.length >= limit) {
      this.store.attemptWindows.set(key, timestamps);
      throw this.roomsErrors.throttled(messageKey);
    }

    timestamps.push(now);
    this.store.attemptWindows.set(key, timestamps);
  }
}
