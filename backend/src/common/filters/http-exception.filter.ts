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
    else if (this.isPrismaError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      logType = LogType.DB_ERROR;

      // Prisma 에러 메시지 간소화
      if (exception instanceof Prisma.PrismaClientKnownRequestError) {
        const knownError = exception as Prisma.PrismaClientKnownRequestError;
        switch (knownError.code) {
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

    // 프로덕션 환경에서도 사용자 친화적인 에러 메시지 반환
    // HttpException의 경우 개발자가 명시적으로 작성한 메시지이므로 그대로 전달
    // 단, 스택 트레이스 등의 상세 정보는 개발 환경에서만 제공
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttpException = exception instanceof HttpException;

    // HttpException이면 메시지를 그대로 사용하고, 아니면 일반 메시지 사용
    const finalMessage = isHttpException ? message : this.getGenericErrorMessage(status);

    response.status(status).json({
      statusCode: status,
      message: finalMessage,
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
   * Prisma 에러인지 확인하는 타입 가드
   */
  private isPrismaError(exception: unknown): exception is Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError | Prisma.PrismaClientValidationError {
    return (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientValidationError
    );
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
