import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const incomingId = req.headers['x-request-id'] as string | undefined;
    (req as any).requestId = incomingId && incomingId.length <= 128 ? incomingId : uuidv4();
    next();
  }
}
