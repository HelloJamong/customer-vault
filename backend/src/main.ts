import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as express from 'express';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'development' ? ['log', 'error', 'warn', 'debug'] : ['error', 'warn'],
    bodyParser: true, // NestJS 기본 body parser 사용 (쿠키 처리 개선)
  });

  // Trust proxy to get real client IP from X-Forwarded-For header
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // ConfigModule이 .env를 로드한 후 필수 환경 변수 검증
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || !/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    console.error('❌ ENCRYPTION_KEY 환경 변수가 유효하지 않습니다. 64자리 hex 문자열이 필요합니다.');
    console.error('   생성: openssl rand -hex 32');
    await app.close();
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error('❌ JWT_SECRET 환경 변수가 유효하지 않습니다. 32자 이상의 문자열이 필요합니다.');
    console.error('   생성: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    await app.close();
    process.exit(1);
  }

  // Enable CORS first - before any other middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'development'
      ? true
      : process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
        : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
  }));

  // 커스텀 로거 설정
  const customLogger = new CustomLoggerService();
  app.useLogger(customLogger);

  // 전역 예외 필터 적용
  app.useGlobalFilters(new AllExceptionsFilter(customLogger));

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // 오프라인 환경 호환성을 위해 false로 변경
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Customer Storage API')
    .setDescription('고객사 정보 및 유지보수 점검 이력 관리 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.BACKEND_PORT || process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
