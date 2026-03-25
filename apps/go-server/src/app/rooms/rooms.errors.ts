import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { createMessage, GoMessageDescriptor } from '@gx/go/domain';

type MessageParams = GoMessageDescriptor['params'];

export function roomMessage(
  key: string,
  params?: MessageParams
): GoMessageDescriptor {
  return createMessage(key, params);
}

export function badRequestMessage(
  key: string,
  params?: MessageParams
): BadRequestException {
  return new BadRequestException({
    message: roomMessage(key, params),
  });
}

export function conflictMessage(
  key: string,
  params?: MessageParams
): ConflictException {
  return new ConflictException({
    message: roomMessage(key, params),
  });
}

export function forbiddenMessage(
  key: string,
  params?: MessageParams
): ForbiddenException {
  return new ForbiddenException({
    message: roomMessage(key, params),
  });
}

export function notFoundMessage(
  key: string,
  params?: MessageParams
): NotFoundException {
  return new NotFoundException({
    message: roomMessage(key, params),
  });
}

export function throttledMessage(
  key: string,
  params?: MessageParams
): HttpException {
  return new HttpException(
    {
      message: roomMessage(key, params),
    },
    HttpStatus.TOO_MANY_REQUESTS
  );
}
