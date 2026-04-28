import {
  BadRequestException,
  Injectable,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { createMessage, GoMessageDescriptor } from '@gx/go/domain';

const MAX_DISPLAY_NAME_LENGTH = 24;
const MAX_PARTICIPANT_TOKEN_LENGTH = 128;

@Injectable()
export class AppValidationPipeFactory {
  create(): ValidationPipe {
    return new ValidationPipe({
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: this.validationMessages(errors),
        }),
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  private flattenValidationErrors(
    errors: ValidationError[],
  ): ValidationError[] {
    return errors.flatMap((error) =>
      error.children?.length
        ? this.flattenValidationErrors(error.children)
        : [error],
    );
  }

  private validationMessages(errors: ValidationError[]): GoMessageDescriptor[] {
    return this.flattenValidationErrors(errors).flatMap((error) => {
      const keys = Object.keys(error.constraints ?? {});

      return keys.map((key) => {
        switch (`${error.property}:${key}`) {
          case 'displayName:minLength':
            return createMessage('room.error.display_name_required');
          case 'displayName:maxLength':
            return createMessage('room.error.display_name_too_long', {
              max: MAX_DISPLAY_NAME_LENGTH,
            });
          case 'displayName:isString':
            return createMessage('room.validation.display_name_string');
          case 'participantToken:maxLength':
            return createMessage('room.validation.participant_token_too_long', {
              max: MAX_PARTICIPANT_TOKEN_LENGTH,
            });
          case 'participantToken:isString':
            return createMessage('room.validation.participant_token_string');
          case 'mode:isString':
            return createMessage('room.validation.mode_string');
          case 'mode:isIn':
            return createMessage('room.error.unsupported_mode');
          case 'boardSize:isInt':
          case 'boardSize:min':
          case 'boardSize:max':
            return createMessage('room.validation.board_size_invalid');
          case 'komi:min':
          case 'komi:max':
            return createMessage('room.validation.komi_invalid');
          default:
            return createMessage('room.validation.invalid_payload');
        }
      });
    });
  }
}
