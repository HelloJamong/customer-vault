import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as express from 'express';
import * as cors from 'cors';
import { SessionActivityInterceptor } from './auth/interceptors/session-activity.interceptor';
import { getTrustProxySetting } from './common/utils/trust-proxy.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'development' ? ['log', 'error', 'warn', 'debug'] : ['error', 'warn'],
    bodyParser: true, // NestJS 기본 body parser 사용 (쿠키 처리 개선)
  });

  // Trust only explicitly configured proxy addresses when available. This avoids
  // trusting client-supplied X-Forwarded-For values on shorter/direct paths.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set(
    'trust proxy',
    getTrustProxySetting(process.env.TRUST_PROXY_ADDRESSES, process.env.TRUST_PROXY_HOPS),
  );

  // ConfigModule이 .env를 로드한 후 필수 환경 변수 검증
  // 리포지토리/문서에 공개된 기본값은 형식 검증을 통과하더라도 거부한다.
  const KNOWN_WEAK_SECRETS = new Set([
    'please-change-this-secret-key-in-production-environment',
    '0'.repeat(64),
    'changeme',
    'secret',
    'your-secret-key',
  ]);

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (
    !encryptionKey ||
    !/^[0-9a-fA-F]{64}$/.test(encryptionKey) ||
    KNOWN_WEAK_SECRETS.has(encryptionKey)
  ) {
    console.error('❌ ENCRYPTION_KEY 환경 변수가 유효하지 않거나 공개된 기본값입니다. 64자리 hex 문자열이 필요합니다.');
    console.error('   생성: openssl rand -hex 32');
    await app.close();
    process.exit(1);
  }

  const backupEncryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
  if (
    !backupEncryptionKey ||
    !/^[0-9a-fA-F]{64}$/.test(backupEncryptionKey) ||
    KNOWN_WEAK_SECRETS.has(backupEncryptionKey) ||
    backupEncryptionKey.toLowerCase() === encryptionKey.toLowerCase()
  ) {
    console.error('❌ BACKUP_ENCRYPTION_KEY 환경 변수가 유효하지 않거나 ENCRYPTION_KEY와 동일합니다. 별도의 64자리 hex 문자열이 필요합니다.');
    console.error('   생성: openssl rand -hex 32');
    await app.close();
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || KNOWN_WEAK_SECRETS.has(jwtSecret)) {
    console.error('❌ JWT_SECRET 환경 변수가 유효하지 않거나 공개된 기본값입니다. 32자 이상의 문자열이 필요합니다.');
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
    exposedHeaders: ['Content-Disposition', 'X-Session-Expires-At', 'X-Session-Warning-Enabled'],
  }));

  // 커스텀 로거 설정
  const customLogger = new CustomLoggerService();
  app.useLogger(customLogger);

  // 전역 예외 필터 적용
  app.useGlobalFilters(new AllExceptionsFilter(customLogger));
  app.useGlobalInterceptors(new SessionActivityInterceptor());

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

  // Swagger documentation (프로덕션에서는 노출하지 않음)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Customer Storage API')
      .setDescription('고객사 정보 및 유지보수 점검 이력 관리 API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.BACKEND_PORT || process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
