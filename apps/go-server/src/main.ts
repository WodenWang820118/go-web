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

  try {
    await app.listen(port, host);
    Logger.log(`go-server listening on http://${host}:${port}/api`);
  } catch (error) {
    if ((error as { code?: string }).code === 'EADDRINUSE') {
      Logger.error(
        `Port ${port} is already in use at ${host}. Please ensure the port is available (e.g., stop any existing services).`,
      );
      process.exit(1);
    } else {
      throw error;
    }
  }
}

void bootstrap();
