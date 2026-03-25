import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { createMessage, GoMessageDescriptor } from '@gx/go/domain';

const MAX_DISPLAY_NAME_LENGTH = 24;
const MAX_PARTICIPANT_TOKEN_LENGTH = 128;

function flattenValidationErrors(
  errors: ValidationError[]
): ValidationError[] {
  return errors.flatMap(error =>
    error.children?.length
      ? flattenValidationErrors(error.children)
      : [error]
  );
}

function validationMessages(errors: ValidationError[]): GoMessageDescriptor[] {
  return flattenValidationErrors(errors).flatMap(error => {
    const keys = Object.keys(error.constraints ?? {});

    return keys.map(key => {
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

/**
 * Applies the shared Nest bootstrap configuration for the hosted room API.
 */
export function configureApp(app: INestApplication): void {
  // #region HTTP defaults
  app.setGlobalPrefix('api');
  // #endregion

  // #region Validation
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: errors =>
        new BadRequestException({
          message: validationMessages(errors),
        }),
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
  // #endregion

  // #region Transport
  app.enableCors({
    origin: true,
  });

  const instance = app.getHttpAdapter().getInstance();
  instance.set('trust proxy', true);
  // #endregion
}
