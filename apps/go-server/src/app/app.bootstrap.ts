import { INestApplication } from '@nestjs/common';
import { AppValidationPipeFactory } from './app-validation-pipe.factory';

/**
 * Applies the shared Nest bootstrap configuration for the hosted room API.
 */
export function configureApp(app: INestApplication): void {
  // #region HTTP defaults
  app.setGlobalPrefix('api');
  // #endregion

  // #region Validation
  app.useGlobalPipes(app.get(AppValidationPipeFactory).create());
  // #endregion

  // #region Transport
  app.enableCors({
    origin: true,
  });

  const instance = app.getHttpAdapter().getInstance();
  instance.set('trust proxy', true);
  // #endregion
}
