import { createMessage, isMessageDescriptor } from '@gx/go/domain';
import { type CommandErrorEvent } from '@gx/go/contracts';
import { HttpException } from '@nestjs/common';

/**
 * Normalizes thrown command errors into the websocket payload expected by clients.
 */
export function createCommandErrorEvent(error: unknown): CommandErrorEvent {
  const payload: CommandErrorEvent = {
    code: 'internal_error',
    message: createMessage('room.error.unexpected_server_error'),
  };

  if (!(error instanceof HttpException)) {
    return payload;
  }

  const response = error.getResponse();
  const message =
    typeof response === 'string'
      ? null
      : Array.isArray((response as { message?: unknown }).message)
        ? ((response as { message: unknown[] }).message.find(
            isMessageDescriptor,
          ) ?? null)
        : isMessageDescriptor((response as { message?: unknown }).message)
          ? (response as { message: ReturnType<typeof createMessage> }).message
          : null;

  payload.code = String(error.getStatus());

  if (message) {
    payload.message = message;
  }

  return payload;
}
