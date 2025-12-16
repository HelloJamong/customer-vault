import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService, LogType } from '../logger/logger.service';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let logType = LogType.SYSTEM_ERROR;

    // HTTP 예외 처리
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || message;

      // 로그 타입 결정
      if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
        logType = LogType.AUTH_ERROR;
      } else if (status >= 400 && status < 500) {
        logType = LogType.WEB_ERROR;
      } else {
        logType = LogType.API_ERROR;
      }
    }
    // Prisma 에러 처리
    else if (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientValidationError
    ) {
      status = HttpStatus.BAD_REQUEST;
      logType = LogType.DB_ERROR;

      // Prisma 에러 메시지 간소화
      if (exception instanceof Prisma.PrismaClientKnownRequestError) {
        switch (exception.code) {
          case 'P2002':
            message = 'Duplicate entry error';
            break;
          case 'P2025':
            message = 'Record not found';
            status = HttpStatus.NOT_FOUND;
            break;
          case 'P2003':
            message = 'Foreign key constraint failed';
            break;
          default:
            message = 'Database operation failed';
        }
      } else {
        message = 'Database error';
      }
    }
    // 일반 에러 처리
    else if (exception instanceof Error) {
      message = 'Internal server error';
      logType = LogType.SYSTEM_ERROR;
    }

    // 에러 로그 기록 (상세 정보 포함)
    this.logger.logError(
      logType,
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception : undefined,
      {
        ip: request.ip,
        userAgent: request.get('user-agent'),
        body: this.sanitizeBody(request.body),
        query: request.query,
        params: request.params,
        statusCode: status,
      },
    );

    // 프로덕션 환경에서는 간단한 에러 메시지만 반환
    const isProduction = process.env.NODE_ENV === 'production';

    response.status(status).json({
      statusCode: status,
      message: isProduction ? this.getGenericErrorMessage(status) : message,
      timestamp: new Date().toISOString(),
      path: request.url,
      // 개발 환경에서만 상세 정보 제공
      ...((!isProduction && exception instanceof Error) && {
        error: exception.name,
        stack: exception.stack,
      }),
    });
  }

  /**
   * 상태 코드에 따른 일반적인 에러 메시지 반환
   */
  private getGenericErrorMessage(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return 'Method Not Allowed';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      case HttpStatus.BAD_GATEWAY:
        return 'Bad Gateway';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service Unavailable';
      default:
        return 'An error occurred';
    }
  }

  /**
   * 민감한 정보 제거 (비밀번호 등)
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'accessToken', 'refreshToken'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
