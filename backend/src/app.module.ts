import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { InspectionTargetsModule } from './inspection-targets/inspection-targets.module';
import { DocumentsModule } from './documents/documents.module';
import { LogsModule } from './logs/logs.module';
import { SettingsModule } from './settings/settings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SupportLogsModule } from './support-logs/support-logs.module';
import { InspectionStatusModule } from './inspection-status/inspection-status.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    InspectionTargetsModule,
    DocumentsModule,
    LogsModule,
    SettingsModule,
    DashboardModule,
    SupportLogsModule,
    InspectionStatusModule,
  ],
})
export class AppModule {}
