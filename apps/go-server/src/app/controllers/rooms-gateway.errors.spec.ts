import { BadRequestException } from '@nestjs/common';
import { createMessage } from '@gx/go/domain';
import { createCommandErrorEvent } from './rooms-gateway.errors';

describe('rooms-gateway.errors', () => {
  it('falls back to the default internal error payload for unknown errors', () => {
    expect(createCommandErrorEvent(new Error('boom'))).toEqual({
      code: 'internal_error',
      message: createMessage('room.error.unexpected_server_error'),
    });
  });

  it('maps http exceptions to their status code and message descriptor', () => {
    const message = createMessage('room.error.not_found', {
      roomId: 'ROOM-1',
    });

    expect(
      createCommandErrorEvent(
        new BadRequestException({
          message,
        }),
      ),
    ).toEqual({
      code: '400',
      message,
    });
  });

  it('extracts the first localized message descriptor from array responses', () => {
    const message = createMessage('room.error.chat_required');

    expect(
      createCommandErrorEvent(
        new BadRequestException({
          message: [
            'ignored',
            message,
            createMessage('room.error.not_your_turn'),
          ],
        }),
      ),
    ).toEqual({
      code: '400',
      message,
    });
  });

  it('keeps the status code but falls back to the default message for string responses', () => {
    expect(
      createCommandErrorEvent(new BadRequestException('simple error message')),
    ).toEqual({
      code: '400',
      message: createMessage('room.error.unexpected_server_error'),
    });
  });
});
