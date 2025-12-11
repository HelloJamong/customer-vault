import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { InspectionTargetsModule } from './inspection-targets/inspection-targets.module';
import { DocumentsModule } from './documents/documents.module';
import { LogsModule } from './logs/logs.module';
import { SettingsModule } from './settings/settings.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    InspectionTargetsModule,
    DocumentsModule,
    LogsModule,
    SettingsModule,
    DashboardModule,
  ],
})
export class AppModule {}
