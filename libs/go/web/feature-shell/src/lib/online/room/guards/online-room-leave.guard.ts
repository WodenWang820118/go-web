import { CanDeactivateFn } from '@angular/router';

export interface OnlineRoomLeaveAware {
  canDeactivateRoomPage(nextUrl: string | null): boolean;
}

export const onlineRoomLeaveGuard: CanDeactivateFn<OnlineRoomLeaveAware> = (
  component,
  _currentRoute,
  _currentState,
  nextState
) => component.canDeactivateRoomPage(nextState?.url ?? null);
