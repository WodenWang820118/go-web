import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createMessage, GoMessageDescriptor } from '@gx/go/domain';

type MessageParams = GoMessageDescriptor['params'];

@Injectable()
export class RoomsErrorsService {
  roomMessage(key: string, params?: MessageParams): GoMessageDescriptor {
    return createMessage(key, params);
  }

  badRequest(key: string, params?: MessageParams): BadRequestException {
    return new BadRequestException({
      message: this.roomMessage(key, params),
    });
  }

  conflict(key: string, params?: MessageParams): ConflictException {
    return new ConflictException({
      message: this.roomMessage(key, params),
    });
  }

  forbidden(key: string, params?: MessageParams): ForbiddenException {
    return new ForbiddenException({
      message: this.roomMessage(key, params),
    });
  }

  notFound(key: string, params?: MessageParams): NotFoundException {
    return new NotFoundException({
      message: this.roomMessage(key, params),
    });
  }

  throttled(key: string, params?: MessageParams): HttpException {
    return new HttpException(
      {
        message: this.roomMessage(key, params),
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
