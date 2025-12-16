import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

export enum LogType {
  WEB_ERROR = 'web-error',
  DB_ERROR = 'db-error',
  AUTH_ERROR = 'auth-error',
  API_ERROR = 'api-error',
  SYSTEM_ERROR = 'system-error',
  ACCESS = 'access',
  APPLICATION = 'application',
}

@Injectable()
export class CustomLoggerService implements LoggerService {
  private loggers: Map<LogType, winston.Logger> = new Map();
  private defaultLogger: winston.Logger;

  constructor() {
    const logDir = process.env.LOG_DIR || './logs';

    // 공통 포맷 설정
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        // 메타데이터가 있으면 추가
        if (Object.keys(meta).length > 0) {
          log += `\n${JSON.stringify(meta, null, 2)}`;
        }

        // 스택 트레이스가 있으면 추가
        if (stack) {
          log += `\n${stack}`;
        }

        return log;
      }),
    );

    // 각 로그 타입별 로거 생성
    Object.values(LogType).forEach((logType) => {
      const logger = winston.createLogger({
        format: logFormat,
        transports: [
          new DailyRotateFile({
            filename: path.join(logDir, `${logType}-%DATE%.log`),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
          }),
        ],
      });

      this.loggers.set(logType, logger);
    });

    // 기본 애플리케이션 로거 (info 레벨 포함)
    this.defaultLogger = winston.createLogger({
      format: logFormat,
      transports: [
        new DailyRotateFile({
          filename: path.join(logDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: process.env.LOG_LEVEL || 'info',
        }),
        // 개발 환경에서는 콘솔에도 출력
        ...(process.env.NODE_ENV === 'development'
          ? [
              new winston.transports.Console({
                format: winston.format.combine(
                  winston.format.colorize(),
                  logFormat,
                ),
              }),
            ]
          : []),
      ],
    });
  }

  /**
   * 특정 타입의 에러 로그 기록
   */
  logError(logType: LogType, message: string, error?: Error | any, meta?: any) {
    const logger = this.loggers.get(logType) || this.defaultLogger;

    const logData: any = {
      message,
      ...meta,
    };

    if (error) {
      if (error instanceof Error) {
        logData.error = error.message;
        logData.stack = error.stack;
      } else {
        logData.error = JSON.stringify(error);
      }
    }

    logger.error(logData);
  }

  /**
   * 웹 에러 로그
   */
  logWebError(message: string, error?: Error, meta?: any) {
    this.logError(LogType.WEB_ERROR, message, error, meta);
  }

  /**
   * DB 에러 로그
   */
  logDbError(message: string, error?: Error, meta?: any) {
    this.logError(LogType.DB_ERROR, message, error, meta);
  }

  /**
   * 인증 에러 로그
   */
  logAuthError(message: string, error?: Error, meta?: any) {
    this.logError(LogType.AUTH_ERROR, message, error, meta);
  }

  /**
   * API 에러 로그
   */
  logApiError(message: string, error?: Error, meta?: any) {
    this.logError(LogType.API_ERROR, message, error, meta);
  }

  /**
   * 시스템 에러 로그
   */
  logSystemError(message: string, error?: Error, meta?: any) {
    this.logError(LogType.SYSTEM_ERROR, message, error, meta);
  }

  /**
   * 접근 로그 (성공적인 요청)
   */
  logAccess(message: string, meta?: any) {
    const logger = this.loggers.get(LogType.ACCESS);
    if (logger) {
      logger.info({ message, ...meta });
    }
  }

  // NestJS LoggerService 인터페이스 구현
  log(message: any, context?: string) {
    this.defaultLogger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.defaultLogger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.defaultLogger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.defaultLogger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.defaultLogger.verbose(message, { context });
  }
}
