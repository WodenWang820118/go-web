import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GoAnalyticsErrorType } from '@gx/go/state';

@Injectable({ providedIn: 'root' })
export class OnlineRoomAnalyticsErrorService {
  describe(error: unknown): GoAnalyticsErrorType {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'not_found';
      }

      if (error.status === 0) {
        return 'network';
      }
    }

    return 'unexpected';
  }
}
