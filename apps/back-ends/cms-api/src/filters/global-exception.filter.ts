import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message || exception.message;
      errorCode = exceptionResponse.error || 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = 'UNKNOWN_ERROR';
    }

    // Log the error
    this.logger.error(`Exception occurred: ${message}`, {
      path: request.url,
      method: request.method,
      statusCode: status,
      errorCode,
      timestamp: new Date().toISOString(),
      userAgent: request.get('User-Agent'),
      ip: request.ip,
    });

    // Return consistent error response
    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
