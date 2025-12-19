import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'development' ? ['log', 'error', 'warn', 'debug'] : ['error', 'warn'],
    bodyParser: false,
  });

  // JSON body parser with relaxed settings for special characters
  app.use(express.json({ limit: '10mb', strict: false }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 커스텀 로거 설정
  const customLogger = new CustomLoggerService();
  app.useLogger(customLogger);

  // 전역 예외 필터 적용
  app.useGlobalFilters(new AllExceptionsFilter(customLogger));

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
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
