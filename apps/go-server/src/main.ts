import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './app/app.bootstrap';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '127.0.0.1';

  await app.listen(port, host);
  Logger.log(`go-server listening on http://${host}:${port}/api`);
}

void bootstrap();
