import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId || uuidv4();
    const path = request.url;
    const method = request.method;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Unable to process request';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const resObj = exResponse as Record<string, unknown>;
        message = (resObj.message as string) || message;
        code = (resObj.error as string) || code;
        if (Array.isArray(message)) {
          message = message.join('; ');
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'Internal server error';
    }

    const statusCode = status;

    if (statusCode >= 500) {
      this.logger.error(
        `${method} ${path} ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (statusCode >= 400) {
      this.logger.warn(`${method} ${path} ${statusCode} ${message}`);
    }

    response.status(statusCode).json({
      success: false,
      message,
      error: { code },
      requestId,
    });
  }
}
