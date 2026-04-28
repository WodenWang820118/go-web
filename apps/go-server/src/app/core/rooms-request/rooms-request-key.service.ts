import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class RoomsRequestKeyService {
  fromRequest(request: Request, action: string): string {
    return `${action}:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
  }
}
